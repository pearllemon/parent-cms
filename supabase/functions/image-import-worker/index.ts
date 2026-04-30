// Background worker that downloads, optimizes (resize + WebP), uploads to
// Lovable Cloud storage, and updates progress in real-time.
// Self-reinvokes via fetch() so a single job can process thousands of images
// without hitting per-invocation time limits.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { decode as decodeJpeg } from "https://esm.sh/@jsquash/jpeg@1.5.0";
import { decode as decodePng } from "https://esm.sh/@jsquash/png@3.0.1";
import { decode as decodeWebp, encode as encodeWebp } from "https://esm.sh/@jsquash/webp@1.4.0";
import resize from "https://esm.sh/@jsquash/resize@2.1.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUCKET = "post-images";
const MAX_WIDTH = 1600;
const QUALITY = 80;
// Process at most this many images per invocation, then re-invoke ourselves.
const BATCH_PER_INVOCATION = 12;
// Skip anything bigger than this to avoid OOM (raw download).
const MAX_DOWNLOAD_BYTES = 25 * 1024 * 1024; // 25 MB
const FETCH_TIMEOUT_MS = 20_000;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

function slugifyKey(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: ctrl.signal,
      headers: {
        // Some hosts block default UA
        "User-Agent":
          "Mozilla/5.0 (compatible; LovableImporter/1.0; +https://lovable.dev)",
        Accept: "image/*,*/*;q=0.8",
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

async function decodeImage(
  buf: ArrayBuffer,
  format: string,
): Promise<ImageData> {
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
    const newH = Math.round(img.height * ratio);
    img = await resize(img, { width: MAX_WIDTH, height: newH });
  }
  const encoded = await encodeWebp(img, { quality: QUALITY });
  return {
    data: new Uint8Array(encoded),
    width: img.width,
    height: img.height,
  };
}

async function processOne(
  jobId: string,
  asset: { id: string; source_url: string; alt_text: string | null; title: string | null },
): Promise<{ ok: boolean; skipped?: boolean; reason?: string }> {
  const url = asset.source_url;

  // Try HEAD first to early-skip too-large or non-image files
  let res: Response;
  try {
    res = await fetchWithTimeout(url);
  } catch (e) {
    return { ok: false, reason: `fetch failed: ${(e as Error).message}` };
  }

  if (!res.ok) {
    return { ok: false, reason: `HTTP ${res.status}` };
  }

  const contentType = res.headers.get("content-type");
  const contentLength = Number(res.headers.get("content-length") || 0);
  if (contentLength && contentLength > MAX_DOWNLOAD_BYTES) {
    return { ok: true, skipped: true, reason: "too large" };
  }

  const format = detectFormat(contentType, url);
  if (format === "svg" || format === "gif" || format === "unknown") {
    // Pass through SVG/GIF/unknown without optimization (still re-host)
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_DOWNLOAD_BYTES) {
      return { ok: true, skipped: true, reason: "too large" };
    }
    const ext = format === "svg" ? "svg" : format === "gif" ? "gif" : "bin";
    const path = `${slugifyKey(asset.id)}.${ext}`;
    const upRes = await admin.storage.from(BUCKET).upload(path, buf, {
      contentType: contentType || "application/octet-stream",
      upsert: true,
    });
    if (upRes.error) {
      return { ok: false, reason: upRes.error.message };
    }
    const pub = admin.storage.from(BUCKET).getPublicUrl(path);
    await admin
      .from("image_assets")
      .update({
        status: "done",
        storage_path: path,
        public_url: pub.data.publicUrl,
        format,
        bytes_original: buf.byteLength,
        bytes_optimized: buf.byteLength,
      })
      .eq("id", asset.id);
    return { ok: true };
  }

  const original = await res.arrayBuffer();
  if (original.byteLength > MAX_DOWNLOAD_BYTES) {
    return { ok: true, skipped: true, reason: "too large" };
  }

  let optimized: { data: Uint8Array; width: number; height: number };
  try {
    optimized = await optimizeToWebp(original, format);
  } catch (e) {
    return { ok: false, reason: `optimize: ${(e as Error).message}` };
  }

  const path = `${slugifyKey(asset.id)}.webp`;
  const upRes = await admin.storage.from(BUCKET).upload(path, optimized.data, {
    contentType: "image/webp",
    upsert: true,
  });
  if (upRes.error) {
    return { ok: false, reason: upRes.error.message };
  }
  const pub = admin.storage.from(BUCKET).getPublicUrl(path);

  await admin
    .from("image_assets")
    .update({
      status: "done",
      storage_path: path,
      public_url: pub.data.publicUrl,
      format: "webp",
      width: optimized.width,
      height: optimized.height,
      bytes_original: original.byteLength,
      bytes_optimized: optimized.data.byteLength,
    })
    .eq("id", asset.id);

  return { ok: true };
}

