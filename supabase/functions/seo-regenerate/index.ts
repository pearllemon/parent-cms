// Cron-triggerable SEO regenerator. Rebuilds sitemap.xml / robots.txt / llms.txt
// from local imported_posts (+ optional parent posts via REST), writes to
// seo_files.manual_content, snapshots a version, and pings an optional webhook.
//
// Trigger:  POST /functions/v1/seo-regenerate
// Body (all optional):
//   { base_url?: string, site_name?: string, parent_url?: string,
//     parent_anon?: string, parent_site_id?: string, webhook?: string,
//     only?: ("sitemap"|"robots"|"llms")[] }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

type Row = { slug: string; updated_at: string | null; type?: string | null; title?: string | null };

function buildSitemap(baseUrl: string, s: any, content: { parent: Row[]; imported: Row[] }, services: { slug: string; title?: string }[]) {
  const base = baseUrl.replace(/\/+$/, "");
  const excludeSlugs = new Set((s.exclude_slugs || []).map((x: string) => x.toLowerCase()));
  const excludeTypes = new Set((s.exclude_types || []).map((x: string) => x.toLowerCase()));
  const seen = new Set<string>();
  const entries: string[] = [];
  const add = (p: string, lm: string | null, cf: string, pr: number) => {
    const k = p.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    const parts = [`    <loc>${xmlEscape(`${base}${p}`)}</loc>`];
    if (lm) parts.push(`    <lastmod>${new Date(lm).toISOString().slice(0, 10)}</lastmod>`);
    parts.push(`    <changefreq>${cf}</changefreq>`, `    <priority>${pr.toFixed(1)}</priority>`);
    entries.push(`  <url>\n${parts.join("\n")}\n  </url>`);
  };
  if (s.include_static !== false) STATIC_ROUTES.forEach((r) => add(r.path, null, r.changefreq, r.priority));
  if (s.include_services !== false) services.forEach((sv) => add(`/services/${sv.slug}`, null, "monthly", 0.8));
  const addRows = (rows: Row[]) => {
    for (const p of rows) {
      const t = (p.type || "post").toLowerCase();
      if (excludeTypes.has(t)) continue;
      if (excludeSlugs.has((p.slug || "").toLowerCase())) continue;
      if (t === "page") {
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

function buildRobots(baseUrl: string, s: any) {
  const rules = s.rules?.length ? s.rules : [{ user_agent: "*", allow: ["/"], disallow: ["/admin"] }];
  const lines: string[] = [];
  rules.forEach((r: any, i: number) => {
    if (i > 0) lines.push("");
    lines.push(`User-agent: ${r.user_agent || "*"}`);
    (r.allow || []).forEach((p: string) => lines.push(`Allow: ${p}`));
    (r.disallow || []).forEach((p: string) => lines.push(`Disallow: ${p}`));
    if (r.crawl_delay != null) lines.push(`Crawl-delay: ${r.crawl_delay}`);
  });
  if (s.include_sitemap !== false && baseUrl) {
    lines.push("", `Sitemap: ${baseUrl.replace(/\/+$/, "")}/sitemap.xml`);
  }
  if (s.extra) lines.push("", String(s.extra).trim());
  return lines.join("\n") + "\n";
}

function buildLlms(baseUrl: string, s: any, content: { parent: Row[]; imported: Row[] }, services: { slug: string; title?: string }[], siteName?: string) {
  const base = baseUrl.replace(/\/+$/, "");
  const name = (s.site_name || siteName || "Site").trim();
  const summary = (s.summary || "").trim();
  const exclude = new Set((s.exclude_paths || []).map((x: string) => x.toLowerCase()));
  const isEx = (p: string) => Array.from(exclude).some((ex) => p.toLowerCase().startsWith(ex as string));
  const out: string[] = [`# ${name}`];
  if (summary) out.push("", `> ${summary}`);
  const sections = s.sections || { pages: true, blog: true, services: true };
  if (sections.services !== false && services.length) {
    out.push("", "## Services");
    services.forEach((sv) => {
      const p = `/services/${sv.slug}`;
      if (!isEx(p)) out.push(`- [${sv.title || sv.slug}](${base}${p})`);
    });
  }
  const all = [...content.parent, ...content.imported];
  const pages = all.filter((p) => (p.type || "").toLowerCase() === "page");
  const posts = all.filter((p) => (p.type || "").toLowerCase() !== "page");
  if (sections.pages !== false && pages.length) {
    out.push("", "## Pages");
    pages.forEach((p) => { const path = `/p/${p.slug}`; if (!isEx(path)) out.push(`- [${p.title || p.slug}](${base}${path})`); });
  }
  if (sections.blog !== false && posts.length) {
    out.push("", "## Blog");
    posts.forEach((p) => { const path = `/blog/${p.slug}`; if (!isEx(path)) out.push(`- [${p.title || p.slug}](${base}${path})`); });
  }
  if (s.directives) out.push("", "## Optional", String(s.directives).trim());
  return out.join("\n") + "\n";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  const baseUrl = body.base_url || "https://deepak-shukla.lovable.app";
  const siteName = body.site_name || "Deepak Shukla";
  const only: string[] | null = Array.isArray(body.only) ? body.only : null;

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const results: any[] = [];

  try {
    // Load local imported posts
    const { data: imp } = await supabase.from("imported_posts").select("slug,updated_at,type,title").limit(5000);
    const imported: Row[] = (imp || []).filter((r: any) => r.slug);

    // Optional parent posts
    let parent: Row[] = [];
    if (body.parent_url && body.parent_anon && body.parent_site_id) {
      try {
        const res = await fetch(`${body.parent_url}/rest/v1/posts?select=slug,updated_at,type,title&site_id=eq.${body.parent_site_id}&status=eq.published&limit=5000`, {
          headers: { apikey: body.parent_anon, Authorization: `Bearer ${body.parent_anon}` },
        });
        if (res.ok) parent = (await res.json()) as Row[];
      } catch { /* ignore */ }
    }

    const { data: rows } = await supabase.from("seo_files").select("*");
    for (const r of (rows || [])) {
      if (!r.auto_enabled) continue;
      if (only && !only.includes(r.file_type)) continue;
      const s = r.settings || {};
      const services = Array.isArray(s.services_cache) ? s.services_cache : [];
      let generated = "";
      if (r.file_type === "sitemap") generated = buildSitemap(baseUrl, s, { parent, imported }, services);
      else if (r.file_type === "robots") generated = buildRobots(baseUrl, s);
      else if (r.file_type === "llms") generated = buildLlms(baseUrl, s, { parent, imported }, services, siteName);
      if (!generated) continue;

      await supabase.from("seo_files").update({
        manual_content: generated,
        last_generated_at: new Date().toISOString(),
      }).eq("file_type", r.file_type);

      await supabase.from("seo_file_versions").insert({
        file_type: r.file_type,
        content: generated,
        settings: s,
        note: "Cron auto-regenerated",
      });

      results.push({ file_type: r.file_type, bytes: generated.length });
    }

    // Optional webhook ping (notify parent / child sync)
    if (body.webhook) {
      try {
        await fetch(body.webhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event: "seo_regenerated", base_url: baseUrl, results, ts: new Date().toISOString() }),
        });
      } catch { /* non-fatal */ }
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
