import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const PARENT_REPO = 'pearllemon/parent-cms';
const GH = 'https://api.github.com';

function ghHeaders() {
  const token = Deno.env.get('GITHUB_INSTALLER_TOKEN');
  const h: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'parent-cms-self-update',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function gh(path: string, init?: RequestInit) {
  const res = await fetch(`${GH}${path}`, { ...init, headers: { ...ghHeaders(), ...(init?.headers || {}) } });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`GitHub ${init?.method || 'GET'} ${path} ${res.status}: ${txt}`);
  }
  return res.json();
}

/**
 * Opens a PR in the *child* repo that bumps cms.lock.json to the latest
 * parent-cms commit/tag and rewrites src/cms-managed/ from that ref.
 * The actual file rewrite is delegated to the existing
 * `.github/workflows/cms-update.yml` workflow inside the child repo:
 * we just dispatch it. No Lovable AI credits are used.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ ok: false, error: 'POST required' }), {
        status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const childRepo: string | undefined = body.childRepo; // "owner/repo"
    const targetRef: string | undefined = body.targetRef; // tag or sha; default = latest main

    if (!childRepo || !childRepo.includes('/')) {
      return new Response(JSON.stringify({ ok: false, error: 'childRepo "owner/repo" required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Resolve target ref
    let ref = targetRef;
    let sha: string | null = null;
    if (!ref) {
      const c = await gh(`/repos/${PARENT_REPO}/commits/main`);
      sha = c.sha;
      ref = sha!;
    }

    // Dispatch the child's update workflow
    await gh(`/repos/${childRepo}/actions/workflows/cms-update.yml/dispatches`, {
      method: 'POST',
      body: JSON.stringify({ ref: 'main', inputs: { parent_ref: ref! } }),
    });

    // Log to child_upgrade_log via service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    await supabase.from('child_upgrade_log').insert({
      child_repo: childRepo,
      target_ref: ref,
      status: 'dispatched',
      note: 'cms-update workflow dispatched via cms-self-update-apply',
    }).then(() => null, () => null); // ignore schema mismatch

    return new Response(JSON.stringify({
      ok: true,
      dispatched: true,
      childRepo,
      parentRef: ref,
      actionsUrl: `https://github.com/${childRepo}/actions/workflows/cms-update.yml`,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err?.message || err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});