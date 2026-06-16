// Activity log — records who did what across the admin.
// Best-effort writes (never block UI on failure). Cloud-side persistence.

import { supabase as cloud } from "@/integrations/supabase/client";
import { supabase as parent } from "@/lib/parent";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = cloud as any;

export type ActivityAction =
  | "create" | "update" | "delete" | "restore"
  | "publish" | "unpublish" | "duplicate"
  | "assign" | "unassign"
  | "login" | "logout" | "sync";

export type ActivityRow = {
  id: string;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  details: Record<string, unknown>;
  created_at: string;
};

let cachedActor: { id: string | null; name: string | null } | null = null;

async function getActor(): Promise<{ id: string | null; name: string | null }> {
  if (cachedActor) return cachedActor;
  try {
    const { data } = await parent.auth.getUser();
    const u = data?.user;
    cachedActor = {
      id: u?.id ?? null,
      name: (u?.user_metadata?.full_name as string) || u?.email || null,
    };
  } catch {
    cachedActor = { id: null, name: null };
  }
  return cachedActor;
}

export function clearActorCache() { cachedActor = null; }

export async function logActivity(input: {
  action: ActivityAction | string;
  entity_type: string;
  entity_id?: string | null;
  entity_label?: string | null;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    const actor = await getActor();
    await db.from("activity_log").insert({
      actor_id: actor.id,
      actor_name: actor.name,
      action: input.action,
      entity_type: input.entity_type,
      entity_id: input.entity_id ?? null,
      entity_label: input.entity_label ?? null,
      details: input.details || {},
    });
  } catch {
    /* swallow — activity log must never break the app */
  }
}

export async function listActivity(opts?: {
  entity_type?: string;
  entity_id?: string;
  limit?: number;
}): Promise<ActivityRow[]> {
  let q = db.from("activity_log").select("*").order("created_at", { ascending: false }).limit(opts?.limit ?? 200);
  if (opts?.entity_type) q = q.eq("entity_type", opts.entity_type);
  if (opts?.entity_id) q = q.eq("entity_id", opts.entity_id);
  const { data } = await q;
  return (data || []) as ActivityRow[];
}
