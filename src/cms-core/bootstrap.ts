// Child-side bootstrap loader. This file is the only "frozen" piece that lives
// in each child remix. It fetches the latest manifest from the parent CMS,
// applies any pending migrations against the child's own Lovable Cloud DB,
// dynamically imports the engine SDK by URL, and reports heartbeat.
//
// In THIS project (the parent CMS) it is used so the parent can dogfood
// every release against itself before children pull it.

const SHIM_VERSION = "0.1.0";
const CACHE_KEY = "cms-core-bootstrap-v1";

type Manifest = {
  version: string;
  sdk_url: string | null;
  changelog: string | null;
  min_compatible_child_version: string | null;
  recalled: boolean;
  manifest: Record<string, unknown>;
  migrations: Array<{
    id: string; version: string; order_index: number;
    kind: "sql" | "js" | "noop"; description: string | null;
    payload: string; reversible: boolean; down_payload: string | null;
  }>;
};

export type BootstrapOptions = {
  parentReleaseUrl: string;         // e.g. https://parent.supabase.co/functions/v1/cms-release
  siteId: string;                   // unique per child
  siteName?: string;
  siteUrl?: string;
  /** Hook a child provides to run a SQL migration against its own DB. Optional. */
  runMigration?: (step: Manifest["migrations"][number]) => Promise<void>;
};

export type BootstrapResult = {
  version: string;
  sdkLoaded: boolean;
  module: unknown | null;
  manifest: Manifest;
  appliedMigrations: number;
};

async function postHeartbeat(parentUrl: string, payload: Record<string, unknown>) {
  try {
    await fetch(`${parentUrl}/heartbeat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch { /* offline-tolerant */ }
}

async function postUpgradeLog(parentUrl: string, payload: Record<string, unknown>) {
  try {
    await fetch(`${parentUrl}/upgrade-log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch { /* offline-tolerant */ }
}

function cachedManifest(): Manifest | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Manifest) : null;
  } catch { return null; }
}

function cacheManifest(m: Manifest) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(m)); } catch { /* */ }
}

export async function bootstrapCmsCore(opts: BootstrapOptions): Promise<BootstrapResult> {
  const start = performance.now();

  // 1. Pull latest manifest (fall back to cache if parent is unreachable)
  let manifest: Manifest | null = null;
  try {
    const res = await fetch(opts.parentReleaseUrl);
    if (res.ok) {
      manifest = (await res.json()) as Manifest;
      cacheManifest(manifest);
    }
  } catch { /* network */ }
  if (!manifest) manifest = cachedManifest();
  if (!manifest) {
    return {
      version: "0.0.0", sdkLoaded: false, module: null,
      manifest: { version: "0.0.0", sdk_url: null, changelog: null,
        min_compatible_child_version: null, recalled: false, manifest: {}, migrations: [] },
      appliedMigrations: 0,
    };
  }

  // 2. Compare against last applied version (per-child, localStorage)
  const installedKey = `cms-core-installed-version`;
  const currentVersion = localStorage.getItem(installedKey);
  let appliedMigrations = 0;
  let upgradeStatus: "started" | "success" | "failed" = "started";
  let upgradeError: string | null = null;

  if (currentVersion !== manifest.version) {
    await postUpgradeLog(opts.parentReleaseUrl, {
      site_id: opts.siteId, from_version: currentVersion,
      to_version: manifest.version, status: "started",
    });
    try {
      for (const step of manifest.migrations) {
        if (step.kind === "noop") { appliedMigrations++; continue; }
        if (opts.runMigration) {
          await opts.runMigration(step);
          appliedMigrations++;
        }
        // SQL/JS migrations without a runner are recorded but skipped — parent
        // typically does not need a runner since it owns the parent DB; child
        // remixes wire `runMigration` to apply against their Cloud DB.
      }
      localStorage.setItem(installedKey, manifest.version);
      upgradeStatus = "success";
    } catch (e) {
      upgradeStatus = "failed";
      upgradeError = String((e as Error)?.message || e);
    }
    await postUpgradeLog(opts.parentReleaseUrl, {
      site_id: opts.siteId,
      from_version: currentVersion,
      to_version: manifest.version,
      status: upgradeStatus,
      error: upgradeError,
      duration_ms: Math.round(performance.now() - start),
    });
  }

  // 3. Dynamically import the SDK bundle if URL provided.
  let mod: unknown = null;
  let sdkLoaded = false;
  if (manifest.sdk_url) {
    try {
      mod = await import(/* @vite-ignore */ manifest.sdk_url);
      sdkLoaded = true;
    } catch (e) {
      upgradeError = upgradeError || String((e as Error)?.message || e);
    }
  }

  // 4. Heartbeat
  await postHeartbeat(opts.parentReleaseUrl, {
    site_id: opts.siteId,
    site_name: opts.siteName || null,
    site_url: opts.siteUrl || null,
    current_version: manifest.version,
    child_shim_version: SHIM_VERSION,
    upgrade_state: upgradeStatus === "failed" ? "failed"
      : upgradeStatus === "success" ? "up_to_date"
      : currentVersion === manifest.version ? "up_to_date" : "pending",
    last_error: upgradeError,
  });

  return {
    version: manifest.version,
    sdkLoaded,
    module: mod,
    manifest,
    appliedMigrations,
  };
}

export const CHILD_SHIM_VERSION = SHIM_VERSION;
