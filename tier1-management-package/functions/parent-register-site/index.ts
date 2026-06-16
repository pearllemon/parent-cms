import { adminClient, corsHeaders, json, newToken } from '../_shared.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'POST required' }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const sb = adminClient();

    let site_id: string | undefined = body.site_id;
    let install_token: string | undefined = body.install_token;

    // Existing site re-registering — verify the token still matches.
    if (site_id && install_token) {
      const { data } = await sb
        .from('parent_managed_sites')
        .select('site_id, install_token')
        .eq('site_id', site_id)
        .maybeSingle();
      if (data && data.install_token === install_token) {
        await sb
          .from('parent_managed_sites')
          .update({
            site_url: body.site_url ?? null,
            github_repo: body.github_repo ?? null,
            last_seen_at: new Date().toISOString(),
          })
          .eq('site_id', site_id);
        return json({ site_id, install_token, reused: true });
      }
    }

    // Fresh registration.
    site_id = crypto.randomUUID();
    install_token = newToken();
    const { error } = await sb.from('parent_managed_sites').insert({
      site_id,
      install_token,
      site_url: body.site_url ?? null,
      github_repo: body.github_repo ?? null,
      last_seen_at: new Date().toISOString(),
    });
    if (error) return json({ error: error.message }, 500);
    return json({ site_id, install_token, reused: false });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});