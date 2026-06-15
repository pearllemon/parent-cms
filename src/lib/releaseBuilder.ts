// Release Builder — orchestrates: snapshot → cut release → attach SDK URL →
// sign → done. Called from BuildReleaseDialog.

import { supabase as cloud } from "@/integrations/supabase/client";
import { cutRelease, type Release } from "@/lib/distribution";
import {
  loadLocalSigner, signReleasePayload, attachSignatureToRelease,
} from "@/lib/releaseSigning";
import { buildManifest, type SnapshotSelection } from "@/lib/manifestBuilder";
import { buildReleaseZip } from "@/lib/releasePackage";
import { uploadReleasePackage } from "@/lib/sdkUpload";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = cloud as any;

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
export const STUB_SDK_URL = `${SUPABASE_URL}/functions/v1/cms-sdk-stub`;
export const RELEASE_API_URL = `${SUPABASE_URL}/functions/v1/cms-release`;

/** Resolve the most recently published release's sdk_url, if any. */
export async function findLatestSdkUrl(): Promise<string | null> {
  const { data } = await db
    .from("cms_releases")
    .select("sdk_url")
    .not("sdk_url", "is", null)
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.sdk_url || null;
}

export type SdkSourceMode = "latest" | "stub" | "url";

export type BuildReleaseInput = {
  version: string;
  changelog?: string;
  selection: SnapshotSelection;
  sdkMode: SdkSourceMode;
  sdkUrlOverride?: string;
  minCompatibleChild?: string;
  autoSign?: boolean;
};

export type BuildReleaseResult = {
  release: Release;
  sdkUrl: string | null;
  packageUrl: string | null;
  signed: boolean;
  signedKeyId: string | null;
  counts: Record<string, number>;
};

export async function buildAndCutRelease(input: BuildReleaseInput): Promise<BuildReleaseResult> {
  const manifest = await buildManifest(input.selection);

  // Resolve SDK URL based on chosen source.
  let sdkUrl: string | null = null;
  if (input.sdkMode === "url") sdkUrl = input.sdkUrlOverride?.trim() || null;
  else if (input.sdkMode === "latest") sdkUrl = await findLatestSdkUrl();
  else if (input.sdkMode === "stub") sdkUrl = STUB_SDK_URL;
  if (!sdkUrl) sdkUrl = STUB_SDK_URL; // never leave the child without a bundle

  const migrations: never[] = [];
  const pkg = await buildReleaseZip({
    version: input.version,
    releaseEndpoint: RELEASE_API_URL,
    sdkUrl,
    manifest: manifest as unknown as Record<string, unknown>,
    migrations,
    changelog: input.changelog,
    minCompatibleChild: input.minCompatibleChild,
  });
  const packageUrl = await uploadReleasePackage(input.version, pkg.blob);

  const release = await cutRelease({
    version: input.version,
    changelog: input.changelog,
    sdk_url: sdkUrl,
    package_url: packageUrl,
    package_sha256: pkg.sha256,
    package_size: pkg.size,
    package_format: "zip",
    manifest: manifest as unknown as Record<string, unknown>,
    min_compatible_child_version: input.minCompatibleChild,
    migrations,
  });

  let signed = false;
  let signedKeyId: string | null = null;
  if (input.autoSign !== false) {
    const signer = loadLocalSigner();
    if (signer) {
      const sig = await signReleasePayload(
        {
          version: release.version,
          sdk_url: release.sdk_url,
          package_url: release.package_url,
          package_sha256: release.package_sha256,
          package_size: release.package_size,
          package_format: release.package_format,
          min_compatible_child_version: release.min_compatible_child_version,
          manifest: release.manifest || {},
          migrations,
        },
        signer,
      );
      await attachSignatureToRelease(release.id, sig);
      signed = true;
      signedKeyId = sig.signing_key_id;
    }
  }

  return { release, sdkUrl, packageUrl, signed, signedKeyId, counts: manifest._counts };
}
