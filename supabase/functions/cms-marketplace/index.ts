// cms-marketplace — bi-directional Component Cloud API.
//
// Surfaces the §13 marketplace endpoints over a single edge function.
//
//   GET  /cms-marketplace?action=library&site_id=...&kind=section
//   GET  /cms-marketplace?action=asset&kind=section&id=<uuid>
//   GET  /cms-marketplace?action=preview&kind=section&id=<uuid>
//   POST /cms-marketplace?action=import_asset    body: { site_id, kind, id, mode: 'link'|'fork' }
//   POST /cms-marketplace?action=publish_asset   body: { site_id, kind, slug, name, payload, ... }
//   GET  /cms-marketplace?action=pending&kind=section
//   POST /cms-marketplace?action=approve         body: { id, notes? }
//   POST /cms-marketplace?action=reject          body: { id, notes? }
//
// Auth model: GET library/asset/preview is public (anon key). All mutations
// and the pending queue require a logged-in admin JWT.

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const admin = (): SupabaseClient =>
  createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

async function requireAuth(req: Request): Promise<{ uid: string } | Response> {
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) {
    return json({ error: "Unauthorized" }, 401);
  }
  const token = auth.slice(7);
  const sb = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data, error } = await sb.auth.getClaims(token);
  if (error || !data?.claims?.sub) return json({ error: "Unauthorized" }, 401);
  return { uid: data.claims.sub as string };
}

// Roll up cloud_components into "latest version per (kind, slug)" with
// status filtering. Anon callers only see approved+public; admins see all.
function latestPerSlug<T extends { kind: string; slug: string; version: number }>(rows: T[]): T[] {
  const byKey = new Map<string, T>();
  for (const row of rows) {
    const key = `${row.kind}:${row.slug}`;
    const existing = byKey.get(key);
    if (!existing || row.version > existing.version) byKey.set(key, row);
  }
  return [...byKey.values()];
}

