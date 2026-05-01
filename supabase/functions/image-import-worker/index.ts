import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { decode as decodeJpeg } from "https://esm.sh/@jsquash/jpeg@1.5.0";
import { decode as decodePng } from "https://esm.sh/@jsquash/png@3.0.1";
import { decode as decodeWebp, encode as encodeWebp } from "https://esm.sh/@jsquash/webp@1.4.0";
import resize from "https://esm.sh/@jsquash/resize@2.1.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUCKET = "post-images";
const MAX_WIDTH = 1600;
const QUALITY = 80;
const BATCH_PER_INVOCATION = 24;
const MAX_DOWNLOAD_BYTES = 25 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 18_000;
const FAST_WEBP_BYTES = 700 * 1024;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

type AssetRow = {
  id: string;
  source_url: string;
  alt_text: string | null;
  title: string | null;
};

type ReplacementAsset = {
  id: string;
  source_url: string;
  public_url: string;
  alt_text: string | null;
  title: string | null;
};

function cleanText(input: string | null | undefined): string {
  return (input || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(?:amp|nbsp|#160);/gi, " ")
    .replace(/&quot;/gi, " ")
    .replace(/&#039;|&apos;/gi, " ")
    .replace(/[^\p{L}\p{N}\s._-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(input: string): string {
  return cleanText(input)
    .toLowerCase()
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

async function shortHash(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-1", data);
  return Array.from(new Uint8Array(digest))
    .slice(0, 5)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function basenameFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const raw = decodeURIComponent(pathname.split("/").filter(Boolean).pop() || "image");
    return raw.replace(/-[0-9]{2,5}x[0-9]{2,5}(?=\.[a-z0-9]+$)/i, "");
  } catch {
    return "image";
  }
}

async function storagePath(asset: AssetRow, ext: string): Promise<{ path: string; seoSlug: string }> {
  const base =
    slugify(asset.title || "") ||
    slugify(asset.alt_text || "") ||
    slugify(basenameFromUrl(asset.source_url)) ||
    "wordpress-image";
  const hash = await shortHash(asset.source_url);
  const seoSlug = `${base}-${hash}`.slice(0, 105);
  return { path: `optimized/${seoSlug}.${ext}`, seoSlug };
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; LovableImageImporter/2.0; +https://lovable.dev)",
        Accept: "image/avif,image/webp,image/*,*/*;q=0.8",
      },
      redirect: "follow",
    });
  } finally {
    clearTimeout(t);
  }
}

function detectFormat(contentType: string | null, url: string): string {
  const ct = (contentType || "").toLowerCase();
  if (ct.includes("jpeg") || ct.includes("jpg")) return "jpeg";
  if (ct.includes("png")) return "png";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("gif")) return "gif";
  if (ct.includes("svg")) return "svg";
  const lower = url.toLowerCase().split("?")[0];
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "jpeg";
  if (lower.endsWith(".png")) return "png";
  if (lower.endsWith(".webp")) return "webp";
  if (lower.endsWith(".gif")) return "gif";
  if (lower.endsWith(".svg")) return "svg";
  return "unknown";
}

function mimeForFormat(format: string, fallback: string | null): string {
  if (format === "jpeg") return "image/jpeg";
  if (format === "png") return "image/png";
  if (format === "webp") return "image/webp";
  if (format === "gif") return "image/gif";
  if (format === "svg") return "image/svg+xml";
  return fallback || "application/octet-stream";
}

async function decodeImage(buf: ArrayBuffer, format: string): Promise<ImageData> {
  if (format === "jpeg") return await decodeJpeg(buf);
  if (format === "png") return await decodePng(buf);
  if (format === "webp") return await decodeWebp(buf);
  throw new Error(`Unsupported format: ${format}`);
}

async function optimizeToWebp(
  buf: ArrayBuffer,
  format: string,
): Promise<{ data: Uint8Array; width: number; height: number }> {
  let img = await decodeImage(buf, format);
  if (img.width > MAX_WIDTH) {
    const ratio = MAX_WIDTH / img.width;
    img = await resize(img, { width: MAX_WIDTH, height: Math.round(img.height * ratio) });
  }
  const encoded = await encodeWebp(img, { quality: QUALITY });
  return { data: new Uint8Array(encoded), width: img.width, height: img.height };
}

async function markAsset(assetId: string, values: Record<string, unknown>) {
  await admin.from("image_assets").update(values).eq("id", assetId);
}

async function processOne(asset: AssetRow): Promise<{ ok: boolean; skipped?: boolean; reason?: string }> {
  await markAsset(asset.id, {
    status: "processing",
    attempts: 1,
    last_attempt_at: new Date().toISOString(),
    error: null,
  });

  let res: Response;
  try {
    res = await fetchWithTimeout(asset.source_url);
  } catch (e) {
    return { ok: false, reason: `fetch failed: ${(e as Error).message}` };
  }

  if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };

  const contentType = res.headers.get("content-type");
  const contentLength = Number(res.headers.get("content-length") || 0);
  if (contentLength && contentLength > MAX_DOWNLOAD_BYTES) {
    return { ok: true, skipped: true, reason: "too large" };
  }

  const format = detectFormat(contentType, asset.source_url);
  if (!["jpeg", "png", "webp", "gif", "svg"].includes(format)) {
    return { ok: true, skipped: true, reason: "not an image" };
  }

  const original = await res.arrayBuffer();
  if (original.byteLength > MAX_DOWNLOAD_BYTES) {
    return { ok: true, skipped: true, reason: "too large" };
  }

  if (format === "svg" || format === "gif" || (format === "webp" && original.byteLength <= FAST_WEBP_BYTES)) {
    const ext = format === "svg" ? "svg" : format === "gif" ? "gif" : "webp";
    const { path, seoSlug } = await storagePath(asset, ext);
    const mimeType = mimeForFormat(format, contentType);
    const upRes = await admin.storage.from(BUCKET).upload(path, original, {
      contentType: mimeType,
      cacheControl: "31536000",
      upsert: true,
    });
    if (upRes.error) return { ok: false, reason: upRes.error.message };
    const pub = admin.storage.from(BUCKET).getPublicUrl(path);
    await markAsset(asset.id, {
      status: "done",
      storage_path: path,
      public_url: pub.data.publicUrl,
      format,
      mime_type: mimeType,
      seo_slug: seoSlug,
      bytes_original: original.byteLength,
      bytes_optimized: original.byteLength,
    });
    return { ok: true };
  }

  let optimized: { data: Uint8Array; width: number; height: number };
  try {
    optimized = await optimizeToWebp(original, format);
  } catch (e) {
    return { ok: false, reason: `optimize: ${(e as Error).message}` };
  }

  const { path, seoSlug } = await storagePath(asset, "webp");
  const upRes = await admin.storage.from(BUCKET).upload(path, optimized.data, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: true,
  });
  if (upRes.error) return { ok: false, reason: upRes.error.message };

  const pub = admin.storage.from(BUCKET).getPublicUrl(path);
  await markAsset(asset.id, {
    status: "done",
    storage_path: path,
    public_url: pub.data.publicUrl,
    format: "webp",
    mime_type: "image/webp",
    seo_slug: seoSlug,
    width: optimized.width,
    height: optimized.height,
    bytes_original: original.byteLength,
    bytes_optimized: optimized.data.byteLength,
  });

  return { ok: true };
}

