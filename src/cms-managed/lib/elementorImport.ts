// Elementor "Site Kit" / Pro page importer.
// Parses a ZIP (manifest.json + wp-content/*.xml + content/{type}/{id}.json
// + templates/*.json + site-settings.json) and upserts into Lovable Cloud.
//
// Strategy:
//  - Pages/posts with an entry in the WP XML get upserted into `imported_posts`
//    by slug (update existing). Their Elementor tree lives on `elementor_data`.
//  - Every templates/*.json + every content/*.json that has NO matching XML
//    item is stored as a reusable item in `elementor_templates`.
//  - site-settings.json is stored once in `elementor_site_settings`.

import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";

export type ElementorImportResult = {
  pages: number;
  posts: number;
  templates: number;
  sectionsLibrary: number;
  siteSettings: boolean;
  skipped: number;
  failed: number;
  errors: string[];
};

type WpItem = {
  postId: string;
  postType: string;
  postName: string;
  title: string;
  status: string;
  pubDate: string;
  link: string;
  content: string;
  excerpt: string;
  featuredImageUrl: string;
  meta: Record<string, string>;
};

const slugify = (s: string) =>
  (s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// -------- WP XML parsing (CDATA-aware, regex tolerant) ----------------------

function grab(block: string, tag: string): string {
  const re = new RegExp(
    `<${tag}[^>]*>\\s*(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))\\s*</${tag}>`,
    "i",
  );
  const m = block.match(re);
  return (m?.[1] ?? m?.[2] ?? "").trim();
}

function parseWpXml(xml: string): WpItem[] {
  const items: WpItem[] = [];
  const attachments: Record<string, string> = {};
  const itemRe = /<item\b[\s\S]*?<\/item>/g;
  const blocks = xml.match(itemRe) || [];

  for (const b of blocks) {
    if (grab(b, "wp:post_type") === "attachment") {
      const id = grab(b, "wp:post_id");
      const url = grab(b, "wp:attachment_url");
      if (id && url) attachments[id] = url;
    }
  }

  for (const b of blocks) {
    const postType = grab(b, "wp:post_type");
    if (postType === "attachment" || postType === "nav_menu_item" || !postType) continue;

    const meta: Record<string, string> = {};
    let featured = "";
    const metaBlocks = b.match(/<wp:postmeta\b[\s\S]*?<\/wp:postmeta>/g) || [];
    for (const mb of metaBlocks) {
      const k = grab(mb, "wp:meta_key");
      const v = grab(mb, "wp:meta_value");
      if (k) meta[k] = v;
      if (k === "_thumbnail_id" && attachments[v]) featured = attachments[v];
    }

    const title = grab(b, "title");
    const postName = grab(b, "wp:post_name") || slugify(title);
    items.push({
      postId: grab(b, "wp:post_id"),
      postType,
      postName,
      title,
      status: grab(b, "wp:status") || "publish",
      pubDate: grab(b, "wp:post_date") || grab(b, "pubDate"),
      link: grab(b, "link"),
      content: grab(b, "content:encoded"),
      excerpt: grab(b, "excerpt:encoded"),
      featuredImageUrl: featured,
      meta,
    });
  }
  return items;
}

// -------- Main importer -----------------------------------------------------

export async function importElementorZip(
  file: File,
  onProgress?: (msg: string) => void,
): Promise<ElementorImportResult> {
  const result: ElementorImportResult = {
    pages: 0,
    posts: 0,
    templates: 0,
    sectionsLibrary: 0,
    siteSettings: false,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  const { data: sess } = await supabase.auth.getSession();
  const userId = sess?.session?.user?.id || null;
  if (!userId) throw new Error("Sign in required for Elementor import.");

  onProgress?.("Unzipping…");
  const zip = await JSZip.loadAsync(file);

  // 1. site-settings.json
  const settingsFile = zip.file("site-settings.json");
  if (settingsFile) {
    try {
      const json = JSON.parse(await settingsFile.async("string"));
      const { error } = await supabase
        .from("elementor_site_settings")
        .upsert(
          {
            source_id: "default",
            title: json.title || null,
            settings: json.settings || {},
            theme: json.theme || {},
          },
          { onConflict: "source_id" },
        );
      if (!error) result.siteSettings = true;
      else result.errors.push(`site-settings: ${error.message}`);
    } catch (e) {
      result.errors.push(`site-settings parse: ${(e as Error).message}`);
    }
  }

  // 2. Collect XML metadata indexed by post id
  type PostMeta = { item: WpItem; type: string };
  const metaById = new Map<string, PostMeta>();
  const xmlFiles = Object.keys(zip.files).filter((p) => p.match(/^wp-content\/[^/]+\/[^/]+\.xml$/));
  for (const path of xmlFiles) {
    const xml = await zip.files[path].async("string");
    const items = parseWpXml(xml);
    const typeDir = path.split("/")[1]; // e.g. page / post / case-study
    for (const it of items) {
      if (it.postId) metaById.set(it.postId, { item: it, type: typeDir });
    }
  }

  // 3. content/{type}/{id}.json — pages/posts/case-studies
  const contentFiles = Object.keys(zip.files).filter((p) =>
    p.match(/^content\/[^/]+\/\d+\.json$/),
  );

  const PAGE_LIKE = new Set(["page", "case-study"]);
  const POST_LIKE = new Set(["post"]);

  for (const path of contentFiles) {
    try {
      const parts = path.split("/"); // ["content", type, "{id}.json"]
      const typeDir = parts[1];
      const fileId = parts[2].replace(/\.json$/, "");
      const raw = await zip.files[path].async("string");
      const parsed = JSON.parse(raw);
      const elementorTree = Array.isArray(parsed.content) ? parsed.content : [];
      const settings = parsed.settings || {};

      const meta = metaById.get(fileId);

      if (!meta) {
        // No XML metadata → treat as reusable template/section
        const { error } = await supabase
          .from("elementor_templates")
          .upsert(
            {
              source_id: `content-${typeDir}-${fileId}`,
              kind: typeDir,
              title: `${typeDir} ${fileId}`,
              slug: `${typeDir}-${fileId}`,
              data: elementorTree,
              settings,
              source: "elementor",
              imported_by: userId,
            },
            { onConflict: "source_id" },
          );
        if (error) {
          result.failed++;
          result.errors.push(`content/${typeDir}/${fileId}: ${error.message}`);
        } else {
          result.sectionsLibrary++;
        }
        continue;
      }

      // Has XML metadata → upsert into imported_posts by slug
      const it = meta.item;
      const postType = POST_LIKE.has(typeDir) ? "post" : "page";
      const slug = it.postName || slugify(it.title) || `elementor-${fileId}`;
      const row = {
        site_id: (window as unknown as { __PL_SITE_ID?: string }).__PL_SITE_ID || "default",
        title: it.title || `Untitled ${fileId}`,
        slug,
        excerpt: it.excerpt || "",
        body: it.content || "",
        elementor_data: elementorTree as unknown as never,
        render_mode: postType === "post" ? "template" : "elementor",
        status: it.status === "publish" ? "published" : it.status === "draft" ? "draft" : "draft",
        publish_date: it.pubDate ? new Date(it.pubDate.replace(" ", "T")).toISOString() : null,
        featured_image_url: it.featuredImageUrl || null,
        type: postType,
        meta_title:
          it.meta["_yoast_wpseo_title"] ||
          it.meta["rank_math_title"] ||
          it.meta["_aioseo_title"] ||
          it.meta["_aioseop_title"] ||
          it.meta["_seopress_titles_title"] ||
          it.title,
        meta_description:
          it.meta["_yoast_wpseo_metadesc"] ||
          it.meta["rank_math_description"] ||
          it.meta["_aioseo_description"] ||
          it.meta["_aioseop_description"] ||
          it.meta["_seopress_titles_desc"] ||
          it.excerpt ||
          "",
        canonical_url:
          it.meta["_yoast_wpseo_canonical"] ||
          it.meta["rank_math_canonical_url"] ||
          it.meta["_aioseo_canonical_url"] ||
          it.meta["_seopress_robots_canonical"] ||
          it.link,
        source: "elementor",
        imported_by: userId,
        raw: { wp_post_id: fileId, meta: it.meta, kind: typeDir } as unknown as never,
      };
      const { error } = await supabase
        .from("imported_posts")
        .upsert(row, { onConflict: "site_id,slug" });
      if (error) {
        result.failed++;
        result.errors.push(`${slug}: ${error.message}`);
      } else if (postType === "post") {
        result.posts++;
      } else {
        result.pages++;
      }
    } catch (e) {
      result.failed++;
      result.errors.push(`${path}: ${(e as Error).message}`);
    }
  }

  // 4. templates/*.json — always reusable templates
  const templateFiles = Object.keys(zip.files).filter((p) => p.match(/^templates\/\d+\.json$/));
  onProgress?.(`Saving ${templateFiles.length} templates…`);
  for (const path of templateFiles) {
    try {
      const fileId = path.split("/")[1].replace(/\.json$/, "");
      const parsed = JSON.parse(await zip.files[path].async("string"));
      const elementorTree = Array.isArray(parsed.content) ? parsed.content : [];
      const settings = parsed.settings || {};
      const location = parsed.location || (parsed.metadata && parsed.metadata.type) || null;
      const { error } = await supabase
        .from("elementor_templates")
        .upsert(
          {
            source_id: `template-${fileId}`,
            kind: "template",
            title: `Template ${fileId}`,
            slug: `template-${fileId}`,
            data: elementorTree,
            settings,
            location,
            source: "elementor",
            imported_by: userId,
          },
          { onConflict: "source_id" },
        );
      if (error) {
        result.failed++;
        result.errors.push(`templates/${fileId}: ${error.message}`);
      } else {
        result.templates++;
      }
    } catch (e) {
      result.failed++;
      result.errors.push(`${path}: ${(e as Error).message}`);
    }
  }

  return result;
}
