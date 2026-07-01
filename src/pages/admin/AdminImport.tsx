import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { useSiteConfig } from "@/providers/SiteProvider";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Upload, FileCode2, CheckCircle2, AlertCircle, History, Trash2, Image as ImageIcon, Sparkles, RotateCw, Package, Download, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";
import {
  collectUsedImagesFromImportedPosts,
  queueImageImportJob,
  resumeImageImportJob,
  rewritePostImageUrls,
} from "@/lib/imageImport";
import { importElementorZip, type ElementorImportResult } from "@/lib/elementorImport";
import { importZipSite, importSingleMd, type ZipImportResult } from "@/lib/zipSiteImport";
import { parseMediaWxr, processZipMedia, repairBrokenImages, uploadMediaFile, importMissingImagesViaWayback } from "@/lib/mediaRepair";
import { Wrench, ImageOff, CloudDownload } from "lucide-react";

type ImportHistoryRow = {
  id: string;
  site_id: string;
  source: string;
  file_name: string | null;
  file_size_bytes: number | null;
  parsed_count: number;
  inserted_count: number;
  failed_count: number;
  status: string;
  error_sample: string | null;
  created_at: string;
};

type ImageJobRow = {
  id: string;
  status: string;
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  current_url: string | null;
  log: string | null;
  replacements?: number;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
};

// ---------- WP XML parser (browser DOMParser, handles large files) -----------

type WPItem = {
  title: string;
  slug: string;
  link: string;
  pubDate: string;
  postType: string; // post | page | attachment | nav_menu_item etc.
  status: string; // publish | draft | private | inherit
  content: string; // raw HTML
  excerpt: string;
  author: string;
  categories: { slug: string; name: string }[];
  tags: { slug: string; name: string }[];
  featuredImageUrl: string;
  meta: Record<string, string>;
};

const text = (el: Element | null | undefined, tag: string): string => {
  if (!el) return "";
  // Use namespaced lookup via getElementsByTagNameNS-like fallback
  const local = tag.includes(":") ? tag.split(":")[1] : tag;
  const direct = el.getElementsByTagName(tag)[0];
  if (direct) return direct.textContent || "";
  // namespaced fallback
  const all = el.getElementsByTagName("*");
  for (let i = 0; i < all.length; i++) {
    const n = all[i];
    if (n.localName === local && n.parentElement === el) return n.textContent || "";
  }
  return "";
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// Auto-detect the design template to apply based on slug/title so freshly
// imported pages already render with a sensible layout (home, about, team,
// book-a-call, contact). Anything else falls back to "default".
function detectTemplate(postType: string, slug: string, title: string): string {
  const s = (slug || "").toLowerCase();
  const t = (title || "").toLowerCase();
  const both = `${s} ${t}`;
  if (postType === "post") return "blog";
  if (s === "" || s === "/" || s === "home" || s === "homepage" || /\bhome\s*page\b/.test(t))
    return "home";
  if (/(^|[-\s])about(-us)?($|[-\s])/.test(both)) return "about";
  if (/team|meet[-\s]our[-\s]team|our[-\s]team/.test(both)) return "team";
  if (/book[-\s]a?[-\s]?call|schedule[-\s]a?[-\s]?call|book[-\s]now/.test(both))
    return "book-a-call";
  if (/contact/.test(both)) return "contact";
  if (/service/.test(both)) return "services";
  if (/pricing|plans/.test(both)) return "pricing";
  return "default";
}

// Strip illegal XML 1.0 control chars and try to repair common WXR issues
// (unterminated CData, stray ]]> inside CData, BOM, NULs).
function sanitizeWxr(xml: string): string {
  let out = xml;
  // Strip BOM
  if (out.charCodeAt(0) === 0xfeff) out = out.slice(1);
  // Remove illegal XML chars (keep \t \n \r)
  out = out.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
  // Repair nested ]]> inside CData by escaping inner occurrences.
  // Walk each <![CDATA[ ... ]]> and ensure we keep only the first closing.
  out = out.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (_m, inner: string) => {
    // re-escape any ]]> the parser would have swallowed mid-stream
    const safe = inner.replace(/\]\]>/g, "]]]]><![CDATA[>");
    return `<![CDATA[${safe}]]>`;
  });
  // Close any dangling <![CDATA[ that never got a ]]>
  // Find lone openers (no matching close before next opener / EOF) and patch.
  const openIdx: number[] = [];
  const re = /<!\[CDATA\[|\]\]>/g;
  let m: RegExpExecArray | null;
  const stack: number[] = [];
  while ((m = re.exec(out)) !== null) {
    if (m[0] === "<![CDATA[") stack.push(m.index);
    else stack.pop();
  }
  if (stack.length) {
    // append closers at EOF for each dangling opener
    out = out + "]]>".repeat(stack.length);
  }
  return out;
}

// Fallback tolerant parser: extract <item>…</item> blocks via regex and
// pull fields from CData. Works even when the XML as a whole is malformed.
function parseWxrTolerant(xml: string): WPItem[] {
  const items: WPItem[] = [];
  const attachments: Record<string, string> = {};

  const itemRe = /<item\b[\s\S]*?<\/item>/g;
  const blocks = xml.match(itemRe) || [];

  const grab = (block: string, tag: string): string => {
    const re = new RegExp(
      `<${tag}[^>]*>\\s*(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))\\s*</${tag}>`,
      "i",
    );
    const mm = block.match(re);
    return (mm?.[1] ?? mm?.[2] ?? "").trim();
  };

  // First pass: collect attachments
  blocks.forEach((b) => {
    if (grab(b, "wp:post_type") === "attachment") {
      const id = grab(b, "wp:post_id");
      const url = grab(b, "wp:attachment_url");
      if (id && url) attachments[id] = url;
    }
  });

  blocks.forEach((b) => {
    const postType = grab(b, "wp:post_type");
    if (!["post", "page"].includes(postType)) return;

    // postmeta
    const meta: Record<string, string> = {};
    let featured = "";
    const metaRe = /<wp:postmeta\b[\s\S]*?<\/wp:postmeta>/g;
    const metas = b.match(metaRe) || [];
    metas.forEach((mb) => {
      const k = grab(mb, "wp:meta_key");
      const v = grab(mb, "wp:meta_value");
      if (k) meta[k] = v;
      if (k === "_thumbnail_id" && attachments[v]) featured = attachments[v];
    });

    // categories / tags
    const cats: { slug: string; name: string }[] = [];
    const tags: { slug: string; name: string }[] = [];
    const catRe = /<category\b([^>]*)>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/category>/g;
    let cm: RegExpExecArray | null;
    while ((cm = catRe.exec(b)) !== null) {
      const attrs = cm[1] || "";
      const name = (cm[2] ?? cm[3] ?? "").trim();
      const domain = /domain="([^"]*)"/.exec(attrs)?.[1] || "";
      const slug = /nicename="([^"]*)"/.exec(attrs)?.[1] || slugify(name);
      if (!name) continue;
      if (domain === "category") cats.push({ slug, name });
      else if (domain === "post_tag") tags.push({ slug, name });
    }

    const title = grab(b, "title");
    const content = grab(b, "content:encoded");
    let featuredImg = featured;
    if (!featuredImg) {
      const im = content.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (im) featuredImg = im[1];
    }

    items.push({
      title,
      slug: grab(b, "wp:post_name") || slugify(title),
      link: grab(b, "link"),
      pubDate: grab(b, "pubDate"),
      postType,
      status: grab(b, "wp:status"),
      content,
      excerpt: grab(b, "excerpt:encoded"),
      author: grab(b, "dc:creator"),
      categories: cats,
      tags,
      featuredImageUrl: featuredImg,
      meta,
    });
  });

  return items;
}

