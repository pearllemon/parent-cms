import {
  adminClient,
  authenticateSite,
  corsHeaders,
  json,
  loadReleaseConfig,
} from '../_shared.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'POST required' }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const sb = adminClient();
    const site = await authenticateSite(sb, body.site_id, body.install_token);
    const cfg = await loadReleaseConfig(sb);

    await sb
      .from('parent_managed_sites')
      .update({ last_config_pull_at: new Date().toISOString() })
      .eq('site_id', site.site_id);

    // Sanitized — no tokens, no service-role secrets.
    return json({
      parent_repo: cfg.parent_repo,
      default_branch: cfg.default_branch,
      update_workflow_filename: cfg.update_workflow_filename,
      channel: site.update_channel,
      auto_update: site.auto_update,
      registry_endpoints: cfg.registry_endpoints || {},
      signing_public_key: cfg.signing_public_key || null,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});