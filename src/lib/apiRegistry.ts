// API Registry — track external APIs the CMS depends on (parent management
// platform, integrations, third-party services). Used by Admin → APIs page
// and by health-check schedulers.

import { supabase as cloud } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/activityLog";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = cloud as any;

export type CmsApi = {
  id: string;
  api_key: string;
  name: string;
  base_url: string | null;
  description: string | null;
  status: "active" | "degraded" | "down" | "disabled";
  scope: "parent" | "child" | "both";
  config: Record<string, unknown>;
  last_check_at: string | null;
  last_check_status: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export async function listApis(): Promise<CmsApi[]> {
  const { data } = await db.from("cms_api_registry").select("*").order("name");
  return (data || []) as CmsApi[];
}

export async function upsertApi(input: Partial<CmsApi> & { api_key: string; name: string }): Promise<CmsApi> {
  const { data: existing } = await db
    .from("cms_api_registry").select("id").eq("api_key", input.api_key).maybeSingle();
  const payload = {
    api_key: input.api_key,
    name: input.name,
    base_url: input.base_url || null,
    description: input.description || null,
    status: input.status || "active",
    scope: input.scope || "parent",
    config: input.config || {},
  };
  let row: CmsApi;
  if (existing?.id) {
    const { data, error } = await db.from("cms_api_registry").update(payload).eq("id", existing.id).select("*").single();
    if (error) throw error;
    row = data as CmsApi;
  } else {
    const { data, error } = await db.from("cms_api_registry").insert(payload).select("*").single();
    if (error) throw error;
    row = data as CmsApi;
  }
  await logActivity({
    action: existing ? "update" : "create",
    entity_type: "cms_api",
    entity_id: row.id,
    entity_label: row.name,
  });
  return row;
}

export async function deleteApi(id: string): Promise<void> {
  const { data } = await db.from("cms_api_registry").select("name").eq("id", id).single();
  await db.from("cms_api_registry").delete().eq("id", id);
  await logActivity({
    action: "delete", entity_type: "cms_api", entity_id: id,
    entity_label: data?.name || id,
  });
}

export async function pingApi(api: CmsApi): Promise<CmsApi> {
  let status: CmsApi["status"] = "active";
  let lastError: string | null = null;
  let lastCheckStatus = "ok";
  if (api.base_url) {
    try {
      const res = await fetch(api.base_url, { method: "GET" });
      lastCheckStatus = String(res.status);
      if (!res.ok) { status = res.status >= 500 ? "down" : "degraded"; lastError = `HTTP ${res.status}`; }
    } catch (e) {
      status = "down";
      lastError = String((e as Error)?.message || e);
      lastCheckStatus = "network";
    }
  }
  const { data, error } = await db
    .from("cms_api_registry")
    .update({
      status, last_error: lastError, last_check_status: lastCheckStatus,
      last_check_at: new Date().toISOString(),
    })
    .eq("id", api.id).select("*").single();
  if (error) throw error;
  return data as CmsApi;
}
