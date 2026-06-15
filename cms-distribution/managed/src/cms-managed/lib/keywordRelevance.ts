// Multi-keyword relevance scoring for the SEO focus keyword field.
// Parses comma-separated keywords and grades each against the
// title, description, slug, headings, and body. Returns a color
// (green/yellow/red) so the editor can render badges.

export type KeywordGrade = "green" | "yellow" | "red";

export type KeywordAnalysis = {
  keyword: string;
  grade: KeywordGrade;
  score: number; // 0-100
  hits: {
    title: boolean;
    description: boolean;
    slug: boolean;
    heading: boolean;
    body: boolean;
    density: number; // percentage in body
  };
  notes: string[];
};

export const parseKeywords = (raw: string | null | undefined): string[] => {
  if (!raw) return [];
  return raw
    .split(/[,\n;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12);
};

const re = (kw: string, flags = "i") =>
  new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags);

export function analyzeKeyword(
  keyword: string,
  ctx: { title: string; description: string; slug: string; html: string },
): KeywordAnalysis {
  const kw = keyword.trim();
  const text = (ctx.html || "").replace(/<[^>]+>/g, " ");
  const wordCount = text.split(/\s+/).filter(Boolean).length || 1;
  const titleMatch = re(kw).test(ctx.title || "");
  const descMatch = re(kw).test(ctx.description || "");
  const slugMatch = re(kw.replace(/\s+/g, "-")).test(ctx.slug || "");
  const headingMatch = new RegExp(`<h[1-6][^>]*>[^<]*${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^<]*</h[1-6]>`, "i").test(ctx.html || "");
  const bodyMatches = (text.toLowerCase().match(new RegExp(re(kw).source.toLowerCase(), "g")) || []).length;
  const density = (bodyMatches / wordCount) * 100;

  let score = 0;
  const notes: string[] = [];
  if (titleMatch) { score += 25; } else notes.push("Add to title");
  if (descMatch) { score += 20; } else notes.push("Add to meta description");
  if (slugMatch) { score += 10; } else notes.push("Add to URL slug");
  if (headingMatch) { score += 15; } else notes.push("Use in a subheading");
  if (bodyMatches > 0) {
    score += 15;
    if (density >= 0.3 && density <= 2.5) { score += 15; }
    else if (density > 2.5) notes.push(`Keyword density too high (${density.toFixed(1)}%)`);
    else notes.push(`Increase keyword density (now ${density.toFixed(2)}%)`);
  } else {
    notes.push("Not found in content body");
  }
  score = Math.max(0, Math.min(100, score));

  const grade: KeywordGrade = score >= 65 ? "green" : score >= 35 ? "yellow" : "red";
  return {
    keyword: kw,
    grade,
    score,
    hits: { title: titleMatch, description: descMatch, slug: slugMatch, heading: headingMatch, body: bodyMatches > 0, density },
    notes,
  };
}

export function analyzeKeywords(
  raw: string | null | undefined,
  ctx: { title: string; description: string; slug: string; html: string },
): KeywordAnalysis[] {
  return parseKeywords(raw).map((kw) => analyzeKeyword(kw, ctx));
}

export const gradeClass = (g: KeywordGrade) =>
  g === "green"
    ? "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/40 dark:text-green-300"
    : g === "yellow"
      ? "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-300"
      : "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-300";
