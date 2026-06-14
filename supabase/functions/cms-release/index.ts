// cms-release — public edge function for the CMS Core distribution pipeline.
//
//   GET  /cms-release[?version=x]    → manifest (latest non-recalled, or specific)
//   POST /cms-release/register       → idempotent child registration
//   POST /cms-release/heartbeat      → periodic state report
//   POST /cms-release/upgrade-log    → migration progress events
//
// All endpoints accept CORS so children running on any origin can reach them.

// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function admin() {
  return createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
}

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(req.url);
  const path = url.pathname.replace(/^.*\/cms-release/, "") || "/";

  try {
    const sb = admin();

    /* ------------------------- POST /register ------------------------- */
    if (req.method === "POST" && path.startsWith("/register")) {
      const body = await req.json().catch(() => ({} as any));
      const { site_id, site_name, site_url, mode, shim_version } = body || {};
      if (!site_id) return json({ error: "site_id required" }, 400);

      const { data: existing } = await sb
        .from("child_installations").select("id, registration_token")
        .eq("site_id", site_id).maybeSingle();

      const token = existing?.registration_token ||
        crypto.randomUUID().replace(/-/g, "");

      const row: any = {
        site_id,
        site_name: site_name || existing?.id ? site_name : null,
        site_url: site_url || null,
        mode: mode === "hybrid" ? "hybrid" : "child",
        child_shim_version: shim_version || null,
        registration_token: token,
        upgrade_state: "pending",
        last_seen_at: new Date().toISOString(),
      };

      if (existing?.id) {
        await sb.from("child_installations").update(row).eq("id", existing.id);
      } else {
        await sb.from("child_installations").insert(row);
      }
      return json({ ok: true, site_id, registration_token: token });
    }

    /* ------------------------- POST /heartbeat ------------------------- */
    if (req.method === "POST" && path.startsWith("/heartbeat")) {
      const body = await req.json().catch(() => ({} as any));
      const {
        site_id, site_name, site_url, current_version, child_shim_version,
        upgrade_state, last_error,
      } = body || {};
      if (!site_id) return json({ error: "site_id required" }, 400);

      const { data: existing } = await sb
        .from("child_installations").select("id").eq("site_id", site_id).maybeSingle();

      const row: any = {
        site_id,
        site_name: site_name || null,
        site_url: site_url || null,
        current_version: current_version || null,
        child_shim_version: child_shim_version || null,
        upgrade_state: upgrade_state || "unknown",
        last_error: last_error || null,
        last_seen_at: new Date().toISOString(),
      };

      if (existing?.id) await sb.from("child_installations").update(row).eq("id", existing.id);
      else await sb.from("child_installations").insert(row);
      return json({ ok: true });
    }

    /* ------------------------- POST /upgrade-log ------------------------- */
    if (req.method === "POST" && path.startsWith("/upgrade-log")) {
      const body = await req.json().catch(() => ({} as any));
      const { site_id, from_version, to_version, status, snapshot, error, duration_ms } = body || {};
      if (!site_id || !to_version || !status) return json({ error: "missing fields" }, 400);
      await sb.from("child_upgrade_log").insert({
        site_id, from_version: from_version || null, to_version, status,
        snapshot: snapshot || null, error: error || null, duration_ms: duration_ms || null,
      });
      return json({ ok: true });
    }

    /* ------------------------- GET manifest ------------------------- */
    if (req.method === "GET") {
      const version = url.searchParams.get("version");
      let release: any = null;
      if (version) {
        const r = await sb.from("cms_releases").select("*").eq("version", version).maybeSingle();
        release = r.data;
      } else {
        const r = await sb
          .from("cms_releases").select("*")
          .eq("is_latest", true).eq("recalled", false).maybeSingle();
        release = r.data;
      }
      if (!release) return json({ error: "no release available" }, 404);

      const { data: migrations } = await sb
        .from("cms_migration_manifest").select("*")
        .eq("version", release.version).order("order_index");

      return json(
        {
          version: release.version,
          sdk_url: release.sdk_url,
          changelog: release.changelog,
          min_compatible_child_version: release.min_compatible_child_version,
          recalled: release.recalled,
          published_at: release.published_at,
          manifest: release.manifest || {},
          migrations: migrations || [],
          // Signature envelope — children verify this BEFORE applying anything.
          signature: release.signature || null,
          signing_key_id: release.signing_key_id || null,
          payload_hash: release.payload_hash || null,
          signed_at: release.signed_at || null,
        },
        200,
        { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=300" },
      );
    }

    return json({ error: "not found" }, 404);
  } catch (e: any) {
    return json({ error: String(e?.message || e) }, 500);
  }
});
