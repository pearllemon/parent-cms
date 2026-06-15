// SDK bundle upload — admin pastes/uploads a built engine bundle (.js),
// it's stored in the cms-sdk bucket, and the public URL is attached to the release.

import { supabase } from "@/integrations/supabase/client";

export async function uploadSdkBundle(version: string, file: File | Blob): Promise<string> {
  const path = `${version}/cms-core.js`;
  const { error } = await supabase.storage
    .from("cms-sdk")
    .upload(path, file, {
      cacheControl: "31536000, immutable",
      upsert: true,
      contentType: "application/javascript",
    });
  if (error) throw error;
  // Signed URL valid for 10 years (effectively permanent) since bucket is private
  const { data, error: signErr } = await supabase.storage
    .from("cms-sdk")
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (signErr) throw signErr;
  return data.signedUrl;
}

export async function uploadReleasePackage(version: string, file: File | Blob): Promise<string> {
  const path = `${version}/parent-cms-${version}.zip`;
  const { error } = await supabase.storage
    .from("cms-sdk")
    .upload(path, file, {
      cacheControl: "31536000, immutable",
      upsert: true,
      contentType: "application/zip",
    });
  if (error) throw error;
  const { data, error: signErr } = await supabase.storage
    .from("cms-sdk")
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (signErr) throw signErr;
  return data.signedUrl;
}

export async function updateReleaseSdkUrl(releaseId: string, sdk_url: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const { error } = await db.from("cms_releases").update({ sdk_url }).eq("id", releaseId);
  if (error) throw error;
}

export async function updateReleasePackageMeta(
  releaseId: string,
  meta: { package_url: string; package_sha256: string; package_size: number; package_format?: string },
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const { error } = await db.from("cms_releases").update({
    package_url: meta.package_url,
    package_sha256: meta.package_sha256,
    package_size: meta.package_size,
    package_format: meta.package_format || "zip",
  }).eq("id", releaseId);
  if (error) throw error;
}

/* ---------- Admin runtime bundle (the file children dynamically import) ---------- */

async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export type BundleCaptureResult = {
  bundle_url: string;
  bundle_sha256: string;
  bundle_size: number;
  bundle_css_url: string | null;
};

/**
 * Capture the admin bundle that's currently being served from THIS parent
 * deploy (`/admin-bundle/admin.js` + `/admin-bundle/admin.css`), upload it
 * to the cms-sdk storage bucket under the release version, and return the
 * signed immutable URLs + sha256 of the JS.
 *
 * Run `bun run build:admin` locally and deploy before clicking the button
 * that calls this — otherwise we capture stale bytes.
 */
export async function captureAndUploadAdminBundle(version: string): Promise<BundleCaptureResult> {
  const jsResp = await fetch("/admin-bundle/admin.js", { cache: "no-store" });
  if (!jsResp.ok) {
    throw new Error(
      `/admin-bundle/admin.js not found (${jsResp.status}). Run \`bun run build:admin\` and redeploy first.`,
    );
  }
  const jsBytes = await jsResp.arrayBuffer();
  const bundle_sha256 = await sha256Hex(jsBytes);
  const bundle_size = jsBytes.byteLength;

  const jsPath = `${version}/admin-${bundle_sha256.slice(0, 12)}.js`;
  const { error: jsErr } = await supabase.storage.from("cms-sdk").upload(
    jsPath, new Blob([jsBytes], { type: "application/javascript" }),
    { cacheControl: "31536000, immutable", upsert: true, contentType: "application/javascript" },
  );
  if (jsErr) throw jsErr;
  const { data: jsSigned, error: jsSignErr } = await supabase.storage.from("cms-sdk")
    .createSignedUrl(jsPath, 60 * 60 * 24 * 365 * 10);
  if (jsSignErr) throw jsSignErr;

  let bundle_css_url: string | null = null;
  try {
    const cssResp = await fetch("/admin-bundle/admin.css", { cache: "no-store" });
    if (cssResp.ok) {
      const cssBytes = await cssResp.arrayBuffer();
      const cssSha = (await sha256Hex(cssBytes)).slice(0, 12);
      const cssPath = `${version}/admin-${cssSha}.css`;
      const { error: cssErr } = await supabase.storage.from("cms-sdk").upload(
        cssPath, new Blob([cssBytes], { type: "text/css" }),
        { cacheControl: "31536000, immutable", upsert: true, contentType: "text/css" },
      );
      if (!cssErr) {
        const { data: cssSigned } = await supabase.storage.from("cms-sdk")
          .createSignedUrl(cssPath, 60 * 60 * 24 * 365 * 10);
        bundle_css_url = cssSigned?.signedUrl ?? null;
      }
    }
  } catch { /* css optional */ }

  return { bundle_url: jsSigned.signedUrl, bundle_sha256, bundle_size, bundle_css_url };
}

export async function updateReleaseBundleMeta(releaseId: string, meta: BundleCaptureResult) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const { error } = await db.from("cms_releases").update({
    bundle_url: meta.bundle_url,
    bundle_sha256: meta.bundle_sha256,
    bundle_size: meta.bundle_size,
    bundle_css_url: meta.bundle_css_url,
  }).eq("id", releaseId);
  if (error) throw error;
}
