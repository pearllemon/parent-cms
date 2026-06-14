// Component Cloud library — shared parent→child publishing surface.
//
// `cloud_components` holds every publishable section/template/widget (versioned).
// `cloud_component_installs` tracks per-site installs, including an `auto_sync`
// flag so a child can opt into receiving new versions automatically.

import { supabase } from "@/integrations/supabase/client";

export type ComponentKind = "section" | "template" | "widget";
export type Visibility = "public" | "unlisted" | "private";

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

// List the *latest version per slug* of every non-recalled component.
export async function listCloudComponents(kind?: ComponentKind): Promise<CloudComponent[]> {
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

export async function listInstalls(siteId: string): Promise<Install[]> {
  const { data, error } = await supabase
    .from("cloud_component_installs")
    .select("*")
    .eq("site_id", siteId);
  if (error) throw error;
  return (data as Install[]) || [];
}

// Publish (or bump) a component: looks up the highest existing version for
// (kind, slug) and inserts version+1 — never overwrites history.
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
  publisher_site_id?: string | null;
}): Promise<CloudComponent> {
  const { data: latest } = await supabase
    .from("cloud_components")
    .select("version")
    .eq("kind", input.kind)
    .eq("slug", input.slug)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextVersion = ((latest?.version as number) || 0) + 1;
  const { data: user } = await supabase.auth.getUser();
  const insert = {
    ...input,
    version: nextVersion,
    visibility: input.visibility || "public",
    publisher_id: user.user?.id || null,
  };
  const { data, error } = await supabase
    .from("cloud_components")
    .insert([insert])
    .select()
    .single();
  if (error) throw error;
  return data as CloudComponent;
}

// Install a cloud component into the local theme_sections / theme_templates.
// Idempotent on (site_id, kind, slug) — re-installs upgrade the existing row.
export async function installComponent(component: CloudComponent, siteId: string): Promise<void> {
  let localId: string | null = null;
  if (component.kind === "section") {
    const payload = component.payload as { blocks?: unknown; category?: string; description?: string; design_tokens?: unknown; variants?: unknown };
    const { data, error } = await supabase
      .from("theme_sections")
      .upsert({
        name: component.name,
        slug: component.slug,
        category: (payload.category as string) || component.category || "uncategorized",
        description: component.description,
        blocks: payload.blocks ?? [],
        design_tokens: payload.design_tokens ?? {},
        variants: payload.variants ?? [],
        site_id: siteId,
        is_global: true,
        source: "cloud",
        version: component.version,
      }, { onConflict: "slug" })
      .select("id")
      .single();
    if (error) throw error;
    localId = data?.id || null;
  } else if (component.kind === "template") {
    const payload = component.payload as { blocks?: unknown; kind?: string };
    const { data, error } = await supabase
      .from("theme_templates")
      .upsert({
        name: component.name,
        slug: component.slug,
        kind: (payload.kind as string) || "page",
        description: component.description,
        blocks: payload.blocks ?? [],
        preview_url: component.preview_url,
        site_id: siteId,
        source: "cloud",
        version: component.version,
      }, { onConflict: "slug" })
      .select("id")
      .single();
    if (error) throw error;
    localId = data?.id || null;
  }
  // widgets: stored only in the cloud install ledger for now — runtime renderers
  // read from cloud_components directly.

  await supabase.from("cloud_component_installs").upsert({
    site_id: siteId,
    kind: component.kind,
    slug: component.slug,
    installed_version: component.version,
    local_id: localId,
    last_synced_at: new Date().toISOString(),
  }, { onConflict: "site_id,kind,slug" });
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
