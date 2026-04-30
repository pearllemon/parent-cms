import { supabase } from "@/integrations/supabase/client";

export type ImageRef = {
  url: string;
  alt: string | null;
  title: string | null;
};

const ABSOLUTE = /^https?:\/\//i;
// Allow common image extensions; ignore data: and tracking pixels.
const IMG_RE = /<img\b[^>]*>/gi;

function pickAttr(tag: string, name: string): string | null {
  const re = new RegExp(`${name}\\s*=\\s*"([^"]*)"|${name}\\s*=\\s*'([^']*)'`, "i");
  const m = tag.match(re);
  return (m?.[1] ?? m?.[2] ?? null) || null;
}

/** Walk HTML body, return every <img src/alt/title>. Absolute URLs only. */
export function extractImagesFromHtml(html: string): ImageRef[] {
  if (!html) return [];
  const out: ImageRef[] = [];
  const seen = new Set<string>();
  const matches = html.match(IMG_RE) || [];
  for (const tag of matches) {
    const src = pickAttr(tag, "src");
    if (!src) continue;
    if (src.startsWith("data:") || src.startsWith("blob:")) continue;
    if (!ABSOLUTE.test(src)) continue;
    if (seen.has(src)) continue;
    seen.add(src);
    out.push({
      url: src,
      alt: pickAttr(tag, "alt"),
      title: pickAttr(tag, "title"),
    });
  }
  return out;
}

/**
 * Scan all imported_posts bodies + featured images and return the unique set
 * of <img> URLs that are actually USED. (Skips orphan media library files.)
 */
export async function collectUsedImagesFromImportedPosts(): Promise<ImageRef[]> {
  const all: ImageRef[] = [];
  const PAGE = 500;
  let from = 0;
  // paginate in case of thousands of posts
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await supabase
      .from("imported_posts")
      .select("title, body, featured_image_url")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const row of data) {
      const fromBody = extractImagesFromHtml(row.body || "");
      all.push(...fromBody);
      if (row.featured_image_url && ABSOLUTE.test(row.featured_image_url)) {
        all.push({
          url: row.featured_image_url,
          alt: row.title || null,
          title: row.title || null,
        });
      }
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }
  // de-dupe by URL, prefer entries that have alt text
  const map = new Map<string, ImageRef>();
  for (const ref of all) {
    const existing = map.get(ref.url);
    if (!existing) {
      map.set(ref.url, ref);
    } else if (!existing.alt && ref.alt) {
      map.set(ref.url, ref);
    }
  }
  return Array.from(map.values());
}

/** Create a job + asset rows; returns the job id. Skips URLs already imported. */
export async function queueImageImportJob(refs: ImageRef[]): Promise<{
  jobId: string;
  queued: number;
  alreadyDone: number;
}> {
  const { data: sess } = await supabase.auth.getSession();
  const userId = sess?.session?.user?.id ?? null;

  // Find URLs already processed (status=done) so we don't redo work
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

  // Create the job
  const { data: jobRow, error: jobErr } = await supabase
    .from("image_import_jobs")
    .insert({
      total: toQueue.length,
      status: "pending",
      created_by: userId,
    })
    .select("id")
    .single();
  if (jobErr || !jobRow) throw jobErr || new Error("Failed to create job");
  const jobId = jobRow.id;

  // Insert assets in batches; use upsert on source_url so duplicates from a
  // previous failed run get re-attached to this job and re-tried.
  const INS = 200;
  for (let i = 0; i < toQueue.length; i += INS) {
    const chunk = toQueue.slice(i, i + INS).map((r) => ({
      job_id: jobId,
      source_url: r.url,
      alt_text: r.alt,
      title: r.title,
      status: "pending" as const,
      error: null,
    }));
    const { error } = await supabase
      .from("image_assets")
      .upsert(chunk, { onConflict: "source_url" });
    if (error) throw error;
  }

  // Kick off the worker (fire-and-forget)
  await supabase.functions.invoke("image-import-worker", {
    body: { job_id: jobId },
  });

  return { jobId, queued: toQueue.length, alreadyDone: alreadyDoneSet.size };
}

/**
 * After images finish, rewrite all imported_posts bodies and featured_image_url
 * to use the optimized stored URLs.
 */
export async function rewritePostImageUrls(): Promise<{
  postsUpdated: number;
  rewrites: number;
}> {
  // Build map: source_url -> public_url
  const map = new Map<string, string>();
  const PAGE = 1000;
  let from = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await supabase
      .from("image_assets")
      .select("source_url, public_url, alt_text")
      .eq("status", "done")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const a of data) {
      if (a.public_url) map.set(a.source_url, a.public_url);
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }
  if (map.size === 0) return { postsUpdated: 0, rewrites: 0 };

  let postsUpdated = 0;
  let rewrites = 0;
  let pFrom = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data: posts, error } = await supabase
      .from("imported_posts")
      .select("id, body, featured_image_url")
      .range(pFrom, pFrom + 200 - 1);
    if (error) throw error;
    if (!posts || posts.length === 0) break;

    for (const p of posts) {
      let body = p.body || "";
      let featured = p.featured_image_url || "";
      let changed = false;
      // body rewrites
      const tags = body.match(IMG_RE) || [];
      for (const tag of tags) {
        const src = pickAttr(tag, "src");
        if (src && map.has(src)) {
          const newSrc = map.get(src)!;
          // Replace src AND ensure alt exists
          let newTag = tag.replace(
            /(src\s*=\s*["'])[^"']+(["'])/i,
            `$1${newSrc}$2`,
          );
          const hasAlt = /\balt\s*=/.test(newTag);
          if (!hasAlt) newTag = newTag.replace(/<img/i, `<img alt=""`);
          // Add loading="lazy" if missing
          if (!/\bloading\s*=/.test(newTag)) {
            newTag = newTag.replace(/<img/i, `<img loading="lazy"`);
          }
          body = body.replace(tag, newTag);
          rewrites++;
          changed = true;
        }
      }
      if (featured && map.has(featured)) {
        featured = map.get(featured)!;
        rewrites++;
        changed = true;
      }
      if (changed) {
        await supabase
          .from("imported_posts")
          .update({ body, featured_image_url: featured })
          .eq("id", p.id);
        postsUpdated++;
      }
    }
    if (posts.length < 200) break;
    pFrom += 200;
  }
  return { postsUpdated, rewrites };
}
