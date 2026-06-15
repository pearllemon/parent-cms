// Distribution registry — parent CMS side.
// Manages cms_releases, cms_migration_manifest, child_installations, child_upgrade_log.
// Children call the cms-release edge function to bootstrap; admins use this lib
// from the Releases / Installations / Upgrade Log pages.

import { supabase as cloud } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/activityLog";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = cloud as any;

export type Release = {
  id: string;
  version: string;
  sdk_url: string | null;
  manifest: Record<string, unknown>;
  changelog: string | null;
  min_compatible_child_version: string | null;
  is_latest: boolean;
  recalled: boolean;
  signature: string | null;
  signing_key_id: string | null;
  payload_hash: string | null;
  signed_at: string | null;
  published_at: string;
  created_at: string;
  updated_at: string;
};

export type MigrationStep = {
  id: string;
  version: string;
  order_index: number;
  kind: "sql" | "js" | "noop";
  description: string | null;
  payload: string;
  reversible: boolean;
  down_payload: string | null;
  created_at: string;
};

export type ChildInstallation = {
  id: string;
  site_id: string;
  site_name: string | null;
  site_url: string | null;
  current_version: string | null;
  child_shim_version: string | null;
  upgrade_state:
    | "unknown" | "up_to_date" | "pending" | "upgrading" | "failed" | "rolled_back";
  last_error: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
};

export type UpgradeLog = {
  id: string;
  site_id: string;
  from_version: string | null;
  to_version: string;
  status: "started" | "success" | "failed" | "rolled_back";
  snapshot: unknown;
  error: string | null;
  duration_ms: number | null;
  created_at: string;
};

/* ---------------- Releases ---------------- */

export async function listReleases(): Promise<Release[]> {
  const { data } = await db.from("cms_releases").select("*").order("published_at", { ascending: false });
  return (data || []) as Release[];
}

export async function getLatestRelease(): Promise<Release | null> {
  const { data } = await db
    .from("cms_releases")
    .select("*")
    .eq("is_latest", true)
    .eq("recalled", false)
    .maybeSingle();
  return (data || null) as Release | null;
}

export async function getRelease(version: string): Promise<Release | null> {
  const { data } = await db.from("cms_releases").select("*").eq("version", version).maybeSingle();
  return (data || null) as Release | null;
}

function semverCmp(a: string, b: string): number {
  const pa = a.replace(/[-.].*$/, "").split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.replace(/[-.].*$/, "").split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
}

export async function cutRelease(input: {
  version: string;
  changelog?: string;
  sdk_url?: string;
  manifest?: Record<string, unknown>;
  min_compatible_child_version?: string;
  migrations?: Array<Omit<MigrationStep, "id" | "version" | "created_at"> & { migration_id?: string }>;
}): Promise<Release> {
  if (!/^\d+\.\d+\.\d+([.-][0-9A-Za-z.-]+)?$/.test(input.version)) {
    throw new Error(`Version "${input.version}" is not semver (X.Y.Z).`);
  }
  // Client-side forward-only check (DB also enforces, but fail fast for UX).
  const { data: top } = await db
    .from("cms_releases").select("version")
    .order("published_at", { ascending: false }).limit(50);
  for (const r of (top || []) as Array<{ version: string }>) {
    if (semverCmp(input.version, r.version) <= 0) {
      throw new Error(`Forward-only: ${input.version} must be strictly greater than ${r.version}.`);
    }
  }

  // Demote any previous latest
  await db.from("cms_releases").update({ is_latest: false }).eq("is_latest", true);

  const { data, error } = await db
    .from("cms_releases")
    .insert({
      version: input.version,
      changelog: input.changelog || null,
      sdk_url: input.sdk_url || null,
      manifest: input.manifest || {},
      min_compatible_child_version: input.min_compatible_child_version || null,
      is_latest: true,
      recalled: false,
    })
    .select("*")
    .single();
  if (error) throw error;

  if (input.migrations?.length) {
    const rows = input.migrations.map((m, i) => ({
      version: input.version,
      migration_id: m.migration_id || `${input.version}:${m.order_index ?? i}`,
      order_index: m.order_index ?? i,
      kind: m.kind,
      description: m.description ?? null,
      payload: m.payload || "",
      reversible: !!m.reversible,
      down_payload: m.down_payload ?? null,
    }));
    await db.from("cms_migration_manifest").insert(rows);
  }

  await logActivity({
    action: "create",
    entity_type: "cms_release",
    entity_id: data.id,
    entity_label: `Cut release v${input.version}`,
    details: { version: input.version, migrations: input.migrations?.length || 0 },
  });

  return data as Release;
}

export async function recallRelease(id: string, recall: boolean): Promise<void> {
  const { data } = await db.from("cms_releases").select("version").eq("id", id).single();
  await db.from("cms_releases").update({ recalled: recall }).eq("id", id);
  if (recall) {
    // Promote the most recent non-recalled to latest
    await db.from("cms_releases").update({ is_latest: false }).eq("id", id);
    const { data: next } = await db
      .from("cms_releases")
      .select("id")
      .eq("recalled", false)
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (next?.id) await db.from("cms_releases").update({ is_latest: true }).eq("id", next.id);
  }
  await logActivity({
    action: recall ? "delete" : "restore",
    entity_type: "cms_release",
    entity_id: id,
    entity_label: `${recall ? "Recalled" : "Restored"} release v${data?.version || ""}`,
  });
}

export async function promoteRelease(id: string): Promise<void> {
  await db.from("cms_releases").update({ is_latest: false }).eq("is_latest", true);
  await db.from("cms_releases").update({ is_latest: true, recalled: false }).eq("id", id);
  await logActivity({
    action: "update",
    entity_type: "cms_release",
    entity_id: id,
    entity_label: "Promoted release to latest",
  });
}

/* ---------------- Migrations ---------------- */

export async function listMigrationsForVersion(version: string): Promise<MigrationStep[]> {
  const { data } = await db
    .from("cms_migration_manifest")
    .select("*")
    .eq("version", version)
    .order("order_index");
  return (data || []) as MigrationStep[];
}

/* ---------------- Installations ---------------- */

export async function listInstallations(): Promise<ChildInstallation[]> {
  const { data } = await db
    .from("child_installations")
    .select("*")
    .order("last_seen_at", { ascending: false, nullsFirst: false });
  return (data || []) as ChildInstallation[];
}

export async function forceUpgrade(site_id: string, to_version: string): Promise<void> {
  await db
    .from("child_installations")
    .update({ upgrade_state: "pending" })
    .eq("site_id", site_id);
  await logActivity({
    action: "update",
    entity_type: "child_installation",
    entity_id: site_id,
    entity_label: `Queued force-upgrade to v${to_version}`,
    details: { to_version },
  });
}

/* ---------------- Upgrade log ---------------- */

export async function listUpgradeLog(site_id?: string, limit = 200): Promise<UpgradeLog[]> {
  let q = db.from("child_upgrade_log").select("*").order("created_at", { ascending: false }).limit(limit);
  if (site_id) q = q.eq("site_id", site_id);
  const { data } = await q;
  return (data || []) as UpgradeLog[];
}
