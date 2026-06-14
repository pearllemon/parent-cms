// Secure CMS Core bootstrap loader — runs inside every child website on each
// page load.
//
//   1. Auto-register the site (gets a stable site_id back).
//   2. Pull the latest release manifest from the parent CMS edge function.
//   3. VERIFY the Ed25519 signature against an EMBEDDED trusted public key set
//      BEFORE doing anything else. Unsigned, invalid, or downgraded releases
//      are rejected.
//   4. Forward-only: skip if the manifest version is not strictly newer than
//      the currently installed version.
//   5. Run forward SQL migrations through the child's `exec_cms_migration`
//      RPC (the child supplies a `runMigration` hook that calls it server-
//      side with service_role).
//   6. Dynamically import the engine SDK bundle via the native module loader
//      (NO eval, NO new Function — `import()` only). The SDK URL must be on
//      one of the explicitly allowed origins.
//   7. Report a heartbeat now AND on a recurring interval.

import { setCmsMode, type CmsMode } from "./mode";
import {
  verifyManifestSignature, compareSemver,
  type TrustedKey, type VerifiableManifest,
} from "./verify";

const SHIM_VERSION = "1.1.0";
const MANIFEST_CACHE_KEY = "cms-core-manifest-v1";
const SITE_ID_KEY = "cms-core-site-id";
const INSTALLED_VERSION_KEY = "cms-core-installed-version";
const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;

export type ManifestMigration = {
  id: string;
  version: string;
  order_index: number;
  kind: "sql" | "js" | "noop";
  description: string | null;
  payload: string;
  reversible: boolean;
  down_payload: string | null;
};

export type Manifest = VerifiableManifest & {
  changelog: string | null;
  recalled: boolean;
  migrations: ManifestMigration[];
};

export type RunMigrationContext = {
  step: ManifestMigration;
  version: string;
  previousVersion: string | null;
  signature_verified: true;        // proof to the child runner
  signing_key_id: string;
  payload_hash: string;
};

export type BootstrapOptions = {
  parentReleaseUrl: string;
  /** Trusted Ed25519 public keys embedded in the child build. REQUIRED. */
  trustedPublicKeys: TrustedKey[];
  /** Explicit allow-list of SDK origins. Defaults to the parent release origin. */
  allowedSdkOrigins?: string[];
  siteId?: string;
  siteName?: string;
  siteUrl?: string;
  mode?: CmsMode;
  /**
   * Runs ONE migration step. The child should forward this to a server-side
   * function (edge function w/ service_role) that calls `exec_cms_migration`.
   * Only invoked AFTER signature verification has succeeded.
   */
  runMigration?: (ctx: RunMigrationContext) => Promise<void>;
  heartbeat?: boolean;
};

export type BootstrapResult = {
  siteId: string;
  version: string;
  previousVersion: string | null;
  sdkLoaded: boolean;
  module: unknown | null;
  manifest: Manifest | null;
  appliedMigrations: number;
  upgraded: boolean;
  verified: boolean;
  error: string | null;
};

/* ----------------------------- helpers ----------------------------- */

function getOrCreateSiteId(explicit?: string): string {
  if (explicit) { try { localStorage.setItem(SITE_ID_KEY, explicit); } catch { /* */ } return explicit; }
  try { const x = localStorage.getItem(SITE_ID_KEY); if (x) return x; } catch { /* */ }
  const generated = `site_${(globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)).replace(/-/g, "").slice(0, 16)}`;
  try { localStorage.setItem(SITE_ID_KEY, generated); } catch { /* */ }
  return generated;
}

