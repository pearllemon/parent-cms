// Real CMS Core bootstrap loader — runs inside every child website on each
// page load. Responsibilities:
//
//   1. Auto-register the site on first boot (gets a stable site_id back).
//   2. Pull the latest release manifest from the parent CMS edge function.
//   3. Run any pending migrations against the CHILD's own Lovable Cloud DB
//      (via the supabase client the child passes in).
//   4. Dynamically import the engine SDK bundle (sdk_url) so the child
//      automatically picks up new code without a redeploy.
//   5. Report a heartbeat now AND on a recurring interval.
//
// This file is intentionally tiny and stable. Children should NEVER edit it —
// it is the only piece that doesn't ship via the SDK bundle.

import { setCmsMode, type CmsMode } from "./mode";

const SHIM_VERSION = "1.0.0";
const MANIFEST_CACHE_KEY = "cms-core-manifest-v1";
const SITE_ID_KEY = "cms-core-site-id";
const INSTALLED_VERSION_KEY = "cms-core-installed-version";
const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

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

export type Manifest = {
  version: string;
  sdk_url: string | null;
  changelog: string | null;
  min_compatible_child_version: string | null;
  recalled: boolean;
  manifest: Record<string, unknown>;
  migrations: ManifestMigration[];
};

export type BootstrapOptions = {
  /** Parent CMS edge function base, e.g. https://xxx.supabase.co/functions/v1/cms-release */
  parentReleaseUrl: string;
  /** Optional explicit site_id; otherwise one is auto-generated and persisted. */
  siteId?: string;
  siteName?: string;
  siteUrl?: string;
  /** "child" by default in remixes; set "hybrid" for parent-with-children testing. */
  mode?: CmsMode;
  /** Run a migration step against the child's own DB. Receives the parsed step. */
  runMigration?: (step: ManifestMigration) => Promise<void>;
  /** If true (default), starts a setInterval heartbeat. Set false in SSR. */
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
  error: string | null;
};

/* ----------------------------- helpers ----------------------------- */

function getOrCreateSiteId(explicit?: string): string {
  if (explicit) {
    try { localStorage.setItem(SITE_ID_KEY, explicit); } catch { /* */ }
    return explicit;
  }
  try {
    const existing = localStorage.getItem(SITE_ID_KEY);
    if (existing) return existing;
  } catch { /* */ }
  const generated =
    `site_${(globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)).replace(/-/g, "").slice(0, 16)}`;
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

async function fetchManifest(base: string): Promise<Manifest | null> {
  try {
    const res = await fetch(base, { cache: "no-store" });
    if (!res.ok) return null;
    const m = (await res.json()) as Manifest;
    try { localStorage.setItem(MANIFEST_CACHE_KEY, JSON.stringify(m)); } catch { /* */ }
    return m;
  } catch {
    try {
      const raw = localStorage.getItem(MANIFEST_CACHE_KEY);
      return raw ? (JSON.parse(raw) as Manifest) : null;
    } catch { return null; }
  }
}

function cmp(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  }
  return 0;
}

/* ----------------------------- main ----------------------------- */

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

export async function bootstrapCmsCore(opts: BootstrapOptions): Promise<BootstrapResult> {
  const started = performance.now();
  if (opts.mode) setCmsMode(opts.mode);

  const siteId = getOrCreateSiteId(opts.siteId);
  const base = opts.parentReleaseUrl.replace(/\/$/, "");

  // 1. Register (idempotent — server upserts on site_id).
  await postJSON(`${base}/register`, {
    site_id: siteId,
    site_name: opts.siteName || null,
    site_url: opts.siteUrl || (typeof location !== "undefined" ? location.origin : null),
    mode: opts.mode || "child",
    shim_version: SHIM_VERSION,
  });

  // 2. Pull manifest.
  const manifest = await fetchManifest(base);
  let previousVersion: string | null = null;
  try { previousVersion = localStorage.getItem(INSTALLED_VERSION_KEY); } catch { /* */ }

  if (!manifest) {
    await sendHeartbeat(base, {
      site_id: siteId, site_name: opts.siteName, site_url: opts.siteUrl,
      current_version: previousVersion, child_shim_version: SHIM_VERSION,
      upgrade_state: "unknown", last_error: "manifest unavailable",
    });
    scheduleHeartbeat(base, siteId, opts, previousVersion);
    return {
      siteId, version: previousVersion || "0.0.0", previousVersion,
      sdkLoaded: false, module: null, manifest: null,
      appliedMigrations: 0, upgraded: false, error: "manifest unavailable",
    };
  }

  // 3. Decide whether to upgrade.
  const needsUpgrade = !previousVersion || cmp(manifest.version, previousVersion) > 0;
  let appliedMigrations = 0;
  let upgradeError: string | null = null;
  let upgradeStatus: "started" | "success" | "failed" | "skipped" = "skipped";

  if (needsUpgrade && !manifest.recalled) {
    upgradeStatus = "started";
    await postJSON(`${base}/upgrade-log`, {
      site_id: siteId, from_version: previousVersion, to_version: manifest.version,
      status: "started",
    });
    try {
      for (const step of manifest.migrations) {
        if (step.kind === "noop") { appliedMigrations++; continue; }
        if (opts.runMigration) {
          await opts.runMigration(step);
          appliedMigrations++;
        } else {
          // No runner provided — skip but do not block engine load.
          // Migrations are recorded so admin can replay later.
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

  // 4. Dynamically import the engine SDK bundle.
  let mod: unknown = null;
  let sdkLoaded = false;
  if (manifest.sdk_url) {
    try {
      mod = await import(/* @vite-ignore */ manifest.sdk_url);
      sdkLoaded = true;
    } catch (e) {
      upgradeError = upgradeError || `sdk import failed: ${String((e as Error)?.message || e)}`;
    }
  }

  const currentVersion = upgradeStatus === "success" ? manifest.version : (previousVersion || manifest.version);

  // 5. First heartbeat + recurring heartbeat.
  await sendHeartbeat(base, {
    site_id: siteId, site_name: opts.siteName, site_url: opts.siteUrl,
    current_version: currentVersion, child_shim_version: SHIM_VERSION,
    upgrade_state:
      upgradeStatus === "failed" ? "failed"
      : upgradeStatus === "success" ? "up_to_date"
      : currentVersion === manifest.version ? "up_to_date" : "pending",
    last_error: upgradeError,
  });
  scheduleHeartbeat(base, siteId, opts, currentVersion);

  return {
    siteId, version: currentVersion, previousVersion,
    sdkLoaded, module: mod, manifest,
    appliedMigrations, upgraded: upgradeStatus === "success",
    error: upgradeError,
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
