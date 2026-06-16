/**
 * Per-site GitHub connection (manual PAT fallback to the Parent-Management-
 * driven update flow). Stored in `public.cms_github_connections`.
 *
 * Used by `managementClient` to check + apply CMS updates directly against
 * GitHub when an admin has configured a repo + PAT, bypassing Tier 1.
 */
import { supabase as cloud } from "@/integrations/supabase/client";

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
  const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
  if (c.pat) headers.Authorization = `Bearer ${c.pat.trim()}`;
  try {
    const repoRes = await fetch(`https://api.github.com/repos/${c.repo}`, { headers });
    if (!repoRes.ok) {
      const body = await repoRes.text().catch(() => "");
      return { ok: false, repoExists: false, isPrivate: null, latestRelease: null, error: `GitHub ${repoRes.status}: ${body.slice(0, 200)}` };
    }
    const repo = await repoRes.json();
    const relRes = await fetch(`https://api.github.com/repos/${c.repo}/releases/latest`, { headers });
    let latest: { tag: string; sha: string | null; url: string } | null = null;
    if (relRes.ok) {
      const r = await relRes.json();
      latest = { tag: r.tag_name, sha: r.target_commitish || null, url: r.html_url };
    }
    return { ok: true, repoExists: true, isPrivate: !!repo.private, latestRelease: latest };
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
  if (!c.pat) return { ok: false, dispatched: false, error: "GitHub PAT required for workflow dispatch" };
  const wf = c.workflow_filename || "cms-update.yml";
  const res = await fetch(`https://api.github.com/repos/${c.repo}/actions/workflows/${wf}/dispatches`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${c.pat.trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ref: c.branch || "main",
      inputs: ref ? { target_ref: ref } : {},
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, dispatched: false, error: `dispatch ${res.status}: ${body.slice(0, 200)}` };
  }
  return { ok: true, dispatched: true, actionsUrl: `https://github.com/${c.repo}/actions` };
}