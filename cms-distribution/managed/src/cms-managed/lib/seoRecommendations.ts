// Actionable SEO recommendations engine. Consumes the same PageInput as
// seoScoring and returns prioritised, plain-English suggestions a writer
// can act on directly. Pure, client-side.

import type { PageInput, Check } from "./seoScoring";
import { scoreSeo, scoreGeo, scoreAeo } from "./seoScoring";

export type Recommendation = {
  id: string;
  area: "seo" | "geo" | "aeo" | "crawl";
  severity: "high" | "med" | "low";
  title: string;
  fix: string;
};

const fromCheck = (area: Recommendation["area"], c: Check, fix: string): Recommendation | null =>
  c.passed ? null : { id: `${area}:${c.id}`, area, severity: (c.severity || "med") as any, title: c.label, fix };

const FIXES: Record<string, string> = {
  title: "Write a title 30–60 characters that includes your focus keyword near the start.",
  desc: "Write a meta description 70–160 characters that summarises the page and includes the focus keyword.",
  h1: "Use exactly one H1 — usually the post title. Demote extra H1s to H2.",
  h2: "Break the content into at least 2 H2 sub-sections for scannability.",
  wc: "Expand the article to at least 300 words of useful, on-topic content.",
  alt: "Add descriptive alt text to every image — describe the subject, not the file name.",
  intlinks: "Add at least 2 internal links to related pages on your site.",
  extlinks: "Cite one authoritative external source to build trust.",
  slug: "Shorten the slug to lowercase, hyphenated words only (≤60 chars).",
  canonical: "Set a canonical URL to prevent duplicate-content issues.",
  og: "Add a 1200×630 social/OG image so links preview well on social platforms.",
  summary: "Open with a 1–2 sentence summary (80–320 chars) that directly answers the search intent.",
  sentence: "Shorten sentences — aim for an average of ≤22 words for readability.",
  headings: "Add more H2/H3 subheadings so LLMs and readers can scan the structure.",
  schema: "Add Schema.org JSON-LD (Article / BlogPosting) so search engines and AI understand the page.",
  citations: "Link to at least one authoritative external source to support claims.",
  author: "Show a visible byline so search engines can attribute authorship.",
  date: "Display the publish or last-updated date prominently.",
  lists: "Use bullet or numbered lists for steps and scannable points.",
  qheads: "Add at least 2 question-style H2/H3 headings (e.g. 'What is …?', 'How do I …?').",
  faq: "Add FAQPage or HowTo JSON-LD schema if the content fits.",
  answers: "Follow each question heading with a direct 1–2 sentence answer (40–280 chars).",
  tldr: "Add a TL;DR / quick-answer block near the top.",
  voice: "Use conversational pronouns (you, your, we) to match voice-search queries.",
};

export function recommendForPage(p: PageInput): Recommendation[] {
  const s = scoreSeo(p);
  const g = scoreGeo(p);
  const a = scoreAeo(p);
  const out: Recommendation[] = [];
  for (const c of s.checks) { const r = fromCheck("seo", c, FIXES[c.id] || c.label); if (r) out.push(r); }
  for (const c of g.checks) { const r = fromCheck("geo", c, FIXES[c.id] || c.label); if (r) out.push(r); }
  for (const c of a.checks) { const r = fromCheck("aeo", c, FIXES[c.id] || c.label); if (r) out.push(r); }
  const sevRank = { high: 0, med: 1, low: 2 } as const;
  return out.sort((x, y) => sevRank[x.severity] - sevRank[y.severity]);
}

// Lightweight crawlability sniff. Pass robots.txt / sitemap status as
// fetched by the caller (we don't fetch here to keep this pure).
export function recommendCrawl(opts: {
  robotsTxtOk: boolean;
  sitemapOk: boolean;
  indexable: boolean;
}): Recommendation[] {
  const out: Recommendation[] = [];
  if (!opts.robotsTxtOk) out.push({ id: "crawl:robots", area: "crawl", severity: "high", title: "robots.txt missing or invalid", fix: "Publish a valid /robots.txt that does not Disallow: /." });
  if (!opts.sitemapOk) out.push({ id: "crawl:sitemap", area: "crawl", severity: "high", title: "sitemap.xml missing", fix: "Publish /sitemap.xml and reference it from robots.txt." });
  if (!opts.indexable) out.push({ id: "crawl:noindex", area: "crawl", severity: "high", title: "Page is set to noindex", fix: "Remove the noindex robots flag from this page's SEO settings." });
  return out;
}
