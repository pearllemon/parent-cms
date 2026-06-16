// Shared client-side generators for sitemap.xml, robots.txt and llms.txt.
// The edge functions mirror this logic in Deno; keep them in sync.

import { supabase } from "@/integrations/supabase/client";
import { supabase as parent } from "@/lib/parent";
import { services } from "@/data/services";

export type SitemapSettings = {
  include_static?: boolean;
  include_services?: boolean;
  include_posts?: boolean;
  include_pages?: boolean;
  include_imported?: boolean;
  exclude_slugs?: string[];
  exclude_types?: string[];
};

export type RobotsRule = {
  user_agent: string;
  allow?: string[];
  disallow?: string[];
  crawl_delay?: number;
};

export type RobotsSettings = {
  rules?: RobotsRule[];
  include_sitemap?: boolean;
  extra?: string;
};

export type LlmsSettings = {
  site_name?: string;
  summary?: string;
  sections?: { pages?: boolean; blog?: boolean; services?: boolean };
  exclude_paths?: string[];
  directives?: string;
};

const STATIC_ROUTES = [
  { path: "/", priority: 1.0, changefreq: "weekly" },
  { path: "/about", priority: 0.8, changefreq: "monthly" },
  { path: "/blog", priority: 0.9, changefreq: "daily" },
  { path: "/contact", priority: 0.7, changefreq: "monthly" },
  { path: "/book-a-call", priority: 0.7, changefreq: "monthly" },
  { path: "/press", priority: 0.5, changefreq: "monthly" },
  { path: "/books", priority: 0.5, changefreq: "monthly" },
  { path: "/privacy", priority: 0.3, changefreq: "yearly" },
  { path: "/terms", priority: 0.3, changefreq: "yearly" },
];

const xmlEscape = (s: string) =>
  s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!));

export type ContentRow = { slug: string; updated_at: string | null; type?: string | null; title?: string | null };

export async function loadContent(siteId?: string | null): Promise<{ parent: ContentRow[]; imported: ContentRow[] }> {
  const out: { parent: ContentRow[]; imported: ContentRow[] } = { parent: [], imported: [] };
  if (siteId) {
    const { data } = await parent
      .from("posts")
      .select("slug,updated_at,type,title,status")
      .eq("site_id", siteId)
      .eq("status", "published")
      .limit(5000);
    out.parent = (data || []).map((r: any) => ({ slug: r.slug, updated_at: r.updated_at, type: r.type, title: r.title }));
  }
  const { data: imp } = await supabase
    .from("imported_posts")
    .select("slug,updated_at,type,title")
    .limit(5000);
  out.imported = (imp || [])
    .filter((r: any) => r.slug)
    .map((r: any) => ({ slug: r.slug, updated_at: r.updated_at, type: r.type, title: r.title }));
  return out;
}

