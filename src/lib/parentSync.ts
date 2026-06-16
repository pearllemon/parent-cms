/**
 * Pulls the full site-config payload from the Parent Management platform
 * (https://zvaiqrewtqvsokzbxnxt.supabase.co/functions/v1/site-config) and
 * mirrors it into the local `parent_site_mirror` table so editors and the
 * runtime can read parent-managed assets (theme, header, footer, popups,
 * SEO, services, etc.) without an extra round-trip.
 */
import { supabase as cloud } from "@/integrations/supabase/client";
import { API, SUPABASE_ANON_KEY, getSiteConfig } from "./parent";

const KINDS = [
  "site",
  "headerConfig",
  "footerConfig",
  "theme",
  "errorPageConfig",
  "popupConfig",
  "seoConfig",
  "customCode",
  "dynamicSections",
  "services",
  "caseStudies",
  "teamMembers",
] as const;

export type ParentMirrorRow = {
  id: string;
  site_id: string;
  kind: string;
  payload: unknown;
  fetched_at: string;
  updated_at: string;
};

export async function syncParentConfig(): Promise<{
  ok: boolean;
  synced: number;
  site_id: string | null;
  error?: string;
}> {
  const cfg = await getSiteConfig(true);
  const siteId = cfg?.site?.id || null;
  if (!siteId) return { ok: false, synced: 0, site_id: null, error: "No site_id" };

  // Always include a "fullConfig" snapshot for easy rendering.
  const rows = [
    { site_id: siteId, kind: "fullConfig", payload: cfg, fetched_at: new Date().toISOString() },
    ...KINDS.map((k) => ({
      site_id: siteId,
      kind: k,
      payload: (cfg as Record<string, unknown>)[k] ?? null,
      fetched_at: new Date().toISOString(),
    })),
  ];

  const { error } = await (cloud.from("parent_site_mirror" as never) as never)
    .upsert(rows as never, { onConflict: "site_id,kind" } as never);
  if (error) return { ok: false, synced: 0, site_id: siteId, error: error.message };
  return { ok: true, synced: rows.length, site_id: siteId };
}

export async function listLocalMirror(siteId: string): Promise<ParentMirrorRow[]> {
  const { data, error } = await (cloud.from("parent_site_mirror" as never) as never)
    .select("*")
    .eq("site_id", siteId)
    .order("kind");
  if (error) return [];
  return (data as ParentMirrorRow[]) || [];
}

/** Convenience: live fetch the schema endpoint (16 endpoints discovery). */
export async function fetchParentSchema(): Promise<unknown> {
  const r = await fetch(`${API}?action=schema`, { headers: { apikey: SUPABASE_ANON_KEY } });
  if (!r.ok) throw new Error(`schema ${r.status}`);
  return r.json();
}