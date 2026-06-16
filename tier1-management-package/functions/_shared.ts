// Shared helpers for parent-* edge functions (Tier 1).
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );
}

export async function authenticateSite(
  sb: SupabaseClient,
  site_id: string | undefined,
  install_token: string | undefined,
) {
  if (!site_id || !install_token) {
    throw new Response(JSON.stringify({ error: 'site_id + install_token required' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const { data, error } = await sb
    .from('parent_managed_sites')
    .select('*')
    .eq('site_id', site_id)
    .eq('install_token', install_token)
    .maybeSingle();
  if (error || !data) {
    throw new Response(JSON.stringify({ error: 'invalid site_id / install_token' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  await sb
    .from('parent_managed_sites')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('site_id', site_id);
  return data;
}

export async function loadReleaseConfig(sb: SupabaseClient) {
  const { data, error } = await sb
    .from('parent_release_config')
    .select('*')
    .eq('singleton', true)
    .maybeSingle();
  if (error || !data) {
    throw new Response(JSON.stringify({ error: 'parent_release_config not initialized' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  return data;
}

export function ghHeaders() {
  const token = Deno.env.get('GITHUB_INSTALLER_TOKEN');
  const h: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'parent-management',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

export function newToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}