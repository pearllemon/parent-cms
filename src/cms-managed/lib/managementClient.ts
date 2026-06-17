/**
 * Client for the Tier 1 Parent Management Site.
 *
 * Tier 1 is the single source of truth for:
 *   - the GitHub repo of parent-cms
 *   - update channels (stable / beta)
 *   - update workflow filename
 *   - registry endpoints
 *   - GITHUB_INSTALLER_TOKEN (NEVER returned by any of these endpoints)
 *
 * Both the Parent CMS (Tier 2) and Child CMS installs (Tier 3) use this
 * helper. It reads /cms.config.json at runtime to discover the management
 * URL and the site's install_token. No GitHub credentials live here.
 */

export type ManagementCfg = {
  management_url: string;
  management_anon_key: string;
  site_id: string;
  install_token: string;
};

export type RemoteSiteConfig = {
  parent_repo: string;
  default_branch: string;
  update_workflow_filename: string;
  channel: "stable" | "beta";
  auto_update: boolean;
  registry_endpoints: Record<string, string>;
  signing_public_key: string | null;
  fetched_at: number;
};

export type UpdateCheck = {
  latestVersion: string | null;
  latestSha: string | null;
  publishedAt: string | null;
  changelogUrl: string | null;
  updateAvailable: boolean;
};

const CFG_CACHE_KEY = "cms.mgmt.config.v1";
const CFG_CACHE_TTL_MS = 5 * 60 * 1000;
const LOCAL_CFG_KEY = "cms.local.config.v1";

// When cms.config.json marks this project as its own parent (self_parent:true
// or site_id:"self"), there is no Tier-1 Parent Management to call. The
// `parent-site-config` / `parent-update-check` / `parent-update-apply`
// functions only exist on a real Tier-1 deployment and would fail with
// "Failed to fetch". In that case we serve sane defaults locally and route
// update checks through the GitHub PAT connection only.
let selfParentFlag: boolean | null = null;
async function isSelfParent(): Promise<boolean> {
  if (selfParentFlag !== null) return selfParentFlag;
  try {
    const res = await fetch("/cms.config.json", { cache: "no-store" });
    if (res.ok) {
      const j = await res.json();
      selfParentFlag = !!j.self_parent || j.site_id === "self";
    } else {
      selfParentFlag = false;
    }
  } catch {
    selfParentFlag = false;
  }
  return selfParentFlag;
}

// Lazy import to avoid pulling the supabase client into the management client
// when only the parent-management path is used.
async function tryLocalGithub() {
  try {
    const [{ getGithubConnection, checkUpdateViaPat, applyUpdateViaPat }, parent] = await Promise.all([
      import("@/lib/githubConnection"),
      import("@/lib/parent"),
    ]);
    const cfg = await parent.getSiteConfig().catch(() => null);
    const siteId = cfg?.site?.id || null;
    const conn = await getGithubConnection(siteId);
    if (!conn || !conn.enabled || !conn.repo) return null;
    return { conn, checkUpdateViaPat, applyUpdateViaPat };
  } catch {
    return null;
  }
}

let cachedCfg: ManagementCfg | null = null;

async function loadManagementCfg(): Promise<ManagementCfg> {
  if (cachedCfg) return cachedCfg;

  // Allow a runtime override stored in localStorage (e.g. after register).
  try {
    const raw = localStorage.getItem(LOCAL_CFG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ManagementCfg>;
      if (parsed.management_url && parsed.management_anon_key) {
        cachedCfg = {
          management_url: parsed.management_url,
          management_anon_key: parsed.management_anon_key,
          site_id: parsed.site_id || "",
          install_token: parsed.install_token || "",
        };
        return cachedCfg;
      }
    }
  } catch {
    /* ignore */
  }

  const res = await fetch("/cms.config.json", { cache: "no-store" });
  if (!res.ok) throw new Error("cms.config.json missing — cannot reach Parent Management");
  const j = await res.json();
  if (!j.management_url || !j.management_anon_key) {
    throw new Error("cms.config.json missing management_url / management_anon_key");
  }
  cachedCfg = {
    management_url: String(j.management_url).replace(/\/+$/, ""),
    management_anon_key: String(j.management_anon_key),
    site_id: String(j.site_id || ""),
    install_token: String(j.install_token || ""),
  };
  return cachedCfg;
}

function persistLocalCfg(next: Partial<ManagementCfg>) {
  try {
    const merged = { ...(cachedCfg || {}), ...next };
    cachedCfg = merged as ManagementCfg;
    localStorage.setItem(LOCAL_CFG_KEY, JSON.stringify(merged));
  } catch {
    /* ignore */
  }
}