export function buildSitemap(baseUrl: string, s: SitemapSettings, content: { parent: ContentRow[]; imported: ContentRow[] }): string {
  const base = baseUrl.replace(/\/+$/, "");
  const excludeSlugs = new Set((s.exclude_slugs || []).map((x) => x.toLowerCase()));
  const excludeTypes = new Set((s.exclude_types || []).map((x) => x.toLowerCase()));
  const seen = new Set<string>();
  const entries: string[] = [];

  const add = (path: string, lastmod: string | null, changefreq: string, priority: number) => {
    const key = path.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    const parts = [`    <loc>${xmlEscape(`${base}${path}`)}</loc>`];
    if (lastmod) parts.push(`    <lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>`);
    parts.push(`    <changefreq>${changefreq}</changefreq>`);
    parts.push(`    <priority>${priority.toFixed(1)}</priority>`);
    entries.push(`  <url>\n${parts.join("\n")}\n  </url>`);
  };

  if (s.include_static !== false) STATIC_ROUTES.forEach((r) => add(r.path, null, r.changefreq, r.priority));
  if (s.include_services !== false) services.forEach((sv) => add(`/services/${sv.slug}`, null, "monthly", 0.8));

  const addRows = (rows: ContentRow[]) => {
    for (const p of rows) {
      const type = (p.type || "post").toLowerCase();
      if (excludeTypes.has(type)) continue;
      if (excludeSlugs.has((p.slug || "").toLowerCase())) continue;
      if (type === "page") {
        if (s.include_pages === false) continue;
        add(`/p/${p.slug}`, p.updated_at, "monthly", 0.7);
      } else {
        if (s.include_posts === false) continue;
        add(`/blog/${p.slug}`, p.updated_at, "weekly", 0.6);
      }
    }
  };

  addRows(content.parent);
  if (s.include_imported !== false) addRows(content.imported);

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>\n`;
}

export function buildRobots(baseUrl: string, s: RobotsSettings): string {
  const rules = s.rules?.length ? s.rules : [{ user_agent: "*", allow: ["/"], disallow: ["/admin"] }];
  const lines: string[] = [];
  rules.forEach((r, i) => {
    if (i > 0) lines.push("");
    lines.push(`User-agent: ${r.user_agent || "*"}`);
    (r.allow || []).forEach((p) => lines.push(`Allow: ${p}`));
    (r.disallow || []).forEach((p) => lines.push(`Disallow: ${p}`));
    if (r.crawl_delay != null) lines.push(`Crawl-delay: ${r.crawl_delay}`);
  });
  if (s.include_sitemap !== false && baseUrl) {
    lines.push("");
    lines.push(`Sitemap: ${baseUrl.replace(/\/+$/, "")}/sitemap.xml`);
  }
  if (s.extra) {
    lines.push("");
    lines.push(s.extra.trim());
  }
  return lines.join("\n") + "\n";
}

export function buildLlms(
  baseUrl: string,
  s: LlmsSettings,
  content: { parent: ContentRow[]; imported: ContentRow[] },
  siteName?: string,
): string {
  const base = baseUrl.replace(/\/+$/, "");
  const name = (s.site_name || siteName || "Site").trim();
  const summary = (s.summary || "").trim();
  const exclude = new Set((s.exclude_paths || []).map((x) => x.toLowerCase()));
  const isExcluded = (p: string) => Array.from(exclude).some((ex) => p.toLowerCase().startsWith(ex));

  const out: string[] = [`# ${name}`];
  if (summary) out.push("", `> ${summary}`);

  const sections = s.sections || { pages: true, blog: true, services: true };

  if (sections.services !== false && services.length) {
    out.push("", "## Services");
    services.forEach((sv) => {
      const path = `/services/${sv.slug}`;
      if (isExcluded(path)) return;
      out.push(`- [${sv.title || sv.slug}](${base}${path})`);
    });
  }

  const allPosts = [...content.parent, ...content.imported];
  const pages = allPosts.filter((p) => (p.type || "").toLowerCase() === "page");
  const posts = allPosts.filter((p) => (p.type || "").toLowerCase() !== "page");

  if (sections.pages !== false && pages.length) {
    out.push("", "## Pages");
    pages.forEach((p) => {
      const path = `/p/${p.slug}`;
      if (isExcluded(path)) return;
      out.push(`- [${p.title || p.slug}](${base}${path})`);
    });
  }

  if (sections.blog !== false && posts.length) {
    out.push("", "## Blog");
    posts.forEach((p) => {
      const path = `/blog/${p.slug}`;
      if (isExcluded(path)) return;
      out.push(`- [${p.title || p.slug}](${base}${path})`);
    });
  }

  if (s.directives) {
    out.push("", "## Optional", s.directives.trim());
  }

  return out.join("\n") + "\n";
}

export async function snapshotVersion(file_type: "sitemap" | "robots" | "llms", content: string, settings: any, note?: string) {
  await supabase.from("seo_file_versions" as any).insert({ file_type, content, settings, note: note || null });
}

export async function loadVersions(file_type: "sitemap" | "robots" | "llms") {
  const { data } = await supabase
    .from("seo_file_versions" as any)
    .select("id,content,settings,note,created_at")
    .eq("file_type", file_type)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data || []) as any[];
}