// Wrap a section/template/widget into a minimal renderable HTML preview that
// inherits the requesting site's theme tokens (when available).
async function buildPreview(sb: SupabaseClient, kind: string, id: string, siteId?: string | null): Promise<string> {
  const { data: comp } = await sb.from("cloud_components").select("*").eq("id", id).maybeSingle();
  if (!comp) return `<!doctype html><body><pre>not found</pre>`;

  let tokens: Record<string, unknown> = {};
  if (siteId) {
    const { data: t } = await sb.from("theme_tokens").select("*").eq("site_id", siteId).maybeSingle();
    if (t) tokens = t as Record<string, unknown>;
  }

  const payload = (comp as { payload: Record<string, unknown> }).payload || {};
  const blocks = (payload.blocks as unknown[]) || [];
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${(comp as { name: string }).name} preview</title>
<style>body{margin:0;font-family:system-ui;padding:24px;background:#fafafa}.b{border:1px dashed #ddd;padding:16px;border-radius:8px;margin:8px 0;background:#fff}.b pre{font-size:11px;white-space:pre-wrap;color:#666}</style>
</head><body>
<h2>${(comp as { name: string }).name} <small style="opacity:.6">v${(comp as { version: number }).version} · ${(comp as { kind: string }).kind}</small></h2>
${blocks.map((b) => `<div class="b"><pre>${JSON.stringify(b, null, 2).replace(/</g, "&lt;")}</pre></div>`).join("")}
<details><summary>theme tokens</summary><pre>${JSON.stringify(tokens, null, 2)}</pre></details>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "library";
  const sb = admin();

  try {
    // -------- Public reads --------
    if (req.method === "GET" && action === "library") {
      const kind = url.searchParams.get("kind");
      const q = url.searchParams.get("q");
      let qry = sb.from("cloud_components")
        .select("id,kind,slug,version,name,description,category,preview_url,thumbnail_url,visibility,publisher_site_id,metadata,status,updated_at,submitted_at")
        .eq("recalled", false)
        .eq("status", "approved")
        .eq("visibility", "public")
        .order("updated_at", { ascending: false })
        .limit(500);
      if (kind) qry = qry.eq("kind", kind);
      const { data, error } = await qry;
      if (error) return json({ error: error.message }, 500);
      const items = latestPerSlug((data as { kind: string; slug: string; version: number }[]) || []);
      // Group by kind for the §13a response shape
      const grouped: Record<string, unknown[]> = {};
      for (const item of items) {
        const list = grouped[item.kind] || (grouped[item.kind] = []);
        if (!q || JSON.stringify(item).toLowerCase().includes(q.toLowerCase())) list.push(item);
      }
      return json({ items, grouped });
    }

    if (req.method === "GET" && action === "asset") {
      const kind = url.searchParams.get("kind");
      const id = url.searchParams.get("id");
      if (!kind || !id) return json({ error: "kind and id required" }, 400);
      const { data, error } = await sb.from("cloud_components")
        .select("*")
        .eq("id", id)
        .eq("kind", kind)
        .maybeSingle();
      if (error) return json({ error: error.message }, 500);
      if (!data) return json({ error: "not found" }, 404);
      return json(data);
    }

    if (req.method === "GET" && action === "preview") {
      const kind = url.searchParams.get("kind");
      const id = url.searchParams.get("id");
      const siteId = url.searchParams.get("site_id");
      if (!kind || !id) return json({ error: "kind and id required" }, 400);
      const html = await buildPreview(sb, kind, id, siteId);
      return new Response(html, {
        headers: { ...corsHeaders, "content-type": "text/html; charset=utf-8" },
      });
    }

    // -------- Authenticated reads (pending queue) --------
    if (req.method === "GET" && action === "pending") {
      const me = await requireAuth(req);
      if (me instanceof Response) return me;
      const { data, error } = await sb.from("cloud_components")
        .select("*")
        .eq("status", "pending_review")
        .order("submitted_at", { ascending: false })
        .limit(200);
      if (error) return json({ error: error.message }, 500);
      return json({ items: data || [] });
    }

    // -------- Authenticated mutations --------
    if (req.method === "POST" && action === "publish_asset") {
      const me = await requireAuth(req);
      if (me instanceof Response) return me;
      const body = await req.json();
      const { site_id, kind, slug, name, description, category, payload, preview_url, thumbnail_url, visibility, scope } = body || {};
      if (!kind || !slug || !name) return json({ error: "kind, slug, name required" }, 400);
      if (!["section", "template", "widget"].includes(kind)) return json({ error: "invalid kind" }, 400);

      // Next version number (per kind+slug).
      const { data: latest } = await sb.from("cloud_components")
        .select("version")
        .eq("kind", kind).eq("slug", slug)
        .order("version", { ascending: false })
        .limit(1).maybeSingle();
      const nextVersion = ((latest?.version as number) || 0) + 1;

      // Submissions from a child site → pending review.
      // Direct parent posts (no publisher_site_id) auto-approve.
      const isChildSubmission = !!site_id;
      const initialStatus = isChildSubmission ? "pending_review" : "approved";

      const { data, error } = await sb.from("cloud_components").insert([{
        kind,
        slug,
        name,
        description: description || null,
        category: category || null,
        payload: payload || {},
        preview_url: preview_url || null,
        thumbnail_url: thumbnail_url || null,
        visibility: (scope === "private" ? "private" : visibility) || "public",
        publisher_id: me.uid,
        publisher_site_id: site_id || null,
        version: nextVersion,
        status: initialStatus,
        submitted_at: new Date().toISOString(),
        reviewed_at: isChildSubmission ? null : new Date().toISOString(),
        reviewed_by: isChildSubmission ? null : me.uid,
      }]).select().single();
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, asset: data, status: initialStatus });
    }

    if (req.method === "POST" && action === "import_asset") {
      const me = await requireAuth(req);
      if (me instanceof Response) return me;
      const { site_id, kind, id, mode } = await req.json();
      if (!site_id || !kind || !id) return json({ error: "site_id, kind, id required" }, 400);

      const { data: comp, error: e1 } = await sb.from("cloud_components")
        .select("*").eq("id", id).eq("kind", kind).maybeSingle();
      if (e1) return json({ error: e1.message }, 500);
      if (!comp) return json({ error: "asset not found" }, 404);
      if ((comp as { status: string }).status !== "approved")
        return json({ error: "asset not approved" }, 403);

      // 'link' = upgrade-eligible install; 'fork' = clone with break-link.
      const linkMode = mode !== "fork";
      const payload = (comp as { payload: Record<string, unknown> }).payload || {};
      let localId: string | null = null;

      if (kind === "section") {
        const { data: row, error } = await sb.from("theme_sections").upsert({
          name: (comp as { name: string }).name,
          slug: linkMode ? (comp as { slug: string }).slug : `${(comp as { slug: string }).slug}-fork-${Date.now().toString(36)}`,
          category: (payload.category as string) || (comp as { category: string }).category || "uncategorized",
          description: (comp as { description: string }).description,
          blocks: payload.blocks ?? [],
          design_tokens: payload.design_tokens ?? {},
          variants: payload.variants ?? [],
          site_id,
          is_global: linkMode,
          source: linkMode ? "cloud" : "child",
          parent_section_id: linkMode ? (comp as { id: string }).id : null,
          version: (comp as { version: number }).version,
        }, { onConflict: "slug" }).select("id").single();
        if (error) return json({ error: error.message }, 500);
        localId = row?.id || null;
      } else if (kind === "template") {
        const { data: row, error } = await sb.from("theme_templates").upsert({
          name: (comp as { name: string }).name,
          slug: linkMode ? (comp as { slug: string }).slug : `${(comp as { slug: string }).slug}-fork-${Date.now().toString(36)}`,
          kind: (payload.kind as string) || "page",
          description: (comp as { description: string }).description,
          blocks: payload.blocks ?? [],
          preview_url: (comp as { preview_url: string }).preview_url,
          site_id,
          source: linkMode ? "cloud" : "child",
          version: (comp as { version: number }).version,
        }, { onConflict: "slug" }).select("id").single();
        if (error) return json({ error: error.message }, 500);
        localId = row?.id || null;
      }

      // Only `link` installs are tracked for upgrade notifications.
      if (linkMode) {
        await sb.from("cloud_component_installs").upsert({
          site_id,
          kind,
          slug: (comp as { slug: string }).slug,
          installed_version: (comp as { version: number }).version,
          local_id: localId,
          last_synced_at: new Date().toISOString(),
        }, { onConflict: "site_id,kind,slug" });
      }

      return json({ ok: true, mode: linkMode ? "link" : "fork", local_id: localId });
    }

    if (req.method === "POST" && (action === "approve" || action === "reject")) {
      const me = await requireAuth(req);
      if (me instanceof Response) return me;
      const { id, notes } = await req.json();
      if (!id) return json({ error: "id required" }, 400);

      const nextStatus = action === "approve" ? "approved" : "rejected";
      const { data: updated, error } = await sb.from("cloud_components")
        .update({
          status: nextStatus,
          review_notes: notes || null,
          reviewed_by: me.uid,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();
      if (error) return json({ error: error.message }, 500);

      await sb.from("cloud_component_reviews").insert([{
        component_id: id,
        reviewer_id: me.uid,
        action: nextStatus,
        notes: notes || null,
      }]);

      // Broadcast so connected children can prompt editors to upgrade.
      if (nextStatus === "approved" && updated) {
        await sb.channel("asset_updates").send({
          type: "broadcast",
          event: "asset_approved",
          payload: { id: updated.id, kind: updated.kind, slug: updated.slug, version: updated.version },
        });
      }

      return json({ ok: true, status: nextStatus, asset: updated });
    }

    return json({ error: `unknown action: ${action}` }, 404);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
