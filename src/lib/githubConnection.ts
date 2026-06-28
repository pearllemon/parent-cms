/**
 * Per-site GitHub connection (manual PAT fallback to the Parent-Management-
 * driven update flow). Stored in `public.cms_github_connections`.
 *
 * Used by `managementClient` to check + apply CMS updates directly against
 * GitHub when an admin has configured a repo + PAT, bypassing Tier 1.
 */
import { supabase as cloud } from "@/integrations/supabase/client";

function resolvePat(c: GithubConnection): string {
  return (c.pat && c.pat.trim()) || "";
}

async function proxy(action: "test" | "latest" | "dispatch", c: GithubConnection, extra: Record<string, unknown> = {}) {
  const { data, error } = await (cloud.functions.invoke as any)("github-proxy", {
    body: {
      action,
      repo: c.repo,
      branch: c.branch,
      workflow_filename: c.workflow_filename,
      pat: resolvePat(c) || null,
      ...extra,
    },
  });
  if (error) throw new Error(error.message || "github-proxy failed");
  return data as any;
}

export type GithubConnection = {
  id?: string;
  site_id: string | null;
  repo: string;                       // "owner/repo"
  branch: string;
  visibility: "public" | "private";
  pat: string | null;
  workflow_filename: string | null;
  enabled: boolean;
  last_checked_at?: string | null;
  last_release_tag?: string | null;
  last_release_sha?: string | null;
  notes?: string | null;
};

const T = "cms_github_connections";

export async function getGithubConnection(siteId: string | null): Promise<GithubConnection | null> {
  let q = (cloud.from as any)(T).select("*").limit(1);
  q = siteId ? q.eq("site_id", siteId) : q.is("site_id", null);
  const { data, error } = await q.maybeSingle();
  if (error) return null;
  return (data as GithubConnection) || null;
}

export async function saveGithubConnection(c: GithubConnection): Promise<GithubConnection> {
  const payload = { ...c, updated_at: new Date().toISOString() };
  const { data, error } = await (cloud.from as any)(T)
    .upsert(payload, { onConflict: "site_id" })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as GithubConnection;
}

export async function testGithubConnection(c: GithubConnection): Promise<{
  ok: boolean;
  repoExists: boolean;
  isPrivate: boolean | null;
  latestRelease: { tag: string; sha: string | null; url: string } | null;
  error?: string;
}> {
  try {
    const r = await proxy("test", c);
    return {
      ok: !!r?.ok,
      repoExists: !!r?.repoExists,
      isPrivate: r?.isPrivate ?? null,
      latestRelease: r?.latestRelease ?? null,
      error: r?.error,
    };
  } catch (e: any) {
    return { ok: false, repoExists: false, isPrivate: null, latestRelease: null, error: e?.message || String(e) };
  }
}

export async function checkUpdateViaPat(c: GithubConnection, currentVersion: string | null) {
  const t = await testGithubConnection(c);
  if (!t.ok || !t.latestRelease) {
    return { latestVersion: null, latestSha: null, publishedAt: null, changelogUrl: null, updateAvailable: false };
  }
  const latest = t.latestRelease;
  const updateAvailable = !!latest.tag && latest.tag !== currentVersion;
  return {
    latestVersion: latest.tag,
    latestSha: latest.sha,
    publishedAt: null,
    changelogUrl: latest.url,
    updateAvailable,
  };
}

export async function applyUpdateViaPat(c: GithubConnection, ref?: string): Promise<{
  ok: boolean;
  dispatched: boolean;
  actionsUrl?: string;
  error?: string;
}> {
  try {
    const r = await proxy("dispatch", c, ref ? { ref } : {});
    return {
      ok: !!r?.ok,
      dispatched: !!r?.dispatched,
      actionsUrl: r?.actionsUrl,
      error: r?.error,
    };
  } catch (e: any) {
    return { ok: false, dispatched: false, error: e?.message || String(e) };
  }
}