function parseWPXML(xml: string): WPItem[] {
  const cleaned = sanitizeWxr(xml);
  const doc = new DOMParser().parseFromString(cleaned, "application/xml");
  const errNode = doc.querySelector("parsererror");

  // If DOMParser still fails, fall back to tolerant regex parser
  if (errNode) {
    const tolerant = parseWxrTolerant(cleaned);
    if (tolerant.length > 0) return tolerant;
    throw new Error(
      "Invalid XML and tolerant parse found 0 items: " +
        (errNode.textContent?.slice(0, 200) || ""),
    );
  }

  const items: WPItem[] = [];
  // Build attachment lookup (id -> url) for featured image resolution
  const attachments: Record<string, string> = {};
  const itemNodes = Array.from(doc.getElementsByTagName("item"));

  itemNodes.forEach((node) => {
    const postType = text(node, "wp:post_type");
    if (postType === "attachment") {
      const id = text(node, "wp:post_id");
      const url = text(node, "wp:attachment_url");
      if (id && url) attachments[id] = url;
    }
  });

  itemNodes.forEach((node) => {
    const postType = text(node, "wp:post_type");
    if (!["post", "page"].includes(postType)) return;

    const status = text(node, "wp:status");
    const meta: Record<string, string> = {};
    let featured = "";
    Array.from(node.getElementsByTagName("wp:postmeta")).forEach((m) => {
      const k = text(m, "wp:meta_key");
      const v = text(m, "wp:meta_value");
      if (k) meta[k] = v;
      if (k === "_thumbnail_id" && attachments[v]) featured = attachments[v];
    });

    const cats: { slug: string; name: string }[] = [];
    const tags: { slug: string; name: string }[] = [];
    Array.from(node.getElementsByTagName("category")).forEach((c) => {
      const domain = c.getAttribute("domain") || "";
      const slug = c.getAttribute("nicename") || slugify(c.textContent || "");
      const name = c.textContent || "";
      if (!name) return;
      if (domain === "category") cats.push({ slug, name });
      else if (domain === "post_tag") tags.push({ slug, name });
    });

    const title = text(node, "title").trim();
    const link = text(node, "link");
    let slug = text(node, "wp:post_name");
    if (!slug) slug = slugify(title);

    // Try first <img> in content as fallback featured image
    const content = text(node, "content:encoded");
    if (!featured) {
      const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgMatch) featured = imgMatch[1];
    }

    items.push({
      title,
      slug,
      link,
      pubDate: text(node, "pubDate"),
      postType,
      status,
      content,
      excerpt: text(node, "excerpt:encoded"),
      author: text(node, "dc:creator"),
      categories: cats,
      tags,
      featuredImageUrl: featured,
      meta,
    });
  });

  return items;
}

// ---------- Component -------------------------------------------------------

