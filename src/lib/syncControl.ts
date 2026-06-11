// Sync hardening — typed helpers for the child-site sync control plane.
// Tables: sync_settings, sync_events, sync_queue, sync_conflicts, sync_health.
//
// Every push/pull/accept/reject is logged in sync_events and rolls up into
// sync_health so the admin dashboard can show real status — never UI-only.
import { supabase as cloud } from "@/integrations/supabase/client";
import {
  pingParent,
  fetchPosts,
  getSiteConfig,
  trackInteraction,
} from "@/lib/parent";

// Cast helper: tolerate types.ts regen lag for new tables.
const db = cloud as unknown as {
  from: (t: string) => any;
};

export type ResourceType =
  | "posts" | "pages" | "templates" | "sections" | "widgets"
  | "seo" | "geo" | "aeo" | "schema" | "menus" | "media"
  | "custom_fields" | "design_system" | "analytics";

export type SyncDirection = "pull" | "push" | "two-way" | "disabled";

export type SyncSetting = {
  id: string;
  resource_type: ResourceType;
  enabled: boolean;
  auto_accept: boolean;
  direction: SyncDirection;
  notes?: string | null;
  updated_at: string;
};

export type SyncEvent = {
  id: string;
  resource_type: string;
  resource_id?: string | null;
  action: "push" | "pull" | "accept" | "reject" | "auto_accept" | "conflict" | "error" | "heartbeat";
  direction: "pull" | "push" | "two-way";
  status: "success" | "failure" | "pending" | "partial";
  latency_ms?: number | null;
  payload?: unknown;
  error_message?: string | null;
  triggered_by?: string | null;
  created_at: string;
};

export type QueueItem = {
  id: string;
  resource_type: string;
  resource_id?: string | null;
  source: string;
  payload: any;
  status: "pending" | "accepted" | "rejected" | "applied" | "failed" | "expired";
  decision_note?: string | null;
  scheduled_for?: string | null;
  created_at: string;
  updated_at: string;
};

export type ConflictRow = {
  id: string;
  resource_type: string;
  resource_id: string;
  local_snapshot: unknown;
  parent_snapshot: unknown;
  resolution: "local" | "parent" | "merged" | "pending";
  resolved_at?: string | null;
  created_at: string;
};

export type HealthRow = {
  id: string;
  resource_type: string;
  last_success_at?: string | null;
  last_failure_at?: string | null;
  consecutive_failures: number;
  avg_latency_ms?: number | null;
  status: "healthy" | "degraded" | "down" | "unknown";
  updated_at: string;
};

/* ----- settings ----- */
export async function listSettings(): Promise<SyncSetting[]> {
  const { data } = await db.from("sync_settings").select("*").order("resource_type");
  return (data || []) as SyncSetting[];
}

export async function updateSetting(id: string, patch: Partial<SyncSetting>) {
  const { error } = await db.from("sync_settings").update(patch).eq("id", id);
  if (error) throw error;
}

/* ----- events ----- */
export async function logEvent(e: Omit<SyncEvent, "id" | "created_at">) {
  try { await db.from("sync_events").insert(e); } catch { /* swallow */ }
  await rollHealth(e.resource_type, e.status, e.latency_ms || undefined);
}

export async function listEvents(limit = 200): Promise<SyncEvent[]> {
  const { data } = await db.from("sync_events").select("*").order("created_at", { ascending: false }).limit(limit);
  return (data || []) as SyncEvent[];
}

/* ----- queue ----- */
export async function listQueue(status?: QueueItem["status"]): Promise<QueueItem[]> {
  let q = db.from("sync_queue").select("*").order("created_at", { ascending: false }).limit(200);
  if (status) q = q.eq("status", status);
  const { data } = await q;
  return (data || []) as QueueItem[];
}

export async function enqueue(item: Pick<QueueItem, "resource_type" | "resource_id" | "payload"> & { source?: string }) {
  const { data, error } = await db.from("sync_queue").insert({
    source: item.source || "parent",
    ...item,
  }).select("id").single();
  if (error) throw error;
  return data?.id as string;
}

