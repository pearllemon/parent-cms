// Internal link graph + suggestion helpers.
// Pure functions over loaded content rows; persist via supabase.from("internal_links" | "link_suggestions").

import { supabase } from "@/integrations/supabase/client";

export type ContentRow = {
  url: string;
  title: string;
  slug: string;
  html: string;
  type: string;
  source: string;
};

export type LinkEdge = {
  source_url: string;
  target_url: string;
  anchor_text: string;
  is_external: boolean;
  source_type: string;
};

const ANCHOR_RE = /<a\b[^>]*\shref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

export function extractLinks(row: ContentRow): LinkEdge[] {
  const out: LinkEdge[] = [];
  const html = row.html || "";
  let m: RegExpExecArray | null;
  ANCHOR_RE.lastIndex = 0;
  while ((m = ANCHOR_RE.exec(html))) {
    const href = m[1].trim();
    const anchor = m[2].replace(/<[^>]+>/g, "").trim().slice(0, 200);
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
    const isExternal = /^https?:\/\//i.test(href) && !href.includes(typeof window !== "undefined" ? window.location.hostname : "deepak-shukla.lovable.app");
    out.push({
      source_url: row.url,
      target_url: href,
      anchor_text: anchor,
      is_external: isExternal,
      source_type: row.source,
    });
  }
  return out;
}

export function buildGraph(rows: ContentRow[]): { edges: LinkEdge[]; incoming: Map<string, LinkEdge[]>; outgoing: Map<string, LinkEdge[]>; orphans: ContentRow[] } {
  const edges: LinkEdge[] = [];
  const incoming = new Map<string, LinkEdge[]>();
  const outgoing = new Map<string, LinkEdge[]>();
  for (const r of rows) {
    const e = extractLinks(r);
    edges.push(...e);
    outgoing.set(r.url, e);
  }
  for (const e of edges) {
    if (e.is_external) continue;
    const path = normalizePath(e.target_url);
    if (!path) continue;
    const arr = incoming.get(path) || [];
    arr.push(e);
    incoming.set(path, arr);
  }
  const orphans = rows.filter((r) => !(incoming.get(r.url) || []).length && r.url !== "/");
  return { edges, incoming, outgoing, orphans };
}

function normalizePath(href: string): string {
  if (href.startsWith("/")) return href.split("?")[0].split("#")[0];
  try {
    const u = new URL(href);
    return u.pathname;
  } catch {
    return "";
  }
}

const STOPWORDS = new Set("a an and the of to for in on with is are was were be been by from as that this it your you our we i".split(" "));

function tokenize(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter((w) => w.length >= 4 && !STOPWORDS.has(w));
}

// Suggest internal links: for each content row, find rows whose title tokens
// appear in this row's body but aren't yet linked.
export type Suggestion = {
  source_url: string;
  target_url: string;
  anchor_text: string;
  reason: string;
  score: number;
};

export function generateSuggestions(rows: ContentRow[], graph: ReturnType<typeof buildGraph>, max = 200): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const byUrl = new Map(rows.map((r) => [r.url, r]));
  const titleIndex = rows.map((r) => ({ row: r, tokens: tokenize(r.title) })).filter((x) => x.tokens.length >= 1);

  for (const src of rows) {
    if (!src.html) continue;
    const body = src.html.toLowerCase();
    const existing = new Set((graph.outgoing.get(src.url) || []).map((e) => normalizePath(e.target_url)).filter(Boolean));
    for (const { row: tgt, tokens } of titleIndex) {
      if (tgt.url === src.url) continue;
      if (existing.has(tgt.url)) continue;
      // Look for the full title (lower) in body, else 2+ token match
      const titleLower = tgt.title.toLowerCase();
      let score = 0;
      let anchor = "";
      if (titleLower.length >= 4 && body.includes(titleLower)) {
        score = 1.0;
        anchor = tgt.title;
      } else {
        const hits = tokens.filter((t) => body.includes(t)).length;
        if (hits >= 2) {
          score = Math.min(0.9, hits / Math.max(tokens.length, 3));
          anchor = tgt.title;
        }
      }
      if (score >= 0.5) {
        suggestions.push({
          source_url: src.url,
          target_url: tgt.url,
          anchor_text: anchor,
          reason: score === 1.0 ? "Exact title match in body" : "Multiple title-keyword matches",
          score,
        });
      }
    }
  }
  suggestions.sort((a, b) => b.score - a.score);
  return suggestions.slice(0, max);
}

export async function persistGraph(edges: LinkEdge[]) {
  await (supabase.from("internal_links" as any) as any).delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (edges.length === 0) return;
  const chunks: LinkEdge[][] = [];
  for (let i = 0; i < edges.length; i += 500) chunks.push(edges.slice(i, i + 500));
  for (const c of chunks) {
    await (supabase.from("internal_links" as any) as any).insert(c);
  }
}

export async function persistSuggestions(items: Suggestion[]) {
  await (supabase.from("link_suggestions" as any) as any)
    .delete()
    .eq("status", "pending");
  if (items.length === 0) return;
  for (let i = 0; i < items.length; i += 500) {
    const c = items.slice(i, i + 500).map((s) => ({ ...s, status: "pending" }));
    await (supabase.from("link_suggestions" as any) as any).insert(c);
  }
}