async function callFn<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const cfg = await loadManagementCfg();
  const url = `${cfg.management_url}/functions/v1/${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: cfg.management_anon_key,
      Authorization: `Bearer ${cfg.management_anon_key}`,
    },
    body: JSON.stringify({
      site_id: cfg.site_id || undefined,
      install_token: cfg.install_token || undefined,
      ...body,
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`${path} ${res.status}: ${txt || res.statusText}`);
  }
  return (await res.json()) as T;
}

/** Get the current local management config (cached / from cms.config.json). */
export async function getLocalManagementCfg(): Promise<ManagementCfg> {
  return loadManagementCfg();
}

/** Register this site with the Parent Management Site. Idempotent. */
export async function registerSite(opts?: {
  site_url?: string;
  github_repo?: string;
}): Promise<{ site_id: string; install_token: string }> {
  const cfg = await loadManagementCfg();
  const body = {
    site_id: cfg.site_id || undefined,
    install_token: cfg.install_token || undefined,
    site_url: opts?.site_url || (typeof window !== "undefined" ? window.location.origin : undefined),
    github_repo: opts?.github_repo,
  };
  const res = await fetch(`${cfg.management_url}/functions/v1/parent-register-site`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: cfg.management_anon_key,
      Authorization: `Bearer ${cfg.management_anon_key}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`parent-register-site ${res.status}: ${await res.text().catch(() => "")}`);
  }
  const j = (await res.json()) as { site_id: string; install_token: string };
  persistLocalCfg({ site_id: j.site_id, install_token: j.install_token });
  return j;
}

/** Pull the sanitized config from Tier 1. Cached for 5 minutes in localStorage. */
export async function pullConfig(opts?: { force?: boolean }): Promise<RemoteSiteConfig> {
  if (!opts?.force) {
    try {
      const raw = localStorage.getItem(CFG_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as RemoteSiteConfig;
        if (Date.now() - (parsed.fetched_at || 0) < CFG_CACHE_TTL_MS) return parsed;
      }
    } catch {
      /* ignore */
    }
  }
  if (await isSelfParent()) {
    // No Tier-1 to ask. Surface whatever the local GitHub connection knows.
    const local = await tryLocalGithub();
    const next: RemoteSiteConfig = {
      parent_repo: local?.conn?.repo || "",
      default_branch: local?.conn?.branch || "main",
      update_workflow_filename: "cms-update.yml",
      channel: "stable",
      auto_update: false,
      registry_endpoints: {},
      signing_public_key: null,
      fetched_at: Date.now(),
    };
    try { localStorage.setItem(CFG_CACHE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    return next;
  }
  const data = await callFn<Omit<RemoteSiteConfig, "fetched_at">>("parent-site-config", {});
  const next: RemoteSiteConfig = { ...data, fetched_at: Date.now() };
  try {
    localStorage.setItem(CFG_CACHE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

/** Ask Tier 1 whether an update is available. */
export async function checkUpdate(): Promise<UpdateCheck> {
  let currentVersion: string | null = null;
  let currentSha: string | null = null;
  try {
    const res = await fetch("/cms.lock.json", { cache: "no-store" });
    if (res.ok) {
      const j = await res.json();
      currentVersion = j.version ?? j.tag ?? null;
      currentSha = j.sha ?? null;
    }
  } catch {
    /* ignore */
  }
  // Manual GitHub PAT takes precedence when configured.
  const local = await tryLocalGithub();
  if (local) {
    return local.checkUpdateViaPat(local.conn, currentVersion);
  }
  if (await isSelfParent()) {
    // Self-parent without a configured GitHub PAT: nothing to check.
    return {
      latestVersion: currentVersion,
      latestSha: currentSha,
      publishedAt: null,
      changelogUrl: null,
      updateAvailable: false,
    };
  }
  return callFn<UpdateCheck>("parent-update-check", { currentVersion, currentSha });
}

/** Ask Tier 1 to apply the update — dispatches the workflow on this site's repo. */
export async function applyUpdate(target?: { ref?: string }): Promise<{
  ok: boolean;
  dispatched: boolean;
  actionsUrl?: string;
}> {
  const local = await tryLocalGithub();
  if (local) {
    const r = await local.applyUpdateViaPat(local.conn, target?.ref);
    if (!r.ok) throw new Error(r.error || "GitHub dispatch failed");
    return { ok: true, dispatched: r.dispatched, actionsUrl: r.actionsUrl };
  }
  if (await isSelfParent()) {
    throw new Error("Configure a GitHub connection (PAT + repo) under Settings to install updates.");
  }
  return callFn("parent-update-apply", { targetRef: target?.ref });
}

/** Clear cached config (e.g. after rotating install_token). */
export function clearCache() {
  cachedCfg = null;
  try {
    localStorage.removeItem(CFG_CACHE_KEY);
    localStorage.removeItem(LOCAL_CFG_KEY);
  } catch {
    /* ignore */
  }
}