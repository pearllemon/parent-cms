// Cached SEO score store. Rescan iterates every known page and persists
// SEO/GEO/AEO + total into public.seo_scores so the workspace overview is
// instant and accurate (no 24h cache delay).

import { supabase } from "@/integrations/supabase/client";
import { supabase as parent } from "@/lib/parent";
import { services } from "@/data/services";
import { scoreAll, type PageInput } from "@/lib/seoScoring";

export type StoredScore = {
  id: string;
  scope: string;
  key: string;
  url: string;
  title: string | null;
  description: string | null;
  seo_score: number;
  geo_score: number;
  aeo_score: number;
  total_score: number;
  details: any;
  last_scanned_at: string;
};

const TBL = "seo_scores" as any;

const STATIC_ROUTES = [
  { path: "/", title: "Home" },
  { path: "/about", title: "About" },
  { path: "/blog", title: "Blog" },
  { path: "/contact", title: "Contact" },
  { path: "/book-a-call", title: "Book a Call" },
  { path: "/press", title: "Press" },
  { path: "/books", title: "Books" },
  { path: "/privacy", title: "Privacy" },
  { path: "/terms", title: "Terms" },
];

export async function loadStoredScores(): Promise<StoredScore[]> {
  const { data } = await (supabase.from(TBL) as any).select("*").order("total_score", { ascending: true });
  return (data || []) as StoredScore[];
}

async function gatherPages(baseUrl: string, siteId: string | null): Promise<PageInput[]> {
  const all: (PageInput & { _key: string; _scope: string })[] = [];
  const base = baseUrl.replace(/\/+$/, "");

  for (const r of STATIC_ROUTES) {
    all.push({
      _key: `static:${r.path}`,
      _scope: "static",
      url: `${base}${r.path}`,
      title: r.title,
      description: "",
      slug: r.path.slice(1) || "home",
      html: "",
      canonical: `${base}${r.path}`,
    });
  }

  for (const s of services as any[]) {
    all.push({
      _key: `service:${s.slug}`,
      _scope: "service",
      url: `${base}/services/${s.slug}`,
      title: s.title,
      description: s.description || s.excerpt || "",
      slug: s.slug,
      html: "",
      canonical: `${base}/services/${s.slug}`,
    });
  }

  if (siteId) {
    const { data } = await parent
      .from("posts")
      .select("slug,title,excerpt,seo_title,seo_description,og_image,body,type,schema_json,canonical")
      .eq("site_id", siteId)
      .eq("status", "published")
      .limit(2000);
    for (const r of (data || []) as any[]) {
      const path = r.type === "page" ? `/p/${r.slug}` : `/blog/${r.slug}`;
      all.push({
        _key: `cms:${r.slug}`,
        _scope: "cms",
        url: `${base}${path}`,
        title: r.seo_title || r.title || "",
        description: r.seo_description || r.excerpt || "",
        slug: r.slug,
        html: r.body || "",
        canonical: r.canonical || `${base}${path}`,
        ogImage: r.og_image,
        schemaJson: r.schema_json,
      });
    }
  }

  const { data: imp } = await supabase
    .from("imported_posts")
    .select("slug,title,excerpt,body,type,featured_image_url,meta_title,meta_description,canonical_url")
    .limit(5000);
  for (const r of (imp || []) as any[]) {
    if (!r.slug) continue;
    const path = r.type === "page" ? `/p/${r.slug}` : `/blog/${r.slug}`;
    all.push({
      _key: `imp:${r.slug}`,
      _scope: "imported",
      url: `${base}${path}`,
      title: r.meta_title || r.title || "",
      description: r.meta_description || r.excerpt || "",
      slug: r.slug,
      html: r.body || "",
      canonical: r.canonical_url || `${base}${path}`,
      ogImage: r.featured_image_url,
    });
  }

  return all as any;
}

export async function rescanAll(opts: { baseUrl: string; siteId: string | null; onProgress?: (n: number, total: number) => void }) {
  const pages = await gatherPages(opts.baseUrl, opts.siteId);
  const total = pages.length;
  const upserts: any[] = [];
  let i = 0;
  for (const p of pages as any[]) {
    const s = scoreAll(p);
    const total_score = Math.round((s.seo.score + s.geo.score + s.aeo.score) / 3);
    upserts.push({
      scope: p._scope,
      key: p._key,
      url: p.url,
      title: p.title || null,
      description: p.description || null,
      seo_score: s.seo.score,
      geo_score: s.geo.score,
      aeo_score: s.aeo.score,
      total_score,
      details: { seo: s.seo, geo: s.geo, aeo: s.aeo },
      last_scanned_at: new Date().toISOString(),
    });
    i++;
    if (opts.onProgress && i % 10 === 0) opts.onProgress(i, total);
  }
  // Chunk upsert
  const chunkSize = 200;
  for (let j = 0; j < upserts.length; j += chunkSize) {
    const slice = upserts.slice(j, j + chunkSize);
    const { error } = await (supabase.from(TBL) as any).upsert(slice, { onConflict: "key" });
    if (error) throw error;
  }
  opts.onProgress?.(total, total);
  return { scanned: total };
}

export function aggregate(rows: StoredScore[]) {
  if (!rows.length) return { seo: 0, geo: 0, aeo: 0, total: 0, count: 0 };
  const n = rows.length;
  const seo = Math.round(rows.reduce((a, r) => a + r.seo_score, 0) / n);
  const geo = Math.round(rows.reduce((a, r) => a + r.geo_score, 0) / n);
  const aeo = Math.round(rows.reduce((a, r) => a + r.aeo_score, 0) / n);
  return { seo, geo, aeo, total: Math.round((seo + geo + aeo) / 3), count: n };
}
