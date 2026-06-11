// Pure SEO/GEO/AEO scoring helpers used by the admin audit page.
//
// - SEO: traditional on-page checks (title length, meta description,
//   single h1, headings hierarchy, alt text, internal/external links,
//   word count, slug quality, canonical present).
// - GEO (Generative Engine Optimization): how friendly the page is to
//   LLM-powered search (clear summary, structured headings, factual
//   sentences, citations/links to sources, schema.org JSON-LD).
// - AEO (Answer Engine Optimization): Q&A friendliness — presence of
//   FAQ-style headings, short direct-answer paragraphs, lists/tables,
//   FAQPage schema.
//
// All functions are pure and run client-side. No DB access.

export type Check = {
  id: string;
  label: string;
  passed: boolean;
  weight: number; // 1..5
  detail?: string;
  severity?: "low" | "med" | "high";
};

export type ScoreResult = {
  score: number; // 0..100
  grade: "A" | "B" | "C" | "D" | "F";
  checks: Check[];
  passed: number;
  failed: number;
};

export type PageInput = {
  url: string;
  title?: string | null;
  description?: string | null;
  slug?: string | null;
  html?: string | null; // raw body HTML if available
  text?: string | null; // plaintext fallback
  schemaJson?: any; // optional JSON-LD object(s)
  canonical?: string | null;
  ogImage?: string | null;
};

const gradeFor = (s: number): ScoreResult["grade"] =>
  s >= 90 ? "A" : s >= 75 ? "B" : s >= 60 ? "C" : s >= 40 ? "D" : "F";

const tally = (checks: Check[]): ScoreResult => {
  const totalWeight = checks.reduce((a, c) => a + c.weight, 0) || 1;
  const got = checks.filter((c) => c.passed).reduce((a, c) => a + c.weight, 0);
  const score = Math.round((got / totalWeight) * 100);
  return {
    score,
    grade: gradeFor(score),
    checks,
    passed: checks.filter((c) => c.passed).length,
    failed: checks.filter((c) => !c.passed).length,
  };
};

const stripTags = (html: string) => html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ");