export async function decideQueue(id: string, decision: "accepted" | "rejected", note?: string) {
  const { error } = await db.from("sync_queue")
    .update({ status: decision, decision_note: note, decision_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;

  // Fetch the row to know the resource_type for the event log
  const { data: row } = await db.from("sync_queue").select("*").eq("id", id).single();
  if (row) {
    await logEvent({
      resource_type: row.resource_type,
      resource_id: row.resource_id,
      action: decision === "accepted" ? "accept" : "reject",
      direction: "pull",
      status: "success",
      latency_ms: null,
      payload: { decision_note: note },
      error_message: null,
      triggered_by: "admin",
    });
  }
}

/* ----- conflicts ----- */
export async function listConflicts(): Promise<ConflictRow[]> {
  const { data } = await db.from("sync_conflicts").select("*").order("created_at", { ascending: false }).limit(100);
  return (data || []) as ConflictRow[];
}

export async function resolveConflict(id: string, resolution: ConflictRow["resolution"]) {
  const { error } = await db.from("sync_conflicts")
    .update({ resolution, resolved_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/* ----- health ----- */
export async function listHealth(): Promise<HealthRow[]> {
  const { data } = await db.from("sync_health").select("*").order("resource_type");
  return (data || []) as HealthRow[];
}

async function rollHealth(resource_type: string, status: SyncEvent["status"], latency?: number) {
  try {
    const { data: existing } = await db.from("sync_health").select("*").eq("resource_type", resource_type).maybeSingle();
    const now = new Date().toISOString();
    const ok = status === "success" || status === "partial";
    const next = {
      resource_type,
      last_success_at: ok ? now : existing?.last_success_at || null,
      last_failure_at: !ok ? now : existing?.last_failure_at || null,
      consecutive_failures: ok ? 0 : (existing?.consecutive_failures || 0) + 1,
      avg_latency_ms: latency
        ? Math.round(((existing?.avg_latency_ms || latency) + latency) / 2)
        : existing?.avg_latency_ms || null,
      status: ok
        ? "healthy"
        : ((existing?.consecutive_failures || 0) + 1) >= 3
          ? "down"
          : "degraded",
    };
    if (existing?.id) {
      await db.from("sync_health").update(next).eq("id", existing.id);
    } else {
      await db.from("sync_health").insert(next);
    }
  } catch { /* swallow */ }
}

/* ----- live sync operations ----- */

/** Pull posts from parent and queue ones that differ from local imported_posts. */
export async function pullParentPosts(): Promise<{ queued: number; checked: number }> {
  const start = performance.now();
  try {
    const res = await fetchPosts({ limit: 50 });
    const parentPosts = res?.posts || [];
    const slugs = parentPosts.map((p) => p.slug);
    const { data: local } = await db.from("imported_posts").select("slug, updated_at").in("slug", slugs.length ? slugs : ["__none__"]);
    const localMap = new Map<string, string>((local || []).map((r: any) => [r.slug, r.updated_at]));

    let queued = 0;
    for (const p of parentPosts) {
      const localUpdated = localMap.get(p.slug);
      const parentUpdated = p.published_at || p.publish_date || "";
      if (!localUpdated || (parentUpdated && parentUpdated > localUpdated)) {
        await enqueue({ resource_type: "posts", resource_id: p.slug, payload: p });
        queued++;
      }
    }

    await logEvent({
      resource_type: "posts",
      resource_id: null,
      action: "pull",
      direction: "pull",
      status: "success",
      latency_ms: Math.round(performance.now() - start),
      payload: { checked: parentPosts.length, queued },
      error_message: null,
      triggered_by: "manual",
    });
    return { queued, checked: parentPosts.length };
  } catch (err: any) {
    await logEvent({
      resource_type: "posts",
      resource_id: null,
      action: "pull",
      direction: "pull",
      status: "failure",
      latency_ms: Math.round(performance.now() - start),
      payload: null,
      error_message: String(err?.message || err),
      triggered_by: "manual",
    });
    throw err;
  }
}

/** Apply an accepted queue item to the local DB (currently: posts). */
export async function applyQueueItem(itemId: string): Promise<boolean> {
  const { data: row } = await db.from("sync_queue").select("*").eq("id", itemId).single();
  if (!row) return false;
  const start = performance.now();
  try {
    if (row.resource_type === "posts") {
      const p = row.payload || {};
      const cfg = await getSiteConfig();
      const upsert = {
        site_id: cfg?.site?.id || null,
        slug: p.slug,
        title: p.title,
        body: p.body || p.content || "",
        excerpt: p.excerpt || "",
        featured_image_url: p.featured_image_url || null,
        status: p.status || "published",
        type: p.type || "post",
        publish_date: p.published_at || p.publish_date || null,
        meta_title: p.meta_title || null,
        meta_description: p.meta_description || null,
        canonical_url: p.canonical_url || null,
        elementor_data: p.elementor_data || null,
        render_mode: p.render_mode || null,
        raw: { author: p.author, categories: p.categories, tags: p.tags },
      };
      await db.from("imported_posts").upsert(upsert, { onConflict: "slug" });
    }
    await db.from("sync_queue").update({ status: "applied" }).eq("id", itemId);
    await logEvent({
      resource_type: row.resource_type,
      resource_id: row.resource_id,
      action: "accept",
      direction: "pull",
      status: "success",
      latency_ms: Math.round(performance.now() - start),
      payload: null,
      error_message: null,
      triggered_by: "admin",
    });
    return true;
  } catch (err: any) {
    await db.from("sync_queue").update({ status: "failed", decision_note: String(err?.message || err) }).eq("id", itemId);
    await logEvent({
      resource_type: row.resource_type,
      resource_id: row.resource_id,
      action: "error",
      direction: "pull",
      status: "failure",
      latency_ms: Math.round(performance.now() - start),
      payload: null,
      error_message: String(err?.message || err),
      triggered_by: "admin",
    });
    return false;
  }
}

/** Heartbeat — pings parent and records latency in sync_health. */
export async function runHeartbeat() {
  const ping = await pingParent();
  await logEvent({
    resource_type: "analytics",
    resource_id: null,
    action: "heartbeat",
    direction: "two-way",
    status: ping.ok ? "success" : "failure",
    latency_ms: ping.latencyMs,
    payload: { status: ping.status },
    error_message: ping.ok ? null : "Parent unreachable",
    triggered_by: "admin",
  });
  try { await trackInteraction("heartbeat", "child-dashboard", { latency_ms: ping.latencyMs }); } catch { /* noop */ }
  return ping;
}