async function reinvoke(jobId: string) {
  // Fire-and-forget self-call so the next batch picks up where we left off
  try {
    await fetch(
      `${SUPABASE_URL}/functions/v1/image-import-worker`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_ROLE}`,
        },
        body: JSON.stringify({ job_id: jobId, _continuation: true }),
      },
    );
  } catch (e) {
    console.error("reinvoke failed:", e);
  }
}

async function processJob(jobId: string): Promise<{
  done: boolean;
  processed: number;
  remaining: number;
}> {
  // Mark running
  await admin
    .from("image_import_jobs")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", jobId)
    .is("started_at", null);

  // Pull next batch of pending assets
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
    // Nothing to do — finalize
    const { data: counts } = await admin
      .from("image_assets")
      .select("status", { count: "exact" })
      .eq("job_id", jobId);
    const { count: remaining } = await admin
      .from("image_assets")
      .select("id", { count: "exact", head: true })
      .eq("job_id", jobId)
      .eq("status", "pending");
    if ((remaining ?? 0) === 0) {
      await admin
        .from("image_import_jobs")
        .update({
          status: "completed",
          finished_at: new Date().toISOString(),
          current_url: null,
        })
        .eq("id", jobId);
    }
    return { done: true, processed: 0, remaining: remaining ?? 0 };
  }

  let succeeded = 0;
  let failed = 0;
  let skipped = 0;
  for (const asset of pending) {
    await admin
      .from("image_import_jobs")
      .update({ current_url: asset.source_url })
      .eq("id", jobId);
    try {
      const r = await processOne(jobId, asset);
      if (r.ok && r.skipped) {
        skipped++;
        await admin
          .from("image_assets")
          .update({ status: "skipped", error: r.reason ?? null })
          .eq("id", asset.id);
      } else if (r.ok) {
        succeeded++;
      } else {
        failed++;
        await admin
          .from("image_assets")
          .update({ status: "failed", error: r.reason ?? "unknown error" })
          .eq("id", asset.id);
      }
    } catch (e) {
      failed++;
      await admin
        .from("image_assets")
        .update({ status: "failed", error: (e as Error).message })
        .eq("id", asset.id);
    }
  }

  // Increment counters atomically via raw RPC-style update
  const { data: jobRow } = await admin
    .from("image_import_jobs")
    .select("processed, succeeded, failed, skipped")
    .eq("id", jobId)
    .maybeSingle();

  await admin
    .from("image_import_jobs")
    .update({
      processed: (jobRow?.processed ?? 0) + pending.length,
      succeeded: (jobRow?.succeeded ?? 0) + succeeded,
      failed: (jobRow?.failed ?? 0) + failed,
      skipped: (jobRow?.skipped ?? 0) + skipped,
    })
    .eq("id", jobId);

  // Check remaining
  const { count: remaining } = await admin
    .from("image_assets")
    .select("id", { count: "exact", head: true })
    .eq("job_id", jobId)
    .eq("status", "pending");

  if ((remaining ?? 0) > 0) {
    // Schedule next batch and return immediately so this invocation can finish
    EdgeRuntime.waitUntil(reinvoke(jobId));
    return { done: false, processed: pending.length, remaining: remaining ?? 0 };
  }

  await admin
    .from("image_import_jobs")
    .update({
      status: "completed",
      finished_at: new Date().toISOString(),
      current_url: null,
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
    const jobId = body?.job_id;
    if (!jobId) {
      return new Response(JSON.stringify({ error: "job_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const result = await processJob(jobId);
    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
