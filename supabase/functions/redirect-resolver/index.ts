// Lookup a redirect for a given path. Returns { to, status, match_type } or 404.
// Used by RedirectsGate as a server-side authoritative source (with client cache).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function normalize(p: string): string {
  if (!p) return "/";
  let out = p.trim();
  if (!out.startsWith("/")) out = "/" + out;
  if (out.length > 1 && out.endsWith("/")) out = out.slice(0, -1);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const path = normalize(url.searchParams.get("path") || "/");
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data } = await supabase.from("redirects").select("*").eq("enabled", true);
  const rows = (data || []) as any[];
  const exact = rows.find((r) => r.match_type === "exact" && normalize(r.from_path) === path);
  let match = exact;
  if (!match) {
    const prefixes = rows
      .filter((r) => r.match_type === "prefix" && path.startsWith(normalize(r.from_path)))
      .sort((a, b) => b.from_path.length - a.from_path.length);
    match = prefixes[0];
  }

  if (!match) {
    return new Response(JSON.stringify({ match: null }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=60" },
    });
  }

  // record hit (fire-and-forget)
  supabase.from("redirects")
    .update({ hits: (match.hits || 0) + 1, last_hit_at: new Date().toISOString() })
    .eq("id", match.id).then(() => {}).catch?.(() => {});

  return new Response(JSON.stringify({
    match: { id: match.id, to: match.to_url, status: match.status_code, match_type: match.match_type },
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=30" },
  });
});
