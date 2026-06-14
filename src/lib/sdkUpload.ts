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

export async function updateReleaseSdkUrl(releaseId: string, sdk_url: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const { error } = await db.from("cms_releases").update({ sdk_url }).eq("id", releaseId);
  if (error) throw error;
}