function attrValue(tag: string, name: string): string | null {
  const re = new RegExp(`${name}\\s*=\\s*"([^"]*)"|${name}\\s*=\\s*'([^']*)'`, "i");
  const m = tag.match(re);
  return (m?.[1] ?? m?.[2] ?? null) || null;
}

function setAttr(tag: string, name: string, value: string): string {
  const escaped = value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const re = new RegExp(`\\s${name}\\s*=\\s*("[^"]*"|'[^']*')`, "i");
  if (re.test(tag)) return tag.replace(re, ` ${name}="${escaped}"`);
  return tag.replace(/<img/i, `<img ${name}="${escaped}"`);
}

function stripAttr(tag: string, name: string): string {
  const re = new RegExp(`\\s${name}\\s*=\\s*("[^"]*"|'[^']*')`, "gi");
  return tag.replace(re, "");
}

function rewriteHtml(body: string, assets: ReplacementAsset[]): { body: string; rewrites: number } {
  if (!body) return { body, rewrites: 0 };
  const byUrl = new Map(assets.map((a) => [a.source_url, a]));
  let rewrites = 0;
  const next = body.replace(/<img\b[^>]*>/gi, (tag) => {
    const candidates = ["src", "data-src", "data-lazy-src", "data-original"]
      .map((name) => attrValue(tag, name))
      .filter(Boolean) as string[];
    let asset = candidates.map((url) => byUrl.get(url)).find(Boolean) as ReplacementAsset | undefined;
    if (!asset) {
      for (const candidate of candidates) {
        asset = assets.find((a) => candidate.includes(a.source_url));
        if (asset) break;
      }
    }
    if (!asset) return tag;

    let newTag = tag;
    newTag = setAttr(newTag, "src", asset.public_url);
    newTag = stripAttr(newTag, "srcset");
    newTag = stripAttr(newTag, "sizes");
    newTag = stripAttr(newTag, "data-src");
    newTag = stripAttr(newTag, "data-lazy-src");
    newTag = stripAttr(newTag, "data-original");
    newTag = setAttr(newTag, "loading", "lazy");
    newTag = setAttr(newTag, "decoding", "async");
    if (!attrValue(newTag, "alt") && asset.alt_text) newTag = setAttr(newTag, "alt", asset.alt_text);
    if (!attrValue(newTag, "title") && asset.title) newTag = setAttr(newTag, "title", asset.title);
    rewrites++;
    return newTag;
  });
  return { body: next, rewrites };
}

