// Server-side GitHub proxy with authentication guard.
// - Avoids browser "Failed to fetch" / CORS surprises when child CMS sites
//   talk to api.github.com directly.
// - Resolves the PAT in this order:
//     1) `pat` field on request body (user-entered in the editor)
//     2) `GITHUB_INSTALLER_TOKEN` secret (parent-managed, recommended)
// - Supports actions:
//     test         GET  /repos/:repo + /releases/latest
//     latest       GET  /releases/latest
//     dispatch     POST /actions/workflows/:file/dispatches

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
async function requireAuth(req: Request): Promise<Response | { uid: string }> {
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  const token = auth.slice(7);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  return { uid: data.user.id };
}

type Body = {
  action: "test" | "latest" | "dispatch";
  repo: string;
  branch?: string;
  workflow_filename?: string;
  ref?: string;
  pat?: string | null;
};

const SECRET_PAT = Deno.env.get("GITHUB_INSTALLER_TOKEN") || "";

function pickToken(reqPat?: string | null): string {
  const p = (reqPat || "").trim();
  if (p) return p;
  return SECRET_PAT.trim();
}

async function gh(url: string, token: string, init: RequestInit = {}) {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "lovable-cms-proxy",
    ...(init.headers as Record<string, string> || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  let json: unknown = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* keep text */ }
  return { ok: res.ok, status: res.status, body: json, raw: text };
}

Deno.serve(async (req) => {
  // Authentication guard for all non-OPTIONS requests
  if (req.method !== "OPTIONS") {
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
  }
  // Authentication guard
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.split(" ")[1] || "";
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthenticated" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    if (!body?.repo || !/^[\w.-]+\/[\w.-]+$/.test(body.repo)) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid repo (expected owner/name)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = pickToken(body.pat);

    if (body.action === "test") {
      const repoRes = await gh(`https://api.github.com/repos/${body.repo}`, token);
      if (!repoRes.ok) {
        return new Response(JSON.stringify({
          ok: false, repoExists: false, isPrivate: null, latestRelease: null,
          tokenUsed: token ? (body.pat ? "request" : "secret") : "none",
          error: `GitHub ${repoRes.status}: ${repoRes.raw.slice(0, 200)}`,
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const repo = repoRes.body as any;
      const relRes = await gh(`https://api.github.com/repos/${body.repo}/releases/latest`, token);
      const latest = relRes.ok ? {
        tag: (relRes.body as any).tag_name,
        sha: (relRes.body as any).target_commitish || null,
        url: (relRes.body as any).html_url,
      } : null;
      return new Response(JSON.stringify({
        ok: true, repoExists: true, isPrivate: !!repo.private, latestRelease: latest,
        tokenUsed: token ? (body.pat ? "request" : "secret") : "none",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (body.action === "latest") {
      const r = await gh(`https://api.github.com/repos/${body.repo}/releases/latest`, token);
      return new Response(JSON.stringify({ ok: r.ok, status: r.status, release: r.body }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "dispatch") {
      if (!token) {
        return new Response(JSON.stringify({ ok: false, error: "No GitHub token configured (request PAT or GITHUB_INSTALLER_TOKEN secret required)" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const wf = body.workflow_filename || "cms-update.yml";
      const r = await gh(
        `https://api.github.com/repos/${body.repo}/actions/workflows/${wf}/dispatches`,
        token,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ref: body.branch || "main",
            inputs: body.ref ? { target_ref: body.ref } : {},
          }),
        },
      );
      if (!r.ok) {
        return new Response(JSON.stringify({ ok: false, dispatched: false, error: `dispatch ${r.status}: ${r.raw.slice(0, 200)}` }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ ok: true, dispatched: true, actionsUrl: `https://github.com/${body.repo}/actions` }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: false, error: `Unknown action: ${body.action}` }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});