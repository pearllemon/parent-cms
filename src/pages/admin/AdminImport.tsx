import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { useSiteConfig } from "@/providers/SiteProvider";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Upload, FileCode2, CheckCircle2, AlertCircle, History, Trash2, Image as ImageIcon, Sparkles, RotateCw, Package } from "lucide-react";
import { toast } from "sonner";
import {
  collectUsedImagesFromImportedPosts,
  queueImageImportJob,
  resumeImageImportJob,
  rewritePostImageUrls,
} from "@/lib/imageImport";
import { importElementorZip, type ElementorImportResult } from "@/lib/elementorImport";

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

  // ---- Elementor ZIP import state ----
  const [elementorImporting, setElementorImporting] = useState(false);
  const [elementorResult, setElementorResult] = useState<ElementorImportResult | null>(null);
  const [elementorStatus, setElementorStatus] = useState<string>("");

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
      const rows = chunk.map((it, idx) => ({
        site_id,
        title: it.title || "(untitled)",
        slug: (it.slug || slugify(it.title) || `wp-${Date.now()}-${i}-${idx}`).slice(0, 200),
        excerpt: it.excerpt || "",
        body: it.content || "",
        status:
          it.status === "publish"
            ? "published"
            : it.status === "draft"
              ? "draft"
              : it.status === "future"
                ? "scheduled"
                : "draft",
        publish_date: it.pubDate ? new Date(it.pubDate).toISOString() : null,
        featured_image_url: it.featuredImageUrl || null,
        type: it.postType, // 'post' or 'page'
        meta_title: it.meta?.["_yoast_wpseo_title"] || it.meta?.["rank_math_title"] || it.title,
        meta_description:
          it.meta?.["_yoast_wpseo_metadesc"] || it.meta?.["rank_math_description"] || it.excerpt || "",
        canonical_url:
          it.meta?.["_yoast_wpseo_canonical"] || it.meta?.["rank_math_canonical_url"] || it.link,
        source: "wp-xml",
        imported_by: userId,
        raw: {
          link: it.link,
          author: it.author,
          categories: it.categories,
          tags: it.tags,
          meta: it.meta,
        } as unknown as never,
      }));

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

      {/* Image import (background worker) */}
      <div className="bg-background border rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <ImageIcon className="w-5 h-5 text-primary" />
            <h2 className="font-display text-xl">Import & optimize images</h2>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={loadLatestImageJob}
              disabled={scanning}
            >
              Refresh
            </Button>
            <Button
              onClick={startImageImport}
              disabled={
                scanning ||
                imageJob?.status === "running" ||
                imageJob?.status === "pending"
              }
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {scanning
                ? "Scanning…"
                : imageJob?.status === "running"
                  ? "Working…"
                  : "Start image import"}
            </Button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Scans imported posts, pages, featured images, and site images, then stores optimized copies with SEO-friendly file names.
          The worker continues in the background and automatically swaps old WordPress URLs to hosted optimized links when ready.
        </p>

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
                  {imageJob.status}
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
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span>📦 {imageJob.processed} / {imageJob.total} processed</span>
              <span className="text-primary">✅ {imageJob.succeeded} optimized</span>
              <span>⏭ {imageJob.skipped} skipped</span>
              <span className="text-destructive">⚠️ {imageJob.failed} failed</span>
              {typeof imageJob.replacements === "number" && (
                <span>🔁 {imageJob.replacements} URLs replaced</span>
              )}
            </div>
            {imageJob.current_url && imageJob.status === "running" && (
              <p className="text-xs text-muted-foreground truncate">
                Importing: <span className="font-mono">{imageJob.current_url}</span>
              </p>
            )}

            {imageJob.status === "completed" && imageJob.succeeded > 0 && (
              <div className="pt-2 border-t flex items-center justify-between flex-wrap gap-2">
                <p className="text-sm">
                  <CheckCircle2 className="w-4 h-4 text-primary inline mr-1" />
                  Images are optimized and WordPress URLs are replaced automatically. Use this if you want to re-run the replacement pass.
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
    </div>
  );
};

export default AdminImport;
