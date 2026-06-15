// cms-release — public edge function for the CMS Core distribution pipeline.
//
//   GET  /cms-release[?version=x&site_id=y]   → manifest envelope (signed)
//   POST /cms-release/register                → idempotent child registration
//   POST /cms-release/heartbeat               → periodic state report
//   POST /cms-release/upgrade-log             → migration progress events
//
// The manifest envelope is shaped EXACTLY as the child SDK expects:
//
//   {
//     siteId, version, previousVersion,
//     payload: { version, sdk_url, min_compatible_child_version, manifest, migrations: [...] },
//     payload_canonical: "<the exact bytes that were signed>",
//     signature_b64, signing_key_id, signed_at,
//     // legacy / convenience fields (also present at top level):
//     sdk_url, changelog, recalled, min_compatible_child_version, migrations,
//     manifest, signature, payload_hash
//   }
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

// Stable JSON serializer — keys sorted, no whitespace. MUST match the
// canonicalize() in src/lib/releaseSigning.ts and src/cms-core/verify.ts.
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalize).join(",") + "]";
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return "{" + keys.map((k) =>
    JSON.stringify(k) + ":" + canonicalize((value as Record<string, unknown>)[k])
  ).join(",") + "}";
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
        site_name: site_name || null,
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
        upgrade_state, last_error, registration_token,
      } = body || {};
      if (!site_id) return json({ error: "site_id required" }, 400);
      if (!registration_token) return json({ error: "registration_token required" }, 401);

      const { data: existing } = await sb
        .from("child_installations")
        .select("id, registration_token")
        .eq("site_id", site_id).maybeSingle();
      if (!existing) return json({ error: "unknown site_id — call /register first" }, 404);
      if (existing.registration_token !== registration_token) {
        return json({ error: "invalid registration_token for site_id" }, 403);
      }

      await sb.from("child_installations").update({
        site_name: site_name || null,
        site_url: site_url || null,
        current_version: current_version || null,
        child_shim_version: child_shim_version || null,
        upgrade_state: upgrade_state || "unknown",
        last_error: last_error || null,
        last_seen_at: new Date().toISOString(),
      }).eq("id", existing.id);
      return json({ ok: true });
    }

    /* ------------------------- POST /upgrade-log ------------------------- */
    if (req.method === "POST" && path.startsWith("/upgrade-log")) {
      const body = await req.json().catch(() => ({} as any));
      const {
        site_id, from_version, to_version, status, snapshot, error,
        duration_ms, registration_token,
      } = body || {};
      if (!site_id || !to_version || !status) return json({ error: "missing fields" }, 400);
      if (!registration_token) return json({ error: "registration_token required" }, 401);

      const { data: existing } = await sb
        .from("child_installations")
        .select("id, registration_token")
        .eq("site_id", site_id).maybeSingle();
      if (!existing) return json({ error: "unknown site_id" }, 404);
      if (existing.registration_token !== registration_token) {
        return json({ error: "invalid registration_token for site_id" }, 403);
      }

      await sb.from("child_upgrade_log").insert({
        site_id, from_version: from_version || null, to_version, status,
        snapshot: snapshot || null, error: error || null, duration_ms: duration_ms || null,
      });
      return json({ ok: true });
    }

    /* ------------------------- GET manifest ------------------------- */
    if (req.method === "GET") {
      const version = url.searchParams.get("version");
      const siteId = url.searchParams.get("site_id");
      const action = url.searchParams.get("action");

      // GET ?action=list — admin convenience listing (no signing required).
      if (action === "list") {
        const { data } = await sb
          .from("cms_releases").select("*")
          .order("published_at", { ascending: false });
        return json(
          { releases: data || [] }, 200,
          { "Cache-Control": "private, no-store" },
        );
      }

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

      // GET ?action=manifest&version=X — returns ONLY the populated manifest body.
      if (action === "manifest") {
        if (!release) {
          return json({ status: "no_release", manifest: {} }, 200,
            { "Cache-Control": "public, s-maxage=10" });
        }
        return json(
          { version: release.version, manifest: release.manifest || {}, published_at: release.published_at },
          200,
          { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
        );
      }

      if (!release) {
        // Graceful "no release yet" envelope — children treat this as
        // "connected, waiting for first release" rather than an error.
        return json(
          {
            status: "no_release",
            ok: true,
            siteId: siteId || null,
            version: null,
            previousVersion: null,
            payload: null,
            payload_canonical: null,
            signature_b64: null,
            signing_key_id: null,
            signed_at: null,
            sdk_url: null,
            changelog: null,
            min_compatible_child_version: null,
            recalled: false,
            published_at: null,
            manifest: {},
            migrations: [],
            signature: null,
            payload_hash: null,
            message: "No release has been published yet. The site is connected and will receive the first release automatically.",
          },
          200,
          { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=60" },
        );
      }

      const { data: migrationsRaw } = await sb
        .from("cms_migration_manifest").select("*")
        .eq("version", release.version).order("order_index");
      const migrations = (migrationsRaw || []).map((m: any) => ({
        id: m.migration_id || `${release.version}:${m.order_index}`,
        order_index: m.order_index,
        kind: m.kind,
        payload: m.payload,
        reversible: !!m.reversible,
      }));

      // Build the payload object EXACTLY as it was signed.
      const payloadComputed = {
        version: release.version,
        sdk_url: release.sdk_url ?? null,
        min_compatible_child_version: release.min_compatible_child_version ?? null,
        manifest: release.manifest || {},
        migrations,
      };
      // PREFER the stored canonical bytes (frozen at signing time). Fall back
      // to recompute for legacy releases signed before payload_canonical was
      // persisted.
      const payload_canonical = release.payload_canonical || canonicalize(payloadComputed);

      // Best-effort: previousVersion from the installation row (if site_id provided).
      let previousVersion: string | null = null;
      if (siteId) {
        const { data: inst } = await sb
          .from("child_installations").select("current_version")
          .eq("site_id", siteId).maybeSingle();
        previousVersion = inst?.current_version || null;
      }

      return json(
        {
          siteId: siteId || null,
          version: release.version,
          previousVersion,
          payload: payloadComputed,
          payload_canonical,
          signature_b64: release.signature || null,
          signing_key_id: release.signing_key_id || null,
          signed_at: release.signed_at || null,

          // Top-level convenience / legacy fields.
          sdk_url: release.sdk_url,
          changelog: release.changelog,
          min_compatible_child_version: release.min_compatible_child_version,
          recalled: release.recalled,
          published_at: release.published_at,
          manifest: release.manifest || {},
          migrations,
          signature: release.signature || null,
          payload_hash: release.payload_hash || null,
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