const AdminImport = () => {
  const { config } = useSiteConfig();
  const [parsed, setParsed] = useState<WPItem[] | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState({ inserted: 0, updated: 0, skipped: 0, failed: 0 });
  const [filter, setFilter] = useState<"all" | "post" | "page" | "publish" | "draft">("all");
  const [fileMeta, setFileMeta] = useState<{ name: string; size: number } | null>(null);
  const [history, setHistory] = useState<ImportHistoryRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // ---- Image import state ----
  const [imageJob, setImageJob] = useState<ImageJobRow | null>(null);
  const [scanning, setScanning] = useState(false);
  const [rewriting, setRewriting] = useState(false);

  // ---- External Image Scanner ----
  const [detectedExternalImages, setDetectedExternalImages] = useState<any[]>([]);
  const [scanningExternal, setScanningExternal] = useState(false);
  const [showDomainBreakdown, setShowDomainBreakdown] = useState(false);

  // ---- Media Repair States ----
  const [wxrAttachments, setWxrAttachments] = useState<any[]>([]);
  const [parsedAttachmentsCount, setParsedAttachmentsCount] = useState<number | null>(null);
  const [repairProgress, setRepairProgress] = useState<string>("");
  const [repairing, setRepairing] = useState<boolean>(false);
  const [uploadingMedia, setUploadingMedia] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [uploadedCount, setUploadedCount] = useState<number>(0);
  const [totalToUpload, setTotalToUpload] = useState<number>(0);
  const [repairResult, setRepairResult] = useState<{ postsUpdated: number; urlsReplaced: number } | null>(null);

  const handleMediaXmlFileChange = async (file: File) => {
    try {
      const text = await file.text();
      const attachments = parseMediaWxr(text);
      setWxrAttachments(attachments);
      setParsedAttachmentsCount(attachments.length);
      toast.success(`Successfully parsed ${attachments.length} attachments from Media XML!`);
    } catch (e) {
      console.error(e);
      toast.error(`Failed to parse Media XML: ${(e as Error).message}`);
    }
  };

  const handleMediaUploadAndRepair = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingMedia(true);
    setUploadProgress("Preparing uploads...");
    setUploadedCount(0);
    setTotalToUpload(files.length);
    setRepairResult(null);

    try {
      const siteId = config?.site_id || "default";
      
      if (files.length === 1 && files[0].name.toLowerCase().endsWith(".zip")) {
        setUploadProgress("Extracting and uploading ZIP archive...");
        const res = await processZipMedia(files[0], siteId, (msg) => setUploadProgress(msg));
        toast.success(`Successfully processed ZIP! (${res.uploaded.length} uploaded, ${res.skippedCount} skipped)`);
        if (res.errors.length > 0) {
          toast.warn(`Failed to upload ${res.errors.length} files from ZIP.`);
        }
      } else {
        // Fetch existing filenames to avoid duplicate uploads
        const { data: existingMedia } = await supabase
          .from("media_library")
          .select("file_name")
          .eq("site_id", siteId);
        const existingNames = new Set((existingMedia || []).map(m => m.file_name?.toLowerCase()));

        setTotalToUpload(files.length);
        let uploaded = 0;
        let skipped = 0;

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");

          if (existingNames.has(cleanFileName.toLowerCase())) {
            skipped++;
            setUploadedCount(i + 1);
            continue;
          }

          setUploadProgress(`Uploading [${i + 1}/${files.length}]: ${file.name}...`);
          
          // Match with WXR XML metadata if available
          const match = wxrAttachments.find(
            (a) => a.filename.toLowerCase() === file.name.toLowerCase()
          );
          
          await uploadMediaFile(file, file.name, siteId, {
            originalUrl: match?.originalUrl,
            title: match?.title,
            altText: match?.altText
          });
          uploaded++;
          setUploadedCount(i + 1);
          existingNames.add(cleanFileName.toLowerCase());
        }
        toast.success(`Successfully processed ${files.length} media files! (${uploaded} uploaded, ${skipped} skipped)`);
      }

      // Automatically trigger repair matching after upload
      setRepairing(true);
      setRepairProgress("Matching uploaded images and repairing URLs...");
      const repairRes = await repairBrokenImages(siteId, (msg) => setRepairProgress(msg));
      setRepairResult(repairRes);
      toast.success(`Repair complete! Updated ${repairRes.postsUpdated} posts and replaced ${repairRes.urlsReplaced} image URLs.`);
    } catch (err) {
      console.error(err);
      toast.error(`Error: ${(err as Error).message}`);
    } finally {
      setUploadingMedia(false);
      setRepairing(false);
      setUploadProgress("");
      setRepairProgress("");
    }
  };

  const handleRunRepairOnly = async () => {
    setRepairing(true);
    setRepairProgress("Scanning database and matching images...");
    setRepairResult(null);
    try {
      const siteId = config?.site_id || "default";
      const res = await repairBrokenImages(siteId, (msg) => setRepairProgress(msg));
      setRepairResult(res);
      toast.success(`Repair complete! Updated ${res.postsUpdated} posts and replaced ${res.urlsReplaced} image URLs.`);
    } catch (err) {
      console.error(err);
      toast.error(`Error during repair: ${(err as Error).message}`);
    } finally {
      setRepairing(false);
      setRepairProgress("");
    }
  };

  // ---- Wayback Import State & Handler ----
  const [waybackImporting, setWaybackImporting] = useState<boolean>(false);
  const [waybackProgress, setWaybackProgress] = useState<string>("");
  const [waybackResult, setWaybackResult] = useState<{ processed: number; succeeded: number; failed: number } | null>(null);

  const handleWaybackImport = async () => {
    setWaybackImporting(true);
    setWaybackProgress("Scanning database for broken image URLs...");
    setWaybackResult(null);
    try {
      const siteId = config?.site_id || "default";
      const res = await importMissingImagesViaWayback(siteId, (msg) => setWaybackProgress(msg));
      setWaybackResult(res);
      toast.success(`Wayback import complete! Successfully recovered and repaired ${res.succeeded} images.`);
    } catch (err) {
      console.error(err);
      toast.error(`Error during Wayback recovery: ${(err as Error).message}`);
    } finally {
      setWaybackImporting(false);
      setWaybackProgress("");
    }
  };

  const scanForExternalImages = async (silent = false) => {
    if (!silent) setScanningExternal(true);
    try {
      const allImages = await collectUsedImagesFromImportedPosts({ includeSiteImages: true });
      const externalOnly = allImages.filter(img => {
        if (!img.url) return false;
        if (!/^https?:\/\//i.test(img.url)) return false;
        if (img.url.includes("supabase.co") || img.url.includes("supabase.in")) return false;
        if (img.url.startsWith("data:") || img.url.startsWith("blob:")) return false;
        return true;
      });
      setDetectedExternalImages(externalOnly);
      if (!silent) {
        toast.success(`Scan complete! Found ${externalOnly.length} external images.`);
      }
    } catch (err) {
      console.error("Scan failed:", err);
      if (!silent) {
        toast.error("Failed to scan for external images.");
      }
    } finally {
      if (!silent) setScanningExternal(false);
    }
  };

  // ---- Full Website Exporter ----
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState("");

  const handleExport = async () => {
    setExporting(true);
    setExportProgress("Preparing export...");
    try {
      const siteId = config?.site?.id;
      if (!siteId) throw new Error("Site ID not found");

      const zip = new JSZip();

      // 1. Fetch Site Settings
      setExportProgress("Fetching site settings...");
      const { data: settings } = await supabase.from("site_settings").select("*").eq("site_id", siteId).maybeSingle();
      zip.file("site_settings.json", JSON.stringify(settings || {}, null, 2));

      // 2. Fetch Posts & Pages
      setExportProgress("Fetching posts and pages...");
      const { data: posts } = await supabase.from("posts").select("*").eq("site_id", siteId);
      zip.file("posts.json", JSON.stringify(posts || [], null, 2));

      // 3. Fetch Imported Posts (WXR metadata)
      setExportProgress("Fetching WXR imported posts...");
      const { data: importedPosts } = await supabase.from("imported_posts").select("*").eq("site_id", siteId);
      zip.file("imported_posts.json", JSON.stringify(importedPosts || [], null, 2));

      // 4. Fetch Redirects
      setExportProgress("Fetching redirects...");
      const { data: redirects } = await supabase.from("redirects").select("*").eq("site_id", siteId);
      zip.file("redirects.json", JSON.stringify(redirects || [], null, 2));

      // 5. Fetch Custom Post Types
      setExportProgress("Fetching custom post types...");
      const { data: cpts } = await supabase.from("custom_post_types").select("*").eq("site_id", siteId);
      zip.file("custom_post_types.json", JSON.stringify(cpts || [], null, 2));

      // 6. Fetch Taxonomies
      setExportProgress("Fetching taxonomies...");
      const { data: taxonomies } = await supabase.from("taxonomies").select("*").eq("site_id", siteId);
      zip.file("taxonomies.json", JSON.stringify(taxonomies || [], null, 2));

      // 7. Fetch Forms
      setExportProgress("Fetching forms...");
      const { data: forms } = await supabase.from("forms").select("*").eq("site_id", siteId);
      zip.file("forms.json", JSON.stringify(forms || [], null, 2));

      // 8. Fetch Media Metadata
      setExportProgress("Fetching media library metadata...");
      const { data: mediaMeta } = await supabase.from("media_meta").select("*").eq("site_id", siteId);
      zip.file("media_meta.json", JSON.stringify(mediaMeta || [], null, 2));

      // 9. Fetch and download all media files!
      if (mediaMeta && mediaMeta.length > 0) {
        const mediaFolder = zip.folder("media");
        for (let i = 0; i < mediaMeta.length; i++) {
          const item = mediaMeta[i];
          if (!item.url) continue;
          setExportProgress(`Downloading media ${i + 1} of ${mediaMeta.length}: ${item.file_name || "file"}`);
          try {
            const res = await fetch(item.url);
            if (res.ok) {
              const blob = await res.blob();
              mediaFolder?.file(item.file_name || `file-${i}`, blob);
            }
          } catch (err) {
            console.warn(`Failed to download media file: ${item.url}`, err);
          }
        }
      }

      // Generate ZIP
      setExportProgress("Generating ZIP package...");
      const content = await zip.generateAsync({ type: "blob" });
      
      // Trigger download
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${config?.site?.slug || "website"}-full-export-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Website exported successfully!");
    } catch (err) {
      console.error("Export failed:", err);
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
      setExportProgress("");
    }
  };

  // ---- Elementor ZIP import state ----
  const [elementorImporting, setElementorImporting] = useState(false);
  const [elementorResult, setElementorResult] = useState<ElementorImportResult | null>(null);
  const [elementorStatus, setElementorStatus] = useState<string>("");

  // ---- ZIP MD import state ----
  const [zipMdFile, setZipMdFile] = useState<File | null>(null);
  const [zipMdImporting, setZipMdImporting] = useState(false);
  const [zipMdProgress, setZipMdProgress] = useState("");
  const [zipMdResult, setZipMdResult] = useState<ZipImportResult | null>(null);
  const [singleMdFile, setSingleMdFile] = useState<File | null>(null);
  const [singleMdImporting, setSingleMdImporting] = useState(false);
  const [singleMdProgress, setSingleMdProgress] = useState("");
  const [singleMdResult, setSingleMdResult] = useState<ZipImportResult | null>(null);
  const [showBrandingModal, setShowBrandingModal] = useState(false);
  const [brandingOptions, setBrandingOptions] = useState({
    primary: "#111111",
    accent: "#ffcc00",
    font: "Inter",
  });

  const onElementorZip = async (file: File) => {
    setElementorImporting(true);
    setElementorResult(null);
    setElementorStatus("Reading ZIP…");
    try {
      const res = await importElementorZip(file, (m) => setElementorStatus(m));
      setElementorResult(res);
      const total = res.pages + res.posts + res.templates + res.sectionsLibrary;
      const site_id = config?.site?.id;
      if (site_id) {
        await supabase.from("import_history").insert({
          site_id,
          source: "elementor-zip",
          file_name: file.name,
          file_size_bytes: file.size,
          parsed_count: total + res.failed,
          inserted_count: total,
          failed_count: res.failed,
          status: res.failed === 0 ? "completed" : total > 0 ? "partial" : "failed",
          error_sample: res.errors[0] ?? null,
        });
        loadHistory();
      }
      if (res.failed === 0) toast.success(`Elementor import complete: ${res.pages} pages, ${res.posts} posts, ${res.templates + res.sectionsLibrary} templates.`);
      else toast.warning(`Imported ${total}, ${res.failed} failed. First error: ${res.errors[0] || ""}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Elementor import failed");
    } finally {
      setElementorImporting(false);
      setElementorStatus("");
    }
  };

  const onZipMdFileChange = (file: File) => {
    setZipMdFile(file);
    setSingleMdFile(null); // Clear other
    setShowBrandingModal(true);
  };

  const onSingleMdFileChange = (file: File) => {
    setSingleMdFile(file);
    setZipMdFile(null); // Clear other
    setShowBrandingModal(true);
  };

  const triggerSingleMdImport = async () => {
    if (!singleMdFile) return;
    setSingleMdImporting(true);
    setSingleMdResult(null);
    setSingleMdProgress("Initializing import…");
    try {
      const siteId = config?.site?.id;
      const res = await importSingleMd(
        singleMdFile,
        brandingOptions,
        (msg) => setSingleMdProgress(msg),
        siteId
      );
      setSingleMdResult(res);
      const total = res.pages + res.posts;
      if (siteId) {
        await supabase.from("import_history").insert({
          site_id: siteId,
          source: "single-md-import",
          file_name: singleMdFile.name,
          file_size_bytes: singleMdFile.size,
          parsed_count: total + res.failed,
          inserted_count: total,
          failed_count: res.failed,
          status: res.failed === 0 ? "completed" : total > 0 ? "partial" : "failed",
          error_sample: res.errors[0] ?? null,
        });
        loadHistory();
      }
      if (res.failed === 0) {
        toast.success(`Markdown import complete: ${res.pages} pages, ${res.posts} posts.`);
      } else {
        toast.warning(`Imported ${total}, ${res.failed} failed. First error: ${res.errors[0] || ""}`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setSingleMdImporting(false);
      setSingleMdFile(null);
    }
  };

  const triggerZipMdImport = async () => {
    if (!zipMdFile) return;
    setZipMdImporting(true);
    setZipMdResult(null);
    setZipMdProgress("Initializing import…");
    try {
      const siteId = config?.site?.id;
      const res = await importZipSite(
        zipMdFile,
        brandingOptions,
        (msg) => setZipMdProgress(msg),
        siteId
      );
      setZipMdResult(res);
      const total = res.pages + res.posts;
      if (siteId) {
        await supabase.from("import_history").insert({
          site_id: siteId,
          source: "zip-md-export",
          file_name: zipMdFile.name,
          file_size_bytes: zipMdFile.size,
          parsed_count: total + res.failed,
          inserted_count: total,
          failed_count: res.failed,
          status: res.failed === 0 ? "completed" : total > 0 ? "partial" : "failed",
          error_sample: res.errors[0] ?? null,
        });
        loadHistory();
      }
      if (res.failed === 0) {
        toast.success(`ZIP Site import complete: ${res.pages} pages, ${res.posts} posts, ${res.images} images.`);
      } else {
        toast.warning(`Imported ${total}, ${res.failed} failed. First error: ${res.errors[0] || ""}`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ZIP import failed");
    } finally {
      setZipMdImporting(false);
      setZipMdProgress("");
    }
  };


  const loadHistory = async () => {
    setLoadingHistory(true);
    // History is shared across all users / dashboards (WordPress-style)
    const { data, error } = await supabase
      .from("import_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) console.error(error);
    setHistory((data as ImportHistoryRow[]) || []);
    setLoadingHistory(false);
  };

  // Load most recent image-import job and subscribe to realtime updates
  const loadLatestImageJob = async () => {
    const { data } = await supabase
      .from("image_import_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setImageJob((data as ImageJobRow) ?? null);
  };

  useEffect(() => {
    loadHistory();
    loadLatestImageJob();
    scanForExternalImages(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime: keep imageJob fresh as the worker updates it
  useEffect(() => {
    if (!imageJob?.id) return;
    const channel = supabase
      .channel(`image-job-${imageJob.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "image_import_jobs",
          filter: `id=eq.${imageJob.id}`,
        },
        (payload) => {
          setImageJob((prev) => ({ ...(prev as ImageJobRow), ...(payload.new as ImageJobRow) }));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [imageJob?.id]);

  const startImageImport = async () => {
    const { data: sess } = await supabase.auth.getSession();
    if (!sess?.session?.user?.id) {
      toast.error("Please sign in again to start an image import.");
      return;
    }
    setScanning(true);
    try {
      toast.info("Scanning posts for images…");
      const refs = await collectUsedImagesFromImportedPosts({ includeSiteImages: true });
      if (refs.length === 0) {
        toast.warning(
          "No images found in imported posts. Run the WP XML import first, then try again.",
        );
        return;
      }
      toast.info(`Found ${refs.length} unique images. Queuing…`);
      const { jobId, queued, alreadyDone, resumed } = await queueImageImportJob(refs);
      toast.success(
        resumed
          ? "Resumed the existing background image import."
          : `Queued ${queued} new images${alreadyDone ? ` (${alreadyDone} already optimized)` : ""}. Working in the background…`,
      );
      // Load the new job and subscribe
      const { data } = await supabase
        .from("image_import_jobs")
        .select("*")
        .eq("id", jobId)
        .maybeSingle();
      setImageJob((data as ImageJobRow) ?? null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Image import failed");
    } finally {
      setScanning(false);
    }
  };

  const applyOptimizedToPosts = async () => {
    setRewriting(true);
    try {
      const { postsUpdated, rewrites } = await rewritePostImageUrls(imageJob?.id);
      toast.success(
        `Rewrote ${rewrites} image URL${rewrites === 1 ? "" : "s"} across ${postsUpdated} post${postsUpdated === 1 ? "" : "s"}.`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Rewrite failed");
    } finally {
      setRewriting(false);
    }
  };

  const resumeLatestImageImport = async () => {
    if (!imageJob?.id) return;
    try {
      await resumeImageImportJob(imageJob.id);
      toast.success("Background image import resumed.");
      loadLatestImageJob();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Resume failed");
    }
  };

  const cancelImageImport = async () => {
    if (!imageJob?.id) return;
    await supabase
      .from("image_import_jobs")
      .update({ status: "cancelled", finished_at: new Date().toISOString() })
      .eq("id", imageJob.id);
    // Mark remaining pending assets as skipped so worker stops picking them up
    await supabase
      .from("image_assets")
      .update({ status: "skipped", error: "cancelled" })
      .eq("job_id", imageJob.id)
      .eq("status", "pending");
    loadLatestImageJob();
    toast.info("Image import cancelled.");
  };

  const deleteHistory = async (id: string) => {
    const { error } = await supabase.from("import_history").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("History entry removed");
      loadHistory();
    }
  };

  const onFile = async (file: File) => {
    setParsing(true);
    setParsed(null);
    setDone({ inserted: 0, updated: 0, skipped: 0, failed: 0 });
    setFileMeta({ name: file.name, size: file.size });
    try {
      // Read file in a non-blocking way; toast size for visibility
      const sizeMb = (file.size / 1024 / 1024).toFixed(1);
      toast.info(`Reading ${file.name} (${sizeMb} MB)…`);
      const xml = await file.text();
      // Yield to UI before heavy parse
      await new Promise((r) => setTimeout(r, 0));
      const items = parseWPXML(xml);
      setParsed(items);
      toast.success(`Parsed ${items.length} items`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Parse failed");
    } finally {
      setParsing(false);
    }
  };

  const visibleItems = (parsed || []).filter((i) => {
    if (filter === "all") return true;
    if (filter === "post" || filter === "page") return i.postType === filter;
    return i.status === filter;
  });

  const runImport = async (publishOnly = false) => {
    if (!parsed || !config?.site?.id) return;
    const site_id = config.site.id;

    // Must be signed in to Lovable Cloud for RLS to allow inserts
    const { data: sess } = await supabase.auth.getSession();
    if (!sess?.session?.user?.id) {
      toast.error(
        "Cloud session missing. Please sign in again at /admin/login (this links your account to Lovable Cloud).",
      );
      return;
    }
    const userId = sess.session.user.id;

    const toImport = parsed.filter((i) => (publishOnly ? i.status === "publish" : true));
    setImporting(true);
    setProgress(0);
    const stats = { inserted: 0, updated: 0, skipped: 0, failed: 0 };
    const errorSamples: string[] = [];
    // Smaller batches + yield between batches keep the server & UI responsive
    const BATCH = 25;

    for (let i = 0; i < toImport.length; i += BATCH) {
      const chunk = toImport.slice(i, i + BATCH);
      const rows = chunk.map((it, idx) => {
        let slug = (it.slug || slugify(it.title) || `wp-${Date.now()}-${i}-${idx}`).slice(0, 200);
        let status =
          it.status === "publish"
            ? "published"
            : it.status === "draft"
              ? "draft"
              : it.status === "future"
                ? "scheduled"
                : "draft";

        if (it.postType === "page" && (slug === "" || slug === "home")) {
          slug = "home-draft";
          status = "draft";
        }

        return {
          site_id,
          title: it.title || "(untitled)",
          slug,
          excerpt: it.excerpt || "",
          body: it.content || "",
          status,
          publish_date: it.pubDate ? new Date(it.pubDate).toISOString() : null,
          featured_image_url: it.featuredImageUrl || null,
          type: it.postType, // 'post' or 'page'
          meta_title:
            it.meta?.["_yoast_wpseo_title"] ||
            it.meta?.["rank_math_title"] ||
            it.meta?.["_aioseo_title"] ||
            it.meta?.["_aioseop_title"] ||
            it.meta?.["_seopress_titles_title"] ||
            it.title,
          meta_description:
            it.meta?.["_yoast_wpseo_metadesc"] ||
            it.meta?.["rank_math_description"] ||
            it.meta?.["_aioseo_description"] ||
            it.meta?.["_aioseop_description"] ||
            it.meta?.["_seopress_titles_desc"] ||
            it.excerpt ||
            "",
          canonical_url:
            it.meta?.["_yoast_wpseo_canonical"] ||
            it.meta?.["rank_math_canonical_url"] ||
            it.meta?.["_aioseo_canonical_url"] ||
            it.meta?.["_seopress_robots_canonical"] ||
            it.link,
          source: "wp-xml",
          imported_by: userId,
          raw: {
            link: it.link,
            author: it.author,
            categories: it.categories,
            tags: it.tags,
            meta: it.meta,
          } as unknown as never,
        };
      });

      // upsert into Lovable Cloud `imported_posts` by (site_id, slug)
      let inserted = 0;
      let lastErr: string | null = null;
      const { data: upserted, error } = await supabase
        .from("imported_posts")
        .upsert(rows, { onConflict: "site_id,slug", ignoreDuplicates: false })
        .select("id");

      if (error) {
        lastErr = error.message;
        // Fallback: insert one-by-one so a single bad row doesn't kill the batch
        for (const row of rows) {
          const { data: ins, error: e2 } = await supabase
            .from("imported_posts")
            .upsert(row, { onConflict: "site_id,slug" })
            .select("id")
            .maybeSingle();
          if (e2) {
            stats.failed += 1;
            lastErr = e2.message;
            if (errorSamples.length < 3) errorSamples.push(e2.message);
            console.error("Import row failed:", e2.message, row.slug);
          } else if (ins) {
            inserted += 1;
          }
        }
      } else {
        inserted = upserted?.length ?? rows.length;
      }
      stats.inserted += inserted;

      if (lastErr && inserted === 0 && errorSamples.length < 3) {
        errorSamples.push(lastErr);
      }

      // Mirror the same content into the LIVE `posts` table so the imported
      // entries show up immediately in Posts / Pages admin lists and on the
      // public site — no manual "promote" step. We auto-detect a per-page
      // template by slug/title.
      const liveRows = chunk.map((it, idx) => {
        let slug = (it.slug || slugify(it.title) || `wp-${Date.now()}-${i}-${idx}`).slice(0, 200);
        const type = it.postType === "page" ? "page" : "post";
        let status =
          it.status === "publish"
            ? "published"
            : it.status === "future"
              ? "scheduled"
              : "draft";

        if (type === "page" && (slug === "" || slug === "home")) {
          slug = "home-draft";
          status = "draft";
        }

        return {
          site_id,
          title: it.title || "(untitled)",
          slug,
          type,
          status,
          excerpt: it.excerpt || "",
          body: it.content || "",
          featured_image_url: it.featuredImageUrl || null,
          template: detectTemplate(type, slug, it.title),
          render_mode: /\[et_pb_|elementor|<!-- wp:/.test(it.content || "") ? "blocks" : "html",
          meta_title:
            it.meta?.["_yoast_wpseo_title"] ||
            it.meta?.["rank_math_title"] ||
            it.meta?.["_aioseo_title"] ||
            it.title,
          meta_description:
            it.meta?.["_yoast_wpseo_metadesc"] ||
            it.meta?.["rank_math_description"] ||
            it.meta?.["_aioseo_description"] ||
            it.excerpt ||
            "",
          canonical_url:
            it.meta?.["_yoast_wpseo_canonical"] ||
            it.meta?.["rank_math_canonical_url"] ||
            it.link ||
            null,
          author: it.author || null,
          categories: it.categories as unknown as never,
          tags: it.tags as unknown as never,
          publish_date: it.pubDate ? new Date(it.pubDate).toISOString() : null,
          published_at:
            status === "published" && it.pubDate ? new Date(it.pubDate).toISOString() : null,
        };
      });
      const { error: liveErr } = await supabase
        .from("posts")
        .upsert(liveRows, { onConflict: "site_id,type,slug", ignoreDuplicates: false });
      if (liveErr) {
        // Per-row fallback so one bad row doesn't drop the whole batch
        for (const row of liveRows) {
          const { error: e3 } = await supabase
            .from("posts")
            .upsert(row, { onConflict: "site_id,type,slug" });
          if (e3 && errorSamples.length < 3) errorSamples.push(`posts: ${e3.message}`);
        }
      }

      setProgress(Math.round(((i + chunk.length) / toImport.length) * 100));
      setDone({ ...stats });
      await new Promise((r) => setTimeout(r, 150));
    }

    setImporting(false);

    // Persist a row to import_history so the user can see past imports
    const historyStatus =
      stats.inserted > 0 && stats.failed === 0
        ? "completed"
        : stats.inserted > 0
          ? "partial"
          : "failed";
    const { error: histErr } = await supabase.from("import_history").insert({
      site_id,
      source: "wp-xml",
      file_name: fileMeta?.name ?? null,
      file_size_bytes: fileMeta?.size ?? null,
      parsed_count: toImport.length,
      inserted_count: stats.inserted,
      failed_count: stats.failed,
      status: historyStatus,
      error_sample: errorSamples[0] ?? null,
      imported_by: userId,
    });
    if (histErr) console.error("Failed to record import history:", histErr.message);
    loadHistory();

    if (stats.inserted > 0 && stats.failed === 0) {
      toast.success(`Import complete: ${stats.inserted} saved.`);
    } else if (stats.inserted > 0) {
      toast.warning(`Saved ${stats.inserted}, ${stats.failed} failed. ${errorSamples[0] || ""}`);
    } else {
      toast.error(
        `Nothing was saved. ${errorSamples[0] || "Check console for details."}`,
      );
    }

    // Auto-regenerate sitemap + llms.txt after the import lands
    if (stats.inserted > 0) {
      try {
        const { regenerateSeoFiles } = await import("@/lib/regenerateSeoFiles");
        await regenerateSeoFiles(window.location.origin, null, undefined, ["sitemap", "llms"]);
      } catch (e) { console.warn("SEO regen failed:", e); }
    }
  };

  const fmtBytes = (n: number | null) => {
    if (!n) return "—";
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl">Import content</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Bulk-import a WordPress eXtended RSS (WXR) export, or sync posts from the parent CMS.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/admin/sync">Parent sync →</Link>
          </Button>
        </div>
      </header>

      {/* Upload card */}
      <div className="bg-background border rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <FileCode2 className="w-5 h-5 text-primary" />
          <h2 className="font-display text-xl">WordPress XML (.xml)</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Export from WordPress: <em>Tools → Export → All content → Download Export File</em>. Files of any
          size are streamed in-browser.
        </p>
        <label className="block border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:bg-muted/40 transition">
          <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
          <span className="text-sm">
            {parsing ? "Parsing…" : "Click to choose a .xml WXR export"}
          </span>
          <input
            type="file"
            accept=".xml,application/xml,text/xml"
            className="hidden"
            disabled={parsing || importing}
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
        </label>
      </div>

      {/* Preview & import */}
      {parsed && (
        <div className="bg-background border rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <h2 className="font-display text-xl">{parsed.length} items parsed</h2>
            </div>
            <div className="flex gap-2 text-sm">
              {(["all", "post", "page", "publish", "draft"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-full border ${
                    filter === f ? "bg-primary text-primary-foreground border-primary" : "border-border"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>📝 {parsed.filter((i) => i.postType === "post").length} posts</span>
            <span>📄 {parsed.filter((i) => i.postType === "page").length} pages</span>
            <span>✅ {parsed.filter((i) => i.status === "publish").length} published</span>
            <span>📋 {parsed.filter((i) => i.status === "draft").length} drafts</span>
            <span>🖼 {parsed.filter((i) => i.featuredImageUrl).length} with featured image</span>
          </div>

          {importing && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground">
                Importing… {done.inserted} inserted · {done.failed} failed
              </p>
            </div>
          )}

          {!importing && (done.inserted > 0 || done.failed > 0) && (
            <div className="flex items-center gap-2 text-sm rounded-lg border bg-mint/40 border-primary/30 p-3">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              Imported {done.inserted}. {done.failed > 0 && (
                <span className="text-destructive inline-flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {done.failed} failed
                </span>
              )}
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <Button disabled={importing} onClick={() => runImport(true)}>
              Import published only ({parsed.filter((i) => i.status === "publish").length})
            </Button>
            <Button disabled={importing} variant="outline" onClick={() => runImport(false)}>
              Import everything ({parsed.length})
            </Button>
            <Button disabled={importing} variant="ghost" onClick={() => setParsed(null)}>
              Clear
            </Button>
          </div>

          {/* Preview table */}
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="p-2">Type</th>
                  <th className="p-2">Title</th>
                  <th className="p-2">Slug</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.slice(0, 50).map((i, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="p-2">
                      <Badge variant="outline">{i.postType}</Badge>
                    </td>
                    <td className="p-2 font-medium truncate max-w-xs">{i.title}</td>
                    <td className="p-2 text-muted-foreground truncate max-w-[180px]">{i.slug}</td>
                    <td className="p-2">{i.status}</td>
                    <td className="p-2 text-muted-foreground">
                      {i.pubDate ? new Date(i.pubDate).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visibleItems.length > 50 && (
              <p className="p-2 text-xs text-muted-foreground bg-muted/30">
                Showing first 50 of {visibleItems.length}.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Elementor ZIP import */}
      <div className="bg-background border rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Package className="w-5 h-5 text-primary" />
          <h2 className="font-display text-xl">Elementor / Elementor Pro (.zip)</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Import an Elementor "Site Kit" export (ZIP containing <code>manifest.json</code>, <code>templates/</code>,
          <code>content/</code>, <code>site-settings.json</code>). Pages render with the Elementor renderer; posts
          use the shared blog template. Existing slugs are <strong>updated in place</strong> — nothing is duplicated.
          Reusable templates and orphan sections go to the template library for reuse.
        </p>
        <label className="block border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:bg-muted/40 transition">
          <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
          <span className="text-sm">
            {elementorImporting
              ? elementorStatus || "Importing…"
              : "Click to choose an Elementor .zip export"}
          </span>
          <input
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            disabled={elementorImporting}
            onChange={(e) => e.target.files?.[0] && onElementorZip(e.target.files[0])}
          />
        </label>
        {elementorResult && (
          <div className="border rounded-xl p-4 bg-muted/20 text-sm space-y-2">
            <div className="flex flex-wrap gap-4">
              <span>📄 {elementorResult.pages} pages</span>
              <span>📝 {elementorResult.posts} posts</span>
              <span>🧩 {elementorResult.templates} templates</span>
              <span>📚 {elementorResult.sectionsLibrary} library items</span>
              <span>⚙️ {elementorResult.siteSettings ? "site settings saved" : "no site settings"}</span>
              {elementorResult.failed > 0 && (
                <span className="text-destructive">⚠️ {elementorResult.failed} failed</span>
              )}
            </div>
            {elementorResult.errors.length > 0 && (
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer">{elementorResult.errors.length} error(s)</summary>
                <ul className="mt-1 list-disc pl-4 space-y-0.5">
                  {elementorResult.errors.slice(0, 8).map((e, i) => (
                    <li key={i} className="font-mono">{e}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </div>

      {/* ZIP Website Export (ZIP/MD) Importer */}
      <div className="bg-background border rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="font-display text-xl">ZIP Website Export (ZIP/MD)</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Import a ZIP export containing structured Markdown pages/posts (under <code>page/</code> and <code>post/</code>). 
          The importer automatically extracts branding assets, rewrites local image paths to Supabase Storage, 
          generates highly-polished Elementor-style responsive layouts, and builds global Header/Footer navigation.
        </p>
        <label className="block border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:bg-muted/40 transition">
          <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
          <span className="text-sm">
            {zipMdImporting
              ? zipMdProgress || "Importing ZIP site…"
              : "Click to choose a website export .zip"}
          </span>
          <input
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            disabled={zipMdImporting}
            onChange={(e) => e.target.files?.[0] && onZipMdFileChange(e.target.files[0])}
          />
        </label>
        {zipMdResult && (
          <div className="border rounded-xl p-4 bg-muted/20 text-sm space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              Import Successful
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
              <div className="bg-background p-3 rounded-lg border text-center">
                <span className="block text-xs text-muted-foreground">Pages</span>
                <span className="text-lg font-bold">{zipMdResult.pages}</span>
              </div>
              <div className="bg-background p-3 rounded-lg border text-center">
                <span className="block text-xs text-muted-foreground">Posts</span>
                <span className="text-lg font-bold">{zipMdResult.posts}</span>
              </div>
              <div className="bg-background p-3 rounded-lg border text-center">
                <span className="block text-xs text-muted-foreground">Images Uploaded</span>
                <span className="text-lg font-bold">{zipMdResult.images}</span>
              </div>
              <div className="bg-background p-3 rounded-lg border text-center">
                <span className="block text-xs text-muted-foreground">Failed Items</span>
                <span className="text-lg font-bold text-destructive">{zipMdResult.failed}</span>
              </div>
            </div>
            {zipMdResult.logo && (
              <div className="pt-2 flex items-center gap-3">
                <span className="text-xs font-semibold text-muted-foreground">Extracted Logo:</span>
                <img src={zipMdResult.logo} alt="Extracted Logo" className="h-8 object-contain rounded bg-muted p-1" />
              </div>
            )}
            {zipMdResult.errors.length > 0 && (
              <details className="text-xs text-muted-foreground pt-1">
                <summary className="cursor-pointer font-medium text-destructive">
                  {zipMdResult.errors.length} warning(s) / error(s) occurred
                </summary>
                <ul className="mt-1 list-disc pl-4 space-y-0.5 max-h-40 overflow-y-auto font-mono">
                  {zipMdResult.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </div>

      {/* Single Markdown File (.md) Importer */}
      <div className="bg-background border rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <FileCode2 className="w-5 h-5 text-primary" />
          <h2 className="font-display text-xl">Single Markdown File (.md)</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Import an individual Markdown file (.md). The system will automatically parse the page or blog post content, extract metadata schemas, and generate a highly-polished Elementor-style responsive visual layout.
        </p>
        <label className="block border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:bg-muted/40 transition">
          <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
          <span className="text-sm">
            {singleMdImporting
              ? singleMdProgress || "Importing Markdown…"
              : "Click to choose a Markdown .md file"}
          </span>
          <input
            type="file"
            accept=".md,text/markdown,text/x-markdown"
            className="hidden"
            disabled={singleMdImporting}
            onChange={(e) => e.target.files?.[0] && onSingleMdFileChange(e.target.files[0])}
          />
        </label>
        {singleMdResult && (
          <div className="border rounded-xl p-4 bg-muted/20 text-sm space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              Import Successful
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-1">
              <div className="bg-background p-3 rounded-lg border text-center">
                <span className="block text-xs text-muted-foreground">Pages</span>
                <span className="text-lg font-bold">{singleMdResult.pages}</span>
              </div>
              <div className="bg-background p-3 rounded-lg border text-center">
                <span className="block text-xs text-muted-foreground">Posts</span>
                <span className="text-lg font-bold">{singleMdResult.posts}</span>
              </div>
              <div className="bg-background p-3 rounded-lg border text-center">
                <span className="block text-xs text-muted-foreground font-semibold text-destructive">Failed</span>
                <span className="text-lg font-bold text-destructive">{singleMdResult.failed}</span>
              </div>
            </div>
            {singleMdResult.errors.length > 0 && (
              <details className="text-xs text-muted-foreground pt-1">
                <summary className="cursor-pointer font-medium text-destructive">
                  {singleMdResult.errors.length} error(s) occurred
                </summary>
                <ul className="mt-1 list-disc pl-4 space-y-0.5 max-h-40 overflow-y-auto font-mono">
                  {singleMdResult.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </div>

      {/* WordPress Media & Image Repair Card */}
      <div className="bg-background border rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Wrench className="w-5 h-5 text-primary" />
          <h2 className="font-display text-xl">WordPress Media & Image Repair</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Repair broken WordPress images (e.g. <code>/wp-content/uploads/</code>) after domain disconnection. 
          Upload your WordPress Media XML export to parse metadata, then upload your actual image files or a ZIP archive. 
          The system will upload them to local Supabase Storage and automatically rewrite all broken image URLs in your posts/pages by matching filenames.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Left: Media XML Upload */}
          <div className="space-y-3 p-4 border rounded-xl bg-muted/10">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-muted-foreground" />
              1. Parse WordPress Media XML (Optional)
            </h3>
            <p className="text-xs text-muted-foreground">
              Loads attachment metadata (titles, alt texts, original URLs) to map files accurately.
            </p>
            <label className="block border border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:bg-muted/40 transition text-xs">
              <Upload className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
              <span className="truncate max-w-full block">
                {parsedAttachmentsCount !== null 
                  ? `Parsed ${parsedAttachmentsCount} attachments` 
                  : "Choose Media-*.xml file"}
              </span>
              <input
                type="file"
                accept=".xml"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleMediaXmlFileChange(e.target.files[0])}
              />
            </label>
          </div>

          {/* Right: Actual Images Upload */}
          <div className="space-y-3 p-4 border rounded-xl bg-muted/10">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-muted-foreground" />
              2. Upload Media ZIP or Files (Required)
            </h3>
            <p className="text-xs text-muted-foreground">
              Select multiple image files or upload a single ZIP containing your exported media assets.
            </p>
            <label className="block border border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:bg-muted/40 transition text-xs">
              <Upload className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
              <span>
                {uploadingMedia ? "Processing..." : "Select Images or ZIP"}
              </span>
              <input
                type="file"
                accept=".zip,image/*"
                multiple
                className="hidden"
                disabled={uploadingMedia || repairing}
                onChange={(e) => handleMediaUploadAndRepair(e.target.files)}
              />
            </label>
          </div>
        </div>

        {/* Progress Display */}
        {(uploadingMedia || repairing) && (
          <div className="space-y-2 border rounded-xl p-4 bg-muted/20 animate-in fade-in duration-300">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-xs font-semibold text-foreground">
                {uploadingMedia ? uploadProgress : repairProgress}
              </span>
            </div>
            {uploadingMedia && totalToUpload > 0 && (
              <div className="space-y-1">
                <Progress value={Math.round((uploadedCount / totalToUpload) * 100)} className="h-1.5" />
                <span className="text-[10px] text-muted-foreground">
                  Uploaded {uploadedCount} of {totalToUpload} files
                </span>
              </div>
            )}
          </div>
        )}

        {/* Progress for Wayback Recovery */}
        {waybackImporting && (
          <div className="space-y-2 border rounded-xl p-4 bg-muted/20 animate-in fade-in duration-300">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-xs font-semibold text-foreground">{waybackProgress}</span>
            </div>
          </div>
        )}

        {/* Repair Results */}
        {repairResult && (
          <div className="rounded-xl border border-primary/20 bg-mint/5 p-4 text-sm text-primary-foreground flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
            <div>
              <p className="font-semibold text-primary">Repair Completed Successfully!</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Rewrote <strong>{repairResult.urlsReplaced}</strong> broken image URLs across <strong>{repairResult.postsUpdated}</strong> posts/pages.
              </p>
            </div>
          </div>
        )}

        {/* Wayback Results */}
        {waybackResult && (
          <div className="rounded-xl border border-primary/20 bg-mint/5 p-4 text-sm text-primary-foreground flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
            <div>
              <p className="font-semibold text-primary">Wayback Recovery Completed!</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Processed <strong>{waybackResult.processed}</strong> URLs: Successfully recovered and imported <strong>{waybackResult.succeeded}</strong> images, <strong>{waybackResult.failed}</strong> failed.
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 justify-end pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunRepairOnly}
            disabled={uploadingMedia || repairing || waybackImporting}
          >
            <RotateCw className="w-3.5 h-3.5 mr-1.5" />
            Scan & Repair Existing Media Library Images
          </Button>
          <Button
            size="sm"
            onClick={handleWaybackImport}
            disabled={uploadingMedia || repairing || waybackImporting}
            className="shadow-sm"
          >
            <CloudDownload className="w-4 h-4 mr-1.5" />
            Recover & Import Missing Images (Wayback Machine)
          </Button>
        </div>
      </div>

      {/* Branding Modal */}
      {showBrandingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-background border rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div>
              <h3 className="font-display text-xl font-semibold">Branding Preferences</h3>
              <p className="text-muted-foreground text-xs mt-1">
                Customize colors and typography for the imported site. These will sync to your global theme settings.
              </p>
            </div>

            <div className="space-y-4">
              {/* Primary Color */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Primary Theme Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={brandingOptions.primary}
                    onChange={(e) => setBrandingOptions({ ...brandingOptions, primary: e.target.value })}
                    className="w-10 h-10 border rounded cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={brandingOptions.primary}
                    onChange={(e) => setBrandingOptions({ ...brandingOptions, primary: e.target.value })}
                    className="flex-1 px-3 py-2 border rounded-md text-sm bg-muted/40"
                    placeholder="#111111"
                  />
                </div>
              </div>

              {/* Accent Color */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Accent / Secondary Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={brandingOptions.accent}
                    onChange={(e) => setBrandingOptions({ ...brandingOptions, accent: e.target.value })}
                    className="w-10 h-10 border rounded cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={brandingOptions.accent}
                    onChange={(e) => setBrandingOptions({ ...brandingOptions, accent: e.target.value })}
                    className="flex-1 px-3 py-2 border rounded-md text-sm bg-muted/40"
                    placeholder="#ffcc00"
                  />
                </div>
              </div>

              {/* Font Family */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Font Family</label>
                <select
                  value={brandingOptions.font}
                  onChange={(e) => setBrandingOptions({ ...brandingOptions, font: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md text-sm bg-background"
                >
                  <option value="Inter">Inter (Clean, Modern Sans-Serif)</option>
                  <option value="Outfit">Outfit (Elegant, Geometric Sans-Serif)</option>
                  <option value="Georgia">Georgia (Classic Serif)</option>
                  <option value="Playfair Display">Playfair Display (Premium Serif)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowBrandingModal(false);
                  setZipMdFile(null);
                  setSingleMdFile(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowBrandingModal(false);
                  if (zipMdFile) {
                    triggerZipMdImport();
                  } else if (singleMdFile) {
                    triggerSingleMdImport();
                  }
                }}
              >
                Start Import
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Image import (background worker) */}
      <div className="bg-background border rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <ImageIcon className="w-5 h-5 text-primary" />
            <h2 className="font-display text-xl">Import & optimize external images</h2>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => scanForExternalImages(false)}
              disabled={scanningExternal}
            >
              {scanningExternal ? "Scanning…" : "Scan for External Images"}
            </Button>
            <Button
              onClick={startImageImport}
              disabled={
                scanning ||
                scanningExternal ||
                imageJob?.status === "running" ||
                imageJob?.status === "pending" ||
                detectedExternalImages.length === 0
              }
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {scanning ? "Starting Importer…" : "Import & Replace Images"}
            </Button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Scans all pages, posts, featured images, and templates, then downloads any images hosted on external servers (e.g. <code>deepakshukla.com</code>, <code>m.media-amazon.com</code>), uploads them to your local Supabase Storage, and replaces the URLs in your content.
        </p>

        {/* Scan results */}
        {detectedExternalImages.length > 0 ? (
          <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 space-y-3">
            <div className="flex items-center gap-2 text-warning-foreground text-sm font-semibold">
              <ShieldAlert className="w-4 h-4 text-warning" />
              Found {detectedExternalImages.length} external images that need to be imported.
            </div>
            <p className="text-xs text-muted-foreground">
              Images hosted on external servers can cause CORS issues, slower page loading, and broken links if the external server changes.
            </p>
            
            {/* Domain breakdown */}
            <div className="space-y-1.5">
              <button
                onClick={() => setShowDomainBreakdown(!showDomainBreakdown)}
                className="text-xs font-semibold text-primary hover:underline"
              >
                {showDomainBreakdown ? "Hide domain breakdown" : "Show domain breakdown"}
              </button>
              {showDomainBreakdown && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {(() => {
                    const counts: Record<string, number> = {};
                    detectedExternalImages.forEach((img) => {
                      try {
                        const domain = new URL(img.url).hostname;
                        counts[domain] = (counts[domain] || 0) + 1;
                      } catch {
                        counts["unknown"] = (counts["unknown"] || 0) + 1;
                      }
                    });
                    return Object.entries(counts)
                      .sort((a, b) => b[1] - a[1])
                      .map(([domain, count]) => (
                        <div key={domain} className="flex justify-between items-center text-xs bg-background p-2 border rounded-lg">
                          <span className="font-mono truncate max-w-[200px]">{domain}</span>
                          <Badge variant="outline">{count} image{count === 1 ? "" : "s"}</Badge>
                        </div>
                      ));
                  })()}
                </div>
              )}
            </div>
          </div>
        ) : (
          !scanningExternal && (
            <div className="rounded-xl border border-primary/20 bg-mint/5 p-4 text-sm text-primary-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              All images are hosted locally or on your Supabase Storage. No external images detected.
            </div>
          )
        )}

        {imageJob && (
          <div className="space-y-3 border rounded-xl p-4 bg-muted/20">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    imageJob.status === "completed"
                      ? "default"
                      : imageJob.status === "failed"
                        ? "destructive"
                        : "outline"
                  }
                >
                  {imageJob.status === "running" ? "Importing…" : imageJob.status}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Started{" "}
                  {imageJob.started_at
                    ? new Date(imageJob.started_at).toLocaleString()
                    : "—"}
                </span>
              </div>
              {(imageJob.status === "running" || imageJob.status === "pending") && (
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={resumeLatestImageImport}>
                    <RotateCw className="w-3.5 h-3.5 mr-1" />
                    Resume
                  </Button>
                  <Button size="sm" variant="ghost" onClick={cancelImageImport}>
                    Cancel
                  </Button>
                </div>
              )}
            </div>

            <Progress
              value={
                imageJob.total > 0
                  ? Math.round((imageJob.processed / imageJob.total) * 100)
                  : 0
              }
            />
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground font-semibold">
              <span className="text-foreground">📦 Progress: {imageJob.processed} / {imageJob.total} images</span>
              <span className="text-primary">✅ Succeeded: {imageJob.succeeded}</span>
              <span>skip Skipped: {imageJob.skipped}</span>
              {imageJob.failed > 0 && <span className="text-destructive">⚠️ Failed: {imageJob.failed}</span>}
              {typeof imageJob.replacements === "number" && (
                <span className="text-primary">🔁 URLs Replaced: {imageJob.replacements}</span>
              )}
            </div>
            {imageJob.current_url && imageJob.status === "running" && (
              <p className="text-xs text-muted-foreground truncate bg-background p-2 border rounded font-mono">
                Downloading: {imageJob.current_url}
              </p>
            )}

            {imageJob.status === "completed" && imageJob.succeeded > 0 && (
              <div className="pt-2 border-t flex items-center justify-between flex-wrap gap-2">
                <p className="text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary inline mr-1" />
                  Images are fully optimized and WordPress URLs have been replaced.
                </p>
                <Button
                  size="sm"
                  onClick={applyOptimizedToPosts}
                  disabled={rewriting}
                >
                  {rewriting ? "Applying…" : "Re-apply replacements"}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Import history */}
      <div className="bg-background border rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-primary" />
            <h2 className="font-display text-xl">Import history</h2>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{history.length} runs</Badge>
            <Button size="sm" variant="ghost" onClick={loadHistory} disabled={loadingHistory}>
              {loadingHistory ? "Refreshing…" : "Refresh"}
            </Button>
          </div>
        </div>

        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No imports yet. Past imports will appear here and persist across page refreshes.
          </p>
        ) : (
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="p-2">When</th>
                  <th className="p-2">File</th>
                  <th className="p-2">Size</th>
                  <th className="p-2">Parsed</th>
                  <th className="p-2">Saved</th>
                  <th className="p-2">Failed</th>
                  <th className="p-2">Status</th>
                  <th className="p-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-t align-top">
                    <td className="p-2 text-muted-foreground whitespace-nowrap">
                      {new Date(h.created_at).toLocaleString()}
                    </td>
                    <td className="p-2 font-medium truncate max-w-[220px]">
                      {h.file_name || h.source}
                    </td>
                    <td className="p-2 text-muted-foreground">{fmtBytes(h.file_size_bytes)}</td>
                    <td className="p-2">{h.parsed_count}</td>
                    <td className="p-2">{h.inserted_count}</td>
                    <td className="p-2">{h.failed_count}</td>
                    <td className="p-2">
                      <Badge
                        variant={
                          h.status === "completed"
                            ? "default"
                            : h.status === "partial"
                              ? "outline"
                              : "destructive"
                        }
                      >
                        {h.status}
                      </Badge>
                      {h.error_sample && (
                        <p className="text-xs text-destructive mt-1 truncate max-w-[260px]">
                          {h.error_sample}
                        </p>
                      )}
                    </td>
                    <td className="p-2 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteHistory(h.id)}
                        title="Delete entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Website Export (Full Backup) */}
      <div className="bg-background border border-primary/20 rounded-2xl p-6 space-y-4 shadow-soft">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Download className="w-5 h-5 text-primary" />
            <h2 className="font-display text-xl">Export Website (Full Backup)</h2>
          </div>
          <Button
            onClick={handleExport}
            disabled={exporting}
            className="shadow-sm"
          >
            {exporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exporting…
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Generate Export (.zip)
              </>
            )}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Create a complete backup of this website. This generates a structured ZIP file containing all pages, posts, custom post types, redirects, taxonomies, global site settings, and all uploaded media files from the media library.
        </p>

        {exporting && (
          <div className="space-y-2 border rounded-xl p-4 bg-muted/20 animate-in fade-in duration-300">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-xs font-semibold text-foreground">{exportProgress}</span>
            </div>
            <Progress value={exportProgress.includes("media") ? undefined : 80} className="h-1.5" />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminImport;
