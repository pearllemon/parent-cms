// Helpers for the WordPress-style Custom Fields system.
//
// Custom fields are defined per CPT (`custom_fields` table). Two sentinel
// CPT slugs are reserved:
//   __global__  → fields apply to ALL entities (post, page, every CPT)
//   __entry__   → fields applied per-entry only (no schema sharing)
//
// Per-entry VALUES are stored in `entry_field_values`, keyed by
// (entity_type, entity_id, field_key). For CPT entries, entity_type is
// `cpt:<slug>`. For posts/pages it's `post` / `page`.

import { supabase as cloud } from "@/integrations/supabase/client";
import type { CustomField, FieldType } from "@/lib/cpt";

/* eslint-disable @typescript-eslint/no-explicit-any */
const fields = () => (cloud.from("custom_fields" as any) as any);
const values = () => (cloud.from("entry_field_values" as any) as any);

export const ENTITY = {
  post: "post",
  page: "page",
  cpt: (slug: string) => `cpt:${slug}`,
};

/** Load all custom fields that apply to a given entity type. */
export async function loadFieldsFor(entityType: string): Promise<CustomField[]> {
  const scopes = new Set<string>(["__global__"]);
  if (entityType.startsWith("cpt:")) scopes.add(entityType.slice(4));
  else scopes.add(entityType);
  const { data } = await fields().select("*").in("cpt_slug", Array.from(scopes)).order("position");
  return ((data as CustomField[] | null) || []).filter((f) => f.cpt_slug !== "__entry__");
}

/** Load per-entry attached fields stored in the `__entry__` bucket and
 *  filtered by settings.entity_type / settings.entity_id. */
export async function loadPerEntryFields(
  entityType: string,
  entityId: string,
): Promise<CustomField[]> {
  const { data } = await fields().select("*").eq("cpt_slug", "__entry__").order("position");
  return ((data as CustomField[] | null) || []).filter((f) => {
    const s = (f.settings || {}) as { entity_type?: string; entity_id?: string };
    return s.entity_type === entityType && s.entity_id === entityId;
  });
}

export async function loadValues(
  entityType: string,
  entityId: string,
): Promise<Record<string, unknown>> {
  if (!entityId) return {};
  const { data } = await values()
    .select("field_key,value")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId);
  const out: Record<string, unknown> = {};
  for (const row of (data as Array<{ field_key: string; value: unknown }> | null) || []) {
    out[row.field_key] = row.value;
  }
  return out;
}

export async function saveValues(
  entityType: string,
  entityId: string,
  siteId: string | null,
  vals: Record<string, unknown>,
) {
  if (!entityId) return;
  const rows = Object.entries(vals).map(([field_key, value]) => ({
    site_id: siteId,
    entity_type: entityType,
    entity_id: entityId,
    field_key,
    value,
  }));
  if (rows.length === 0) return;
  await values().upsert(rows, { onConflict: "entity_type,entity_id,field_key" });
}

export async function deleteField(fieldId: string) {
  await fields().delete().eq("id", fieldId);
}

export async function createField(input: {
  cpt_slug: string;
  field_key: string;
  label: string;
  field_type: FieldType;
  required?: boolean;
  settings?: Record<string, unknown>;
  position?: number;
}) {
  const { data, error } = await fields()
    .insert({
      cpt_slug: input.cpt_slug,
      field_key: input.field_key,
      label: input.label,
      field_type: input.field_type,
      required: !!input.required,
      settings: input.settings || {},
      position: input.position ?? 0,
    })
    .select()
    .single();
  if (error) throw error;
  return data as CustomField;
}

export async function updateField(id: string, patch: Partial<CustomField>) {
  await fields().update(patch).eq("id", id);
}
