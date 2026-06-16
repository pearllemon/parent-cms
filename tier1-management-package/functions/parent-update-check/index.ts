import {
  adminClient,
  authenticateSite,
  corsHeaders,
  ghHeaders,
  json,
  loadReleaseConfig,
} from '../_shared.ts';

const GH = 'https://api.github.com';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'POST required' }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const sb = adminClient();
    const site = await authenticateSite(sb, body.site_id, body.install_token);
    const cfg = await loadReleaseConfig(sb);

    const currentVersion: string | null = body.currentVersion ?? null;
    const currentSha: string | null = body.currentSha ?? null;

    let latestVersion: string | null = null;
    let latestSha: string | null = null;
    let changelogUrl: string | null = null;
    let publishedAt: string | null = null;

    // Beta channel: take the most recent release including pre-releases.
    // Stable: take "latest" (which excludes pre-releases).
    if (site.update_channel === 'beta') {
      const r = await fetch(
        `${GH}/repos/${cfg.parent_repo}/releases?per_page=1`,
        { headers: ghHeaders() },
      );
      if (r.ok) {
        const arr = await r.json();
        const rel = Array.isArray(arr) ? arr[0] : null;
        if (rel) {
          latestVersion = rel.tag_name ?? rel.name ?? null;
          changelogUrl = rel.html_url ?? null;
          publishedAt = rel.published_at ?? null;
        }
      }
    } else {
      const r = await fetch(
        `${GH}/repos/${cfg.parent_repo}/releases/latest`,
        { headers: ghHeaders() },
      );
      if (r.ok) {
        const rel = await r.json();
        latestVersion = rel.tag_name ?? rel.name ?? null;
        changelogUrl = rel.html_url ?? null;
        publishedAt = rel.published_at ?? null;
      }
    }

    // Always fetch the default-branch HEAD as a fallback / sha indicator.
    const c = await fetch(
      `${GH}/repos/${cfg.parent_repo}/commits/${cfg.default_branch}`,
      { headers: ghHeaders() },
    );
    if (c.ok) {
      const j = await c.json();
      latestSha = j.sha ?? null;
      if (!latestVersion) latestVersion = latestSha ? latestSha.slice(0, 7) : null;
      if (!changelogUrl && latestSha) {
        changelogUrl = `https://github.com/${cfg.parent_repo}/commit/${latestSha}`;
      }
      if (!publishedAt) publishedAt = j.commit?.committer?.date ?? null;
    }

    const updateAvailable =
      (!!latestVersion && !!currentVersion && latestVersion !== currentVersion) ||
      (!!latestSha && !!currentSha && latestSha !== currentSha) ||
      (!currentVersion && !currentSha && !!latestVersion);

    // Cache the reported current version/sha on the site row.
    if (currentVersion || currentSha) {
      await sb
        .from('parent_managed_sites')
        .update({
          current_version: currentVersion,
          current_sha: currentSha,
        })
        .eq('site_id', site.site_id);
    }

    return json({
      latestVersion,
      latestSha,
      publishedAt,
      changelogUrl,
      updateAvailable,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});