async function applyReplacements(jobId: string): Promise<number> {
  const assets: ReplacementAsset[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin
      .from("image_assets")
      .select("id, source_url, public_url, alt_text, title")
      .eq("job_id", jobId)
      .eq("status", "done")
      .not("public_url", "is", null)
      .range(from, from + 999);
    if (error) throw error;
    assets.push(...((data || []) as ReplacementAsset[]));
    if (!data || data.length < 1000) break;
  }
  if (!assets.length) return 0;

  const byUrl = new Map(assets.map((a) => [a.source_url, a.public_url]));
  let totalRewrites = 0;
  for (let from = 0; ; from += 200) {
    const { data: posts, error } = await admin
      .from("imported_posts")
      .select("id, body, featured_image_url")
      .range(from, from + 199);
    if (error) throw error;
    if (!posts || posts.length === 0) break;

    for (const post of posts) {
      const originalBody = post.body || "";
      const rewritten = rewriteHtml(originalBody, assets);
      let featured = post.featured_image_url || null;
      if (featured && byUrl.has(featured)) {
        featured = byUrl.get(featured)!;
        rewritten.rewrites++;
      }
      if (rewritten.body !== originalBody || featured !== (post.featured_image_url || null)) {
        const { error: updateError } = await admin
          .from("imported_posts")
          .update({ body: rewritten.body, featured_image_url: featured })
          .eq("id", post.id);
        if (!updateError) totalRewrites += rewritten.rewrites;
      }
    }
    if (posts.length < 200) break;
  }

  await admin
    .from("image_assets")
    .update({ replaced_at: new Date().toISOString() })
    .eq("job_id", jobId)
    .eq("status", "done");

  await admin.from("image_import_jobs").update({ replacements: totalRewrites }).eq("id", jobId);
  return totalRewrites;
}

async function reinvoke(jobId: string) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/image-import-worker`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_ROLE}`,
        apikey: SERVICE_ROLE,
      },
      body: JSON.stringify({ job_id: jobId, continuation: true }),
    });
  } catch (e) {
    console.error("reinvoke failed:", e);
  }
}