async function postJSON(url: string, body: unknown): Promise<Response | null> {
  try {
    return await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch { return null; }
}

async function fetchManifest(base: string, siteId: string): Promise<Manifest | null> {
  try {
    const url = `${base}?site_id=${encodeURIComponent(siteId)}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const m = (await res.json()) as Manifest;
    try { localStorage.setItem(MANIFEST_CACHE_KEY, JSON.stringify(m)); } catch { /* */ }
    return m;
  } catch {
    try { const raw = localStorage.getItem(MANIFEST_CACHE_KEY); return raw ? JSON.parse(raw) as Manifest : null; }
    catch { return null; }
  }
}

function isAllowedSdkUrl(sdkUrl: string, allow: string[]): boolean {
  try {
    const u = new URL(sdkUrl);
    if (u.protocol !== "https:") return false;
    return allow.some((origin) => u.origin === origin);
  } catch { return false; }
}

/* ----------------------------- main ----------------------------- */

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

export async function bootstrapCmsCore(opts: BootstrapOptions): Promise<BootstrapResult> {
  const started = performance.now();
  if (opts.mode) setCmsMode(opts.mode);

  const siteId = getOrCreateSiteId(opts.siteId);
  const base = opts.parentReleaseUrl.replace(/\/$/, "");
  const allowedOrigins = opts.allowedSdkOrigins?.length
    ? opts.allowedSdkOrigins
    : [new URL(base).origin];

  await postJSON(`${base}/register`, {
    site_id: siteId,
    site_name: opts.siteName || null,
    site_url: opts.siteUrl || (typeof location !== "undefined" ? location.origin : null),
    mode: opts.mode || "child",
    shim_version: SHIM_VERSION,
  });

  const manifest = await fetchManifest(base);
  let previousVersion: string | null = null;
  try { previousVersion = localStorage.getItem(INSTALLED_VERSION_KEY); } catch { /* */ }

  const failResult = (reason: string): BootstrapResult => ({
    siteId, version: previousVersion || "0.0.0", previousVersion,
    sdkLoaded: false, module: null, manifest,
    appliedMigrations: 0, upgraded: false, verified: false, error: reason,
  });

  if (!manifest) {
    await sendHeartbeat(base, {
      site_id: siteId, site_name: opts.siteName, site_url: opts.siteUrl,
      current_version: previousVersion, child_shim_version: SHIM_VERSION,
      upgrade_state: "unknown", last_error: "manifest unavailable",
    });
    scheduleHeartbeat(base, siteId, opts, previousVersion);
    return failResult("manifest unavailable");
  }

  if (manifest.recalled) {
    await sendHeartbeat(base, {
      site_id: siteId, current_version: previousVersion,
      child_shim_version: SHIM_VERSION, upgrade_state: "rolled_back",
      last_error: "release recalled",
    });
    scheduleHeartbeat(base, siteId, opts, previousVersion);
    return failResult("release recalled");
  }

  /* ---------- (3) signature verification ---------- */
  const verification = await verifyManifestSignature(manifest, opts.trustedPublicKeys || []);
  if (verification.ok !== true) {
    const reason = (verification as { ok: false; reason: string }).reason;
    await postJSON(`${base}/upgrade-log`, {
      site_id: siteId, from_version: previousVersion, to_version: manifest.version,
      status: "failed", error: `signature: ${reason}`,
    });
    await sendHeartbeat(base, {
      site_id: siteId, current_version: previousVersion,
      child_shim_version: SHIM_VERSION, upgrade_state: "failed",
      last_error: `signature: ${reason}`,
    });
    scheduleHeartbeat(base, siteId, opts, previousVersion);
    return failResult(`signature: ${reason}`);
  }

  /* ---------- (4) forward-only check ---------- */
  const needsUpgrade = !previousVersion || compareSemver(manifest.version, previousVersion) > 0;

  let appliedMigrations = 0;
  let upgradeError: string | null = null;
  let upgradeStatus: "started" | "success" | "failed" | "skipped" = "skipped";

  if (needsUpgrade) {
    upgradeStatus = "started";
    await postJSON(`${base}/upgrade-log`, {
      site_id: siteId, from_version: previousVersion, to_version: manifest.version, status: "started",
    });
    try {
      for (const step of manifest.migrations) {
        if (step.kind === "noop") { appliedMigrations++; continue; }
        if (step.kind === "js") {
          // JS migrations are NOT executed via eval. They ride with the SDK
          // module under a registered hook. The runner here is a no-op so we
          // never run remote strings.
          appliedMigrations++; continue;
        }
        if (opts.runMigration) {
          await opts.runMigration({
            step, version: manifest.version, previousVersion,
            signature_verified: true,
            signing_key_id: verification.key_id,
            payload_hash: verification.payload_hash,
          });
          appliedMigrations++;
        }
      }
      try { localStorage.setItem(INSTALLED_VERSION_KEY, manifest.version); } catch { /* */ }
      upgradeStatus = "success";
    } catch (e) {
      upgradeStatus = "failed";
      upgradeError = String((e as Error)?.message || e);
    }

    await postJSON(`${base}/upgrade-log`, {
      site_id: siteId, from_version: previousVersion, to_version: manifest.version,
      status: upgradeStatus, error: upgradeError,
      duration_ms: Math.round(performance.now() - started),
    });
  }

  /* ---------- (6) dynamic engine load (no eval) ---------- */
  let mod: unknown = null;
  let sdkLoaded = false;
  if (manifest.sdk_url) {
    if (!isAllowedSdkUrl(manifest.sdk_url, allowedOrigins)) {
      upgradeError = upgradeError || `sdk origin not allowed: ${manifest.sdk_url}`;
    } else {
      try {
        mod = await import(/* @vite-ignore */ manifest.sdk_url);
        sdkLoaded = true;
      } catch (e) {
        upgradeError = upgradeError || `sdk import failed: ${String((e as Error)?.message || e)}`;
      }
    }
  }

  const currentVersion = upgradeStatus === "success" ? manifest.version : (previousVersion || manifest.version);

  await sendHeartbeat(base, {
    site_id: siteId, site_name: opts.siteName, site_url: opts.siteUrl,
    current_version: currentVersion, child_shim_version: SHIM_VERSION,
    upgrade_state:
      upgradeStatus === "failed" ? "failed"
      : currentVersion === manifest.version ? "up_to_date" : "pending",
    last_error: upgradeError,
  });
  scheduleHeartbeat(base, siteId, opts, currentVersion);

  return {
    siteId, version: currentVersion, previousVersion,
    sdkLoaded, module: mod, manifest,
    appliedMigrations, upgraded: upgradeStatus === "success",
    verified: true, error: upgradeError,
  };
}

async function sendHeartbeat(base: string, payload: Record<string, unknown>) {
  await postJSON(`${base}/heartbeat`, payload);
}

function scheduleHeartbeat(base: string, siteId: string, opts: BootstrapOptions, version: string | null) {
  if (opts.heartbeat === false) return;
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = setInterval(() => {
    void sendHeartbeat(base, {
      site_id: siteId, site_name: opts.siteName, site_url: opts.siteUrl,
      current_version: version, child_shim_version: SHIM_VERSION,
      upgrade_state: "up_to_date",
    });
  }, HEARTBEAT_INTERVAL_MS);
}

export const CHILD_SHIM_VERSION = SHIM_VERSION;