const wordCount = (s: string) => (s.trim().match(/\b[\w'-]+\b/g) || []).length;

const countMatches = (html: string, re: RegExp) => (html.match(re) || []).length;

const headings = (html: string) => {
  const h: Record<string, number> = { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 };
  for (const lvl of [1, 2, 3, 4, 5, 6]) {
    h[`h${lvl}`] = countMatches(html, new RegExp(`<h${lvl}\\b`, "gi"));
  }
  return h;
};

export function scoreSeo(p: PageInput): ScoreResult {
  const html = p.html || "";
  const text = p.text || stripTags(html);
  const wc = wordCount(text);
  const h = headings(html);
  const imgs = countMatches(html, /<img\b/gi);
  const imgsWithAlt = countMatches(html, /<img\b[^>]*\salt=["'][^"']+["']/gi);
  const internal = countMatches(html, /<a\b[^>]*\shref=["']\/[^"']*["']/gi);
  const external = countMatches(html, /<a\b[^>]*\shref=["']https?:\/\//gi);
  const titleLen = (p.title || "").trim().length;
  const descLen = (p.description || "").trim().length;
  const slug = (p.slug || "").toLowerCase();

  const checks: Check[] = [
    { id: "title", label: "Title 30–60 chars", weight: 5, passed: titleLen >= 30 && titleLen <= 60, detail: `${titleLen} chars`, severity: "high" },
    { id: "desc", label: "Meta description 70–160 chars", weight: 5, passed: descLen >= 70 && descLen <= 160, detail: `${descLen} chars`, severity: "high" },
    { id: "h1", label: "Exactly one H1", weight: 4, passed: h.h1 === 1, detail: `${h.h1} H1s`, severity: "high" },
    { id: "h2", label: "Has H2 sub-sections", weight: 3, passed: h.h2 >= 2, detail: `${h.h2} H2s` },
    { id: "wc", label: "≥ 300 words of content", weight: 4, passed: wc >= 300, detail: `${wc} words`, severity: "med" },
    { id: "alt", label: "All images have alt text", weight: 3, passed: imgs === 0 || imgsWithAlt === imgs, detail: `${imgsWithAlt}/${imgs} alt`, severity: "med" },
    { id: "intlinks", label: "≥ 2 internal links", weight: 3, passed: internal >= 2, detail: `${internal} internal` },
    { id: "extlinks", label: "≥ 1 external citation link", weight: 2, passed: external >= 1, detail: `${external} external` },
    { id: "slug", label: "Slug is clean & short", weight: 2, passed: !!slug && slug.length <= 60 && /^[a-z0-9-]+$/.test(slug), detail: slug || "—" },
    { id: "canonical", label: "Canonical URL set", weight: 3, passed: !!p.canonical, severity: "med" },
    { id: "og", label: "OG image set", weight: 1, passed: !!p.ogImage },
  ];

  return tally(checks);
}

export function scoreGeo(p: PageInput): ScoreResult {
  const html = p.html || "";
  const text = p.text || stripTags(html);
  const firstPara = (text.split(/\n+/).map((s) => s.trim()).find((s) => s.length > 0) || "").slice(0, 400);
  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.length > 0);
  const avgSentence = sentences.length ? Math.round(sentences.reduce((a, s) => a + s.split(/\s+/).length, 0) / sentences.length) : 0;
  const hasSchema = !!p.schemaJson && (Array.isArray(p.schemaJson) ? p.schemaJson.length > 0 : Object.keys(p.schemaJson).length > 0);
  const hasAuthorship = /\bby\s+[A-Z][a-z]+/.test(text) || /author/i.test(html);
  const hasDate = /\d{4}-\d{2}-\d{2}/.test(html) || /\b(20\d{2})\b/.test(text);
  const citationLinks = countMatches(html, /<a\b[^>]*\shref=["']https?:\/\//gi);
  const h = headings(html);
  const hasSummary = firstPara.length >= 80 && firstPara.length <= 320;
  const lists = countMatches(html, /<(ul|ol)\b/gi);

  const checks: Check[] = [
    { id: "summary", label: "Clear opening summary (80–320 chars)", weight: 5, passed: hasSummary, detail: `${firstPara.length} chars`, severity: "high" },
    { id: "sentence", label: "Avg sentence ≤ 22 words", weight: 3, passed: avgSentence > 0 && avgSentence <= 22, detail: `${avgSentence} w/sent` },
    { id: "headings", label: "Scannable structure (≥3 H2/H3)", weight: 4, passed: h.h2 + h.h3 >= 3, detail: `${h.h2 + h.h3} subheads` },
    { id: "schema", label: "Schema.org JSON-LD present", weight: 5, passed: hasSchema, severity: "high" },
    { id: "citations", label: "Cites external sources (≥1)", weight: 3, passed: citationLinks >= 1, detail: `${citationLinks} links` },
    { id: "author", label: "Author/byline detectable", weight: 2, passed: hasAuthorship },
    { id: "date", label: "Publish/update date visible", weight: 2, passed: hasDate },
    { id: "lists", label: "Uses lists for scannability", weight: 2, passed: lists >= 1, detail: `${lists} list(s)` },
  ];

  return tally(checks);
}

export function scoreAeo(p: PageInput): ScoreResult {
  const html = p.html || "";
  const text = p.text || stripTags(html);
  const questionHeads = (html.match(/<h[2-4][^>]*>[^<]*\?[^<]*<\/h[2-4]>/gi) || []).length;
  const faqSchema = (() => {
    if (!p.schemaJson) return false;
    const arr = Array.isArray(p.schemaJson) ? p.schemaJson : [p.schemaJson];
    return arr.some((s) => /FAQPage|QAPage|HowTo/i.test(s?.["@type"] || ""));
  })();
  const lists = countMatches(html, /<(ul|ol)\b/gi);
  const tables = countMatches(html, /<table\b/gi);
  // Detect short direct-answer paragraphs (40–280 chars) right after a question heading
  const directAnswers = (() => {
    const re = /<h[2-4][^>]*>([^<]*\?[^<]*)<\/h[2-4]>\s*<p[^>]*>([^<]{40,280})<\/p>/gi;
    return (html.match(re) || []).length;
  })();
  const hasTLDR = /\b(tl;dr|tldr|in short|quick answer|short answer)\b/i.test(text);
  const personalPronoun = /\b(you|your|we|our)\b/i.test(text);

  const checks: Check[] = [
    { id: "qheads", label: "Question-style headings (≥2)", weight: 5, passed: questionHeads >= 2, detail: `${questionHeads} Q-headings`, severity: "high" },
    { id: "faq", label: "FAQPage / HowTo schema", weight: 5, passed: faqSchema, severity: "high" },
    { id: "answers", label: "Direct answer after question (≥1)", weight: 4, passed: directAnswers >= 1, detail: `${directAnswers} pattern(s)` },
    { id: "lists", label: "Lists or steps present", weight: 2, passed: lists >= 1 || tables >= 1 },
    { id: "tldr", label: "TL;DR / short-answer block", weight: 2, passed: hasTLDR },
    { id: "voice", label: "Conversational voice (you/we)", weight: 2, passed: personalPronoun },
  ];

  return tally(checks);
}

export function scoreAll(p: PageInput) {
  return { seo: scoreSeo(p), geo: scoreGeo(p), aeo: scoreAeo(p) };
}

// Truncation helpers for previews
export const truncate = (s: string, max: number) => (s.length <= max ? s : s.slice(0, max - 1).trimEnd() + "…");