async function processJob(jobId: string): Promise<{ done: boolean; processed: number; remaining: number }> {
  const { data: job } = await admin
    .from("image_import_jobs")
    .select("status")
    .eq("id", jobId)
    .maybeSingle();

  if (!job || job.status === "cancelled" || job.status === "completed") {
    return { done: true, processed: 0, remaining: 0 };
  }

  await admin
    .from("image_import_jobs")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", jobId)
    .is("started_at", null);

  await admin
    .from("image_assets")
    .update({ status: "pending", error: null })
    .eq("job_id", jobId)
    .eq("status", "processing")
    .lt("last_attempt_at", new Date(Date.now() - 5 * 60_000).toISOString());

  const { data: pending, error: pendErr } = await admin
    .from("image_assets")
    .select("id, source_url, alt_text, title")
    .eq("job_id", jobId)
    .eq("status", "pending")
    .limit(BATCH_PER_INVOCATION);

  if (pendErr) {
    await admin
      .from("image_import_jobs")
      .update({ status: "failed", log: pendErr.message, finished_at: new Date().toISOString() })
      .eq("id", jobId);
    return { done: true, processed: 0, remaining: 0 };
  }

  if (!pending || pending.length === 0) {
    const replacements = await applyReplacements(jobId).catch((e) => {
      console.error("replacement failed:", e);
      return 0;
    });
    await admin
      .from("image_import_jobs")
      .update({
        status: "completed",
        current_url: null,
        replacements,
        finished_at: new Date().toISOString(),
      })
      .eq("id", jobId);
    return { done: true, processed: 0, remaining: 0 };
  }

  let succeeded = 0;
  let failed = 0;
  let skipped = 0;
  let latestUrl: string | null = null;

  for (const asset of pending as AssetRow[]) {
    latestUrl = asset.source_url;
    try {
      const r = await processOne(asset);
      if (r.ok && r.skipped) {
        skipped++;
        await markAsset(asset.id, { status: "skipped", error: r.reason ?? null });
      } else if (r.ok) {
        succeeded++;
      } else {
        failed++;
        await markAsset(asset.id, { status: "failed", error: r.reason ?? "unknown error" });
      }
    } catch (e) {
      failed++;
      await markAsset(asset.id, { status: "failed", error: (e as Error).message });
    }
  }

  const { data: jobRow } = await admin
    .from("image_import_jobs")
    .select("processed, succeeded, failed, skipped")
    .eq("id", jobId)
    .maybeSingle();

  await admin
    .from("image_import_jobs")
    .update({
      current_url: latestUrl,
      processed: (jobRow?.processed ?? 0) + pending.length,
      succeeded: (jobRow?.succeeded ?? 0) + succeeded,
      failed: (jobRow?.failed ?? 0) + failed,
      skipped: (jobRow?.skipped ?? 0) + skipped,
    })
    .eq("id", jobId);

  const { count: remaining } = await admin
    .from("image_assets")
    .select("id", { count: "exact", head: true })
    .eq("job_id", jobId)
    .eq("status", "pending");

  if ((remaining ?? 0) > 0) {
    EdgeRuntime.waitUntil(reinvoke(jobId));
    return { done: false, processed: pending.length, remaining: remaining ?? 0 };
  }

  const replacements = await applyReplacements(jobId).catch((e) => {
    console.error("replacement failed:", e);
    return 0;
  });
  await admin
    .from("image_import_jobs")
    .update({
      status: "completed",
      current_url: null,
      replacements,
      finished_at: new Date().toISOString(),
    })
    .eq("id", jobId);
  return { done: true, processed: pending.length, remaining: 0 };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const jobId = typeof body?.job_id === "string" ? body.job_id : "";
    if (!jobId) {
      return new Response(JSON.stringify({ error: "job_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    EdgeRuntime.waitUntil(processJob(jobId));
    return new Response(JSON.stringify({ ok: true, accepted: true, job_id: jobId }), {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
