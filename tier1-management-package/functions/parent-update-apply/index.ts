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

    if (!site.github_repo || !site.github_repo.includes('/')) {
      return json(
        { error: 'site has no github_repo registered; set parent_managed_sites.github_repo' },
        400,
      );
    }

    // Resolve target ref
    let ref: string | undefined = body.targetRef;
    if (!ref) {
      const c = await fetch(
        `${GH}/repos/${cfg.parent_repo}/commits/${cfg.default_branch}`,
        { headers: ghHeaders() },
      );
      if (!c.ok) {
        return json({ error: `cannot resolve latest ref: ${c.status}` }, 502);
      }
      const j = await c.json();
      ref = j.sha;
    }

    const wfPath = cfg.update_workflow_filename || 'cms-update.yml';
    const dispatchUrl = `${GH}/repos/${site.github_repo}/actions/workflows/${wfPath}/dispatches`;
    const dispatch = await fetch(dispatchUrl, {
      method: 'POST',
      headers: ghHeaders(),
      body: JSON.stringify({
        ref: 'main',
        inputs: { parent_ref: ref! },
      }),
    });
    if (!dispatch.ok) {
      const txt = await dispatch.text();
      return json(
        { error: `dispatch failed ${dispatch.status}: ${txt}` },
        502,
      );
    }

    await sb.from('child_upgrade_log').insert({
      site_id: site.site_id,
      github_repo: site.github_repo,
      target_ref: ref,
      status: 'dispatched',
      note: 'cms-update workflow dispatched via parent-update-apply',
    });

    return json({
      ok: true,
      dispatched: true,
      actionsUrl: `https://github.com/${site.github_repo}/actions/workflows/${wfPath}`,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});