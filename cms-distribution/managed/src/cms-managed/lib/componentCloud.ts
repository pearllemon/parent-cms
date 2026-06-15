// Component Cloud library — shared parent→child publishing surface with a
// Pending Review approval queue.
//
// `cloud_components` holds every publishable section/template/widget (versioned).
// `cloud_component_installs` tracks per-site installs, including an `auto_sync`
// flag so a child can opt into receiving new versions automatically.
// `cloud_component_reviews` is the moderation audit trail.

import { supabase as _supabase } from "@/integrations/supabase/client";
/* eslint-disable @typescript-eslint/no-explicit-any */
const supabase = _supabase as any;

const MARKETPLACE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cms-marketplace`;

export type ComponentKind = "section" | "template" | "widget";
export type Visibility = "public" | "unlisted" | "private";
export type ReviewStatus = "pending_review" | "approved" | "rejected";

export type CloudComponent = {
  id: string;
  kind: ComponentKind;
  slug: string;
  version: number;
  name: string;
  description: string | null;
  category: string | null;
  payload: Record<string, unknown>;
  preview_url: string | null;
  thumbnail_url: string | null;
  visibility: Visibility;
  publisher_id: string | null;
  publisher_site_id: string | null;
  recalled: boolean;
  metadata: Record<string, unknown>;
  status: ReviewStatus;
  review_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  submitted_at: string;
  created_at: string;
  updated_at: string;
};

export type Install = {
  id: string;
  site_id: string;
  kind: ComponentKind;
  slug: string;
  installed_version: number;
  local_id: string | null;
  auto_sync: boolean;
  last_synced_at: string;
};

async function marketplaceFetch(path: string, init: RequestInit = {}): Promise<any> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
    ...(init.headers as Record<string, string> | undefined),
  };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  const res = await fetch(`${MARKETPLACE_URL}${path}`, { ...init, headers });
  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) throw new Error(body?.error || res.statusText);
  return body;
}

// List the *latest version per slug* of every approved component.
// Admins (logged-in) also see pending/rejected to manage moderation UI.
export async function listCloudComponents(kind?: ComponentKind, includeAll = false): Promise<CloudComponent[]> {
  if (includeAll) {
    let q = supabase
      .from("cloud_components")
      .select("*")
      .eq("recalled", false)
      .order("updated_at", { ascending: false });
    if (kind) q = q.eq("kind", kind);
    const { data, error } = await q;
    if (error) throw error;
    const byKey = new Map<string, CloudComponent>();
    for (const row of (data as CloudComponent[]) || []) {
      const key = `${row.kind}:${row.slug}`;
      const existing = byKey.get(key);
      if (!existing || row.version > existing.version) byKey.set(key, row);
    }
    return [...byKey.values()];
  }
  const res = await marketplaceFetch(`?action=library${kind ? `&kind=${kind}` : ""}`);
  return (res.items as CloudComponent[]) || [];
}

export async function listInstalls(siteId: string): Promise<Install[]> {
  const { data, error } = await supabase
    .from("cloud_component_installs")
    .select("*")
    .eq("site_id", siteId);
  if (error) throw error;
  return (data as Install[]) || [];
}

// Publish (or bump) a component. Submissions originating from a child site
// land in the pending-review queue; only direct parent-side publishes (no
// site_id supplied) auto-approve. The edge function enforces this.
export async function publishComponent(input: {
  kind: ComponentKind;
  slug: string;
  name: string;
  description?: string | null;
  category?: string | null;
  payload: Record<string, unknown>;
  preview_url?: string | null;
  thumbnail_url?: string | null;
  visibility?: Visibility;
  scope?: "global" | "private";
  publisher_site_id?: string | null;
}): Promise<{ asset: CloudComponent; status: ReviewStatus }> {
  const body = {
    site_id: input.publisher_site_id || null,
    kind: input.kind,
    slug: input.slug,
    name: input.name,
    description: input.description ?? null,
    category: input.category ?? null,
    payload: input.payload,
    preview_url: input.preview_url ?? null,
    thumbnail_url: input.thumbnail_url ?? null,
    visibility: input.visibility ?? "public",
    scope: input.scope ?? "global",
  };
  const res = await marketplaceFetch("?action=publish_asset", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return { asset: res.asset as CloudComponent, status: res.status as ReviewStatus };
}

// Install via the marketplace endpoint so 'link' vs 'fork' semantics and
// install-ledger upserts stay server-authoritative.
export async function installComponent(
  component: CloudComponent,
  siteId: string,
  mode: "link" | "fork" = "link",
): Promise<void> {
  await marketplaceFetch("?action=import_asset", {
    method: "POST",
    body: JSON.stringify({
      site_id: siteId,
      kind: component.kind,
      id: component.id,
      mode,
    }),
  });
}

// --- Review queue (parent admins) ---
export async function listPendingReviews(): Promise<CloudComponent[]> {
  const res = await marketplaceFetch("?action=pending");
  return (res.items as CloudComponent[]) || [];
}

export async function approveComponent(id: string, notes?: string): Promise<void> {
  await marketplaceFetch("?action=approve", {
    method: "POST",
    body: JSON.stringify({ id, notes }),
  });
}

export async function rejectComponent(id: string, notes?: string): Promise<void> {
  await marketplaceFetch("?action=reject", {
    method: "POST",
    body: JSON.stringify({ id, notes }),
  });
}

export function previewUrl(component: CloudComponent, siteId?: string | null): string {
  const params = new URLSearchParams({ action: "preview", kind: component.kind, id: component.id });
  if (siteId) params.set("site_id", siteId);
  return `${MARKETPLACE_URL}?${params.toString()}`;
}

export async function setAutoSync(siteId: string, kind: ComponentKind, slug: string, on: boolean) {
  await supabase
    .from("cloud_component_installs")
    .update({ auto_sync: on })
    .eq("site_id", siteId).eq("kind", kind).eq("slug", slug);
}

export async function uninstall(siteId: string, kind: ComponentKind, slug: string) {
  await supabase
    .from("cloud_component_installs")
    .delete()
    .eq("site_id", siteId).eq("kind", kind).eq("slug", slug);
}
