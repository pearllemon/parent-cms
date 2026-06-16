import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const PARENT_REPO = 'pearllemon/parent-cms';
const GH = 'https://api.github.com';

function ghHeaders() {
  const token = Deno.env.get('GITHUB_INSTALLER_TOKEN');
  const h: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'parent-cms-self-update',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const currentVersion: string | null = body.currentVersion ?? null;
    const currentSha: string | null = body.currentSha ?? null;

    // 1) Latest GitHub release (preferred)
    let latestVersion: string | null = null;
    let latestSha: string | null = null;
    let changelogUrl: string | null = null;
    let publishedAt: string | null = null;

    const relRes = await fetch(`${GH}/repos/${PARENT_REPO}/releases/latest`, { headers: ghHeaders() });
    if (relRes.ok) {
      const rel = await relRes.json();
      latestVersion = rel.tag_name ?? rel.name ?? null;
      changelogUrl = rel.html_url ?? null;
      publishedAt = rel.published_at ?? null;
    }

    // 2) Fallback / always-fetched: latest commit on default branch
    const commitRes = await fetch(`${GH}/repos/${PARENT_REPO}/commits/main`, { headers: ghHeaders() });
    if (commitRes.ok) {
      const c = await commitRes.json();
      latestSha = c.sha ?? null;
      if (!latestVersion) latestVersion = latestSha ? latestSha.slice(0, 7) : null;
      if (!changelogUrl && latestSha) changelogUrl = `https://github.com/${PARENT_REPO}/commit/${latestSha}`;
      if (!publishedAt) publishedAt = c.commit?.committer?.date ?? null;
    }

    const updateAvailable =
      (!!latestVersion && !!currentVersion && latestVersion !== currentVersion) ||
      (!!latestSha && !!currentSha && latestSha !== currentSha) ||
      (!currentVersion && !currentSha && !!latestVersion);

    return new Response(JSON.stringify({
      ok: true,
      parentRepo: PARENT_REPO,
      currentVersion,
      currentSha,
      latestVersion,
      latestSha,
      publishedAt,
      changelogUrl,
      updateAvailable,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});