import { supabase } from "@/integrations/supabase/client";

export type ImageRef = {
  url: string;
  alt: string | null;
  title: string | null;
};

export type ImageJobSummary = {
  id: string;
  status: string;
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  replacements?: number;
};

const ABSOLUTE = /^https?:\/\//i;
const WP_UPLOADS = /\/wp-content\/uploads\//i;
const IMG_RE = /<img\b[^>]*>/gi;

const SITE_IMAGE_REFS: ImageRef[] = [
  { url: "https://deepakshukla.com/wp-content/uploads/2024/08/Heading-4.png", alt: "Deepak Shukla", title: "Deepak Shukla" },
  { url: "https://deepakshukla.com/wp-content/uploads/2018/06/Logo-DS-New-.webp", alt: "Deepak Shukla logo", title: "Deepak Shukla Logo" },
  { url: "https://deepakshukla.com/wp-content/uploads/2024/08/Deepak-Shukla.png", alt: "Deepak Shukla", title: "Deepak Shukla" },
  { url: "https://deepakshukla.com/wp-content/uploads/2024/08/sales-expert.png", alt: "Sales Expert London", title: "Sales Expert London" },
  { url: "https://deepakshukla.com/wp-content/uploads/2024/08/JSHFJS.png", alt: "Growth Hacking Expert London", title: "Growth Hacking Expert London" },
  { url: "https://deepakshukla.com/wp-content/uploads/2024/08/3rd-by-me.png", alt: "Digital Marketing Expert", title: "Digital Marketing Expert" },
  { url: "https://deepakshukla.com/wp-content/uploads/2024/08/1sr.png", alt: "Communications Consultant", title: "Communications Consultant" },
  { url: "https://deepakshukla.com/wp-content/uploads/2024/08/5th-11.png", alt: "Sales Trainer London", title: "Sales Trainer London" },
  { url: "https://deepakshukla.com/wp-content/uploads/2024/08/Negative-Seo.png", alt: "Negative SEO Removal", title: "Negative SEO Removal" },
  { url: "https://deepakshukla.com/wp-content/uploads/2024/08/4th-11.png", alt: "Google Analytics Expert", title: "Google Analytics Expert" },
  { url: "https://deepakshukla.com/wp-content/uploads/2024/08/6th-11.png", alt: "Google Search Console Expert", title: "Google Search Console Expert" },
  { url: "https://deepakshukla.com/wp-content/uploads/2024/08/BLUE.png", alt: "Heatmaps Expert", title: "Heatmaps Expert" },
  { url: "https://deepakshukla.com/wp-content/uploads/2024/08/0828-1.gif", alt: "Deepak Shukla", title: "Deepak Shukla" },
  { url: "https://deepakshukla.com/wp-content/uploads/2024/08/Team-Picture-3.webp", alt: "Deepak Shukla team", title: "Deepak Shukla Team" },
  { url: "https://deepakshukla.com/wp-content/uploads/2021/06/image1.png", alt: "Entrepreneurship and wealth", title: "Entrepreneurship and Wealth" },
  { url: "https://deepakshukla.com/wp-content/uploads/2021/06/uk-money-1024x683.jpg", alt: "UK money", title: "UK Money" },
  { url: "https://deepakshukla.com/wp-content/uploads/2021/06/uk-property-1024x683.jpg", alt: "UK property", title: "UK Property" },
  { url: "https://deepakshukla.com/wp-content/uploads/2021/11/hire-1024x683.jpg", alt: "Hiring", title: "Hiring" },
  { url: "https://deepakshukla.com/wp-content/uploads/2021/06/image6-768x744.png", alt: "Adventure", title: "Adventure" },
  { url: "https://deepakshukla.com/wp-content/uploads/2026/02/My-4-Marathons-in-4-Weeks-683x1024.webp", alt: "My 4 Marathons in 4 Weeks", title: "My 4 Marathons in 4 Weeks" },
  { url: "https://deepakshukla.com/wp-content/uploads/2026/02/My-Muay-Thai-Fight-in-Rio.webp", alt: "My Muay Thai Fight in Rio", title: "My Muay Thai Fight in Rio" },
  { url: "https://deepakshukla.com/wp-content/uploads/2026/02/My-First-Triathlon-in-Lausanne-e1772131674159-688x1024.webp", alt: "My First Triathlon in Lausanne", title: "My First Triathlon in Lausanne" },
  { url: "https://deepakshukla.com/wp-content/uploads/2026/02/My-First-Triathlon-in-Lausanne-Part-2-1024x683.webp", alt: "My First Triathlon in Lausanne Part 2", title: "My First Triathlon in Lausanne Part 2" },
  { url: "https://deepakshukla.com/wp-content/uploads/2021/06/image5-768x744.jpg", alt: "Story of my life", title: "Story of My Life" },
  { url: "https://deepakshukla.com/wp-content/uploads/2022/12/kony-7VTeOoVXehA-unsplash-768x512.jpg", alt: "Story of my life", title: "Story of My Life" },
  { url: "https://deepakshukla.com/wp-content/uploads/2022/12/word-image-16482-1-1-768x1205.jpeg", alt: "Story of my life", title: "Story of My Life" },
  { url: "https://deepakshukla.com/wp-content/uploads/2022/12/1-1-768x576.jpg", alt: "Story of my life", title: "Story of My Life" },
  { url: "https://deepakshukla.com/wp-content/uploads/2022/11/Untitled-768x1152.jpg", alt: "Story of my life", title: "Story of My Life" },
  { url: "https://deepakshukla.com/wp-content/uploads/2022/12/Untitled-7.jpg", alt: "Story of my life", title: "Story of My Life" },
  { url: "https://deepakshukla.com/wp-content/uploads/2022/12/1-2.jpg", alt: "Story of my life", title: "Story of My Life" },
  { url: "https://deepakshukla.com/wp-content/uploads/2026/02/Entreprenuer.webp", alt: "Entrepreneur", title: "Entrepreneur" },
  { url: "https://deepakshukla.com/wp-content/uploads/2026/02/inc.webp", alt: "Inc", title: "Inc" },
  { url: "https://deepakshukla.com/wp-content/uploads/2019/01/download-1.png", alt: "Search Engine Journal", title: "Search Engine Journal" },
  { url: "https://deepakshukla.com/wp-content/uploads/2018/06/tedx.png", alt: "TEDx", title: "TEDx" },
  { url: "https://deepakshukla.com/wp-content/uploads/2018/06/semrush-1.png", alt: "Semrush", title: "Semrush" },
  { url: "https://deepakshukla.com/wp-content/uploads/2020/10/huffington-post.png", alt: "Huffington Post", title: "Huffington Post" },
  { url: "https://deepakshukla.com/wp-content/uploads/2018/06/white-bbc-1.png", alt: "BBC", title: "BBC" },
  { url: "https://deepakshukla.com/wp-content/uploads/2018/10/Deloitte.png", alt: "Deloitte", title: "Deloitte" },
  { url: "https://deepakshukla.com/wp-content/uploads/2018/10/white-appsumo.png", alt: "AppSumo", title: "AppSumo" },
];

function pickAttr(tag: string, name: string): string | null {
  const re = new RegExp(`${name}\\s*=\\s*"([^"]*)"|${name}\\s*=\\s*'([^']*)'`, "i");
  const m = tag.match(re);
  return (m?.[1] ?? m?.[2] ?? null) || null;
}

function firstSrcsetUrl(srcset: string | null): string | null {
  if (!srcset) return null;
  return srcset.split(",")[0]?.trim().split(/\s+/)[0] || null;
}

function cleanMeta(input: string | null): string | null {
  const cleaned = (input || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return cleaned || null;
}

function addUnique(map: Map<string, ImageRef>, ref: ImageRef) {
  if (!ABSOLUTE.test(ref.url) || ref.url.startsWith("data:") || ref.url.startsWith("blob:")) return;
  const existing = map.get(ref.url);
  if (!existing) {
    map.set(ref.url, { url: ref.url, alt: cleanMeta(ref.alt), title: cleanMeta(ref.title) });
    return;
  }
  map.set(ref.url, {
    url: ref.url,
    alt: existing.alt || cleanMeta(ref.alt),
    title: existing.title || cleanMeta(ref.title),
  });
}

/** Walk HTML body, returning every absolute image URL actually referenced by content. */
export function extractImagesFromHtml(html: string): ImageRef[] {
  if (!html) return [];
  const map = new Map<string, ImageRef>();
  const matches = html.match(IMG_RE) || [];
  for (const tag of matches) {
    const alt = pickAttr(tag, "alt");
    const title = pickAttr(tag, "title") || alt;
    const urls = [
      pickAttr(tag, "src"),
      pickAttr(tag, "data-src"),
      pickAttr(tag, "data-lazy-src"),
      pickAttr(tag, "data-original"),
      firstSrcsetUrl(pickAttr(tag, "srcset")),
    ].filter(Boolean) as string[];
    urls.forEach((url) => addUnique(map, { url, alt, title }));
  }
  return Array.from(map.values());
}

export async function collectUsedImagesFromImportedPosts(options: { includeSiteImages?: boolean } = {}): Promise<ImageRef[]> {
  const map = new Map<string, ImageRef>();
  const PAGE = 500;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("imported_posts")
      .select("title, body, featured_image_url, raw")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const row of data) {
      extractImagesFromHtml(row.body || "").forEach((ref) => addUnique(map, ref));
      if (row.featured_image_url && ABSOLUTE.test(row.featured_image_url)) {
        addUnique(map, {
          url: row.featured_image_url,
          alt: row.title || null,
          title: row.title || null,
        });
      }
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }
  if (options.includeSiteImages) SITE_IMAGE_REFS.forEach((ref) => addUnique(map, ref));
  return Array.from(map.values());
}

async function invokeWorker(jobId: string) {
  await supabase.functions.invoke("image-import-worker", { body: { job_id: jobId } });
}

export async function resumeImageImportJob(jobId: string): Promise<void> {
  await supabase.from("image_import_jobs").update({ status: "pending", log: null }).eq("id", jobId);
  await invokeWorker(jobId);
}

export async function queueImageImportJob(refs: ImageRef[]): Promise<{
  jobId: string;
  queued: number;
  alreadyDone: number;
  resumed: boolean;
}> {
  const { data: sess } = await supabase.auth.getSession();
  const userId = sess?.session?.user?.id ?? null;

  const { data: activeJob } = await supabase
    .from("image_import_jobs")
    .select("id,status,total,processed")
    .in("status", ["pending", "running"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeJob?.id) {
    await resumeImageImportJob(activeJob.id);
    return { jobId: activeJob.id, queued: Math.max(0, (activeJob.total || 0) - (activeJob.processed || 0)), alreadyDone: 0, resumed: true };
  }

  const urls = refs.map((r) => r.url);
  const alreadyDoneSet = new Set<string>();
  const CHUNK = 500;
  for (let i = 0; i < urls.length; i += CHUNK) {
    const slice = urls.slice(i, i + CHUNK);
    const { data } = await supabase
      .from("image_assets")
      .select("source_url, status")
      .in("source_url", slice);
    (data || []).forEach((row) => {
      if (row.status === "done") alreadyDoneSet.add(row.source_url);
    });
  }

  const toQueue = refs.filter((r) => !alreadyDoneSet.has(r.url));
  const { data: jobRow, error: jobErr } = await supabase
    .from("image_import_jobs")
    .insert({ total: toQueue.length, status: "pending", created_by: userId })
    .select("id")
    .single();
  if (jobErr || !jobRow) throw jobErr || new Error("Failed to create job");
  const jobId = jobRow.id;

  const INS = 200;
  for (let i = 0; i < toQueue.length; i += INS) {
    const chunk = toQueue.slice(i, i + INS).map((r) => ({
      job_id: jobId,
      source_url: r.url,
      alt_text: r.alt,
      title: r.title || r.alt,
      status: "pending" as const,
      error: null,
    }));
    const { error } = await supabase.from("image_assets").upsert(chunk, { onConflict: "source_url" });
    if (error) throw error;
  }

  await invokeWorker(jobId);
  return { jobId, queued: toQueue.length, alreadyDone: alreadyDoneSet.size, resumed: false };
}

export async function rewritePostImageUrls(jobId?: string): Promise<{
  postsUpdated: number;
  rewrites: number;
}> {
  const { data, error } = await supabase.rpc("apply_image_asset_replacements", {
    _job_id: jobId || null,
  } as never);
  if (error) throw error;
  return { postsUpdated: Number(data || 0), rewrites: Number(data || 0) };
}

export function isWordPressImageUrl(url: string | null | undefined): boolean {
  return Boolean(url && WP_UPLOADS.test(url));
}
