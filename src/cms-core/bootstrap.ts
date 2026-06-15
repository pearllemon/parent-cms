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
import { applyManifest } from "./applyManifest";


const SHIM_VERSION = "1.2.0";
const MANIFEST_CACHE_KEY = "cms-core-manifest-v1";
const SITE_ID_KEY = "cms-core-site-id";
const REG_TOKEN_KEY = "cms-core-registration-token";
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
  site_id: string;
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

export type BootstrapStatus =
  | "ok"               // verified + (possibly) upgraded + SDK loaded
  | "no_release"       // parent reachable, but no release has been published yet
  | "waiting"          // parent temporarily unreachable; running cached/current version
  | "recalled"         // latest release was pulled by the parent
  | "untrusted"        // signature failed verification
  | "error";           // unexpected failure (still non-fatal — site keeps rendering)

export type BootstrapResult = {
  siteId: string;
  status: BootstrapStatus;
  /** Human-friendly status message — safe to surface to the customer. */
  message: string;
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

const DEFAULT_TIMEOUT_MS = 10_000;

async function fetchWithTimeout(input: string, init: RequestInit = {}, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function postJSON(url: string, body: unknown): Promise<Response | null> {
  // Best-effort: never throw. Retry once on network failure.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await fetchWithTimeout(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch { /* retry */ }
  }
  return null;
}

async function fetchManifest(base: string, siteId: string): Promise<Manifest | null> {
  const url = `${base}?site_id=${encodeURIComponent(siteId)}`;
  // Retry transient failures (network, 5xx, 429) with small backoff.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetchWithTimeout(url, { cache: "no-store" });
      if (res.ok) {
        const m = (await res.json()) as Manifest;
        try { localStorage.setItem(MANIFEST_CACHE_KEY, JSON.stringify(m)); } catch { /* */ }
        return m;
      }
      // 4xx (except 408/429) — don't keep retrying.
      if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
        break;
      }
    } catch { /* network / abort — fall through to retry */ }
    await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
  }
  // Last resort: serve the previously cached manifest so the site keeps working.
  try {
    const raw = localStorage.getItem(MANIFEST_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Manifest) : null;
  } catch { return null; }
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

  const regResp = await postJSON(`${base}/register`, {
    site_id: siteId,
    site_name: opts.siteName || null,
    site_url: opts.siteUrl || (typeof location !== "undefined" ? location.origin : null),
    mode: opts.mode || "child",
    shim_version: SHIM_VERSION,
  });
  let regToken: string | null = null;
  try { regToken = localStorage.getItem(REG_TOKEN_KEY); } catch { /* */ }
  try {
    const j = regResp && regResp.ok ? await regResp.json() : null;
    if (j?.registration_token) {
      regToken = j.registration_token;
      try { localStorage.setItem(REG_TOKEN_KEY, regToken!); } catch { /* */ }
    }
  } catch { /* */ }

  const manifest = await fetchManifest(base, siteId);
  let previousVersion: string | null = null;
  try { previousVersion = localStorage.getItem(INSTALLED_VERSION_KEY); } catch { /* */ }

  const buildResult = (
    overrides: Partial<BootstrapResult> & { status: BootstrapStatus; message: string },
  ): BootstrapResult => ({
    siteId,
    version: previousVersion || "0.0.0",
    previousVersion,
    sdkLoaded: false,
    module: null,
    manifest,
    appliedMigrations: 0,
    upgraded: false,
    verified: false,
    error: null,
    ...overrides,
  });

  // Helper: every heartbeat/upgrade-log call carries the registration_token
  // so the parent can refuse spoofed reports from other site_ids.
  const auth = <T extends Record<string, unknown>>(body: T) =>
    ({ ...body, registration_token: regToken });

  // Parent reachable but no release yet — graceful "connected, waiting" state.
  const isNoRelease = !!manifest && (
    (manifest as unknown as { status?: string }).status === "no_release" ||
    (!manifest.version && !manifest.signature && !manifest.signature_b64)
  );
  if (isNoRelease) {
    await sendHeartbeat(base, auth({
      site_id: siteId, site_name: opts.siteName, site_url: opts.siteUrl,
      current_version: previousVersion, child_shim_version: SHIM_VERSION,
      upgrade_state: "awaiting_release",
    }));
    scheduleHeartbeat(base, siteId, opts, previousVersion, regToken);
    return buildResult({
      status: "no_release",
      message: "Connected to parent CMS. Waiting for the first release.",
    });
  }

  if (!manifest) {
    await sendHeartbeat(base, auth({
      site_id: siteId, site_name: opts.siteName, site_url: opts.siteUrl,
      current_version: previousVersion, child_shim_version: SHIM_VERSION,
      upgrade_state: "unknown",
    }));
    scheduleHeartbeat(base, siteId, opts, previousVersion, regToken);
    return buildResult({
      status: "waiting",
      message: previousVersion
        ? "Parent CMS temporarily unreachable. Running last known version."
        : "Connecting to parent CMS… will retry automatically.",
    });
  }

  if (manifest.recalled) {
    await sendHeartbeat(base, auth({
      site_id: siteId, current_version: previousVersion,
      child_shim_version: SHIM_VERSION, upgrade_state: "rolled_back",
    }));
    scheduleHeartbeat(base, siteId, opts, previousVersion, regToken);
    return buildResult({
      status: "recalled",
      message: "Latest release was recalled by the parent. Running previous version.",
    });
  }

  /* ---------- (3) signature verification ---------- */
  const verification = await verifyManifestSignature(manifest, opts.trustedPublicKeys || []);
  if (verification.ok !== true) {
    const reason = (verification as { ok: false; reason: string }).reason;
    await postJSON(`${base}/upgrade-log`, auth({
      site_id: siteId, from_version: previousVersion, to_version: manifest.version,
      status: "failed", error: `signature: ${reason}`,
    }));
    await sendHeartbeat(base, auth({
      site_id: siteId, current_version: previousVersion,
      child_shim_version: SHIM_VERSION, upgrade_state: "failed",
      last_error: `signature: ${reason}`,
    }));
    scheduleHeartbeat(base, siteId, opts, previousVersion, regToken);
    return buildResult({
      status: "untrusted",
      message: "Latest release could not be verified. Running previous version.",
      error: `signature: ${reason}`,
    });
  }

  /* ---------- (4) forward-only check ---------- */
  const needsUpgrade = !previousVersion || compareSemver(manifest.version, previousVersion) > 0;

  let appliedMigrations = 0;
  let upgradeError: string | null = null;
  let upgradeStatus: "started" | "success" | "failed" | "skipped" = "skipped";

  if (needsUpgrade) {
    upgradeStatus = "started";
    await postJSON(`${base}/upgrade-log`, auth({
      site_id: siteId, from_version: previousVersion, to_version: manifest.version, status: "started",
    }));
    try {
      for (const step of manifest.migrations) {
        if (step.kind === "noop") { appliedMigrations++; continue; }
        if (step.kind === "js") { appliedMigrations++; continue; }
        if (opts.runMigration) {
          await opts.runMigration({
            step, version: manifest.version, previousVersion,
            signature_verified: true,
            signing_key_id: verification.key_id,
            payload_hash: verification.payload_hash,
            site_id: siteId,
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

    await postJSON(`${base}/upgrade-log`, auth({
      site_id: siteId, from_version: previousVersion, to_version: manifest.version,
      status: upgradeStatus, error: upgradeError,
      duration_ms: Math.round(performance.now() - started),
    }));
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

  if (manifest.manifest && typeof manifest.manifest === "object") {
    try { await applyManifest(manifest.manifest); } catch { /* non-fatal */ }
  }

  const currentVersion = upgradeStatus === "success" ? manifest.version : (previousVersion || manifest.version);

  await sendHeartbeat(base, auth({
    site_id: siteId, site_name: opts.siteName, site_url: opts.siteUrl,
    current_version: currentVersion, child_shim_version: SHIM_VERSION,
    upgrade_state:
      upgradeStatus === "failed" ? "failed"
      : currentVersion === manifest.version ? "up_to_date" : "pending",
    last_error: upgradeError,
  }));
  scheduleHeartbeat(base, siteId, opts, currentVersion, regToken);

  const finalStatus: BootstrapStatus = upgradeError ? "error" : "ok";
  return {
    siteId,
    status: finalStatus,
    message: upgradeError
      ? "Site is running, but the latest update could not be applied. Will retry."
      : sdkLoaded
        ? "Connected. Engine loaded and up to date."
        : "Connected. Running current version.",
    version: currentVersion,
    previousVersion,
    sdkLoaded,
    module: mod,
    manifest,
    appliedMigrations,
    upgraded: upgradeStatus === "success",
    verified: true,
    error: upgradeError,
  };
}

async function sendHeartbeat(base: string, payload: Record<string, unknown>) {
  await postJSON(`${base}/heartbeat`, payload);
}

function scheduleHeartbeat(
  base: string, siteId: string, opts: BootstrapOptions,
  version: string | null, regToken: string | null,
) {
  if (opts.heartbeat === false) return;
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = setInterval(() => {
    void sendHeartbeat(base, {
      site_id: siteId, site_name: opts.siteName, site_url: opts.siteUrl,
      current_version: version, child_shim_version: SHIM_VERSION,
      upgrade_state: "up_to_date",
      registration_token: regToken,
    });
  }, HEARTBEAT_INTERVAL_MS);
}

export const CHILD_SHIM_VERSION = SHIM_VERSION;
