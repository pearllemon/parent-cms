// Section library — local + parent-shared pre-built section templates for the
// visual editor. Local sections live in `section_templates` on this project's
// Lovable Cloud; parent-shared sections live in the same table on the Parent
// Management project (which, in self-parent mode, is this same project).

import { supabase as cloud } from "@/integrations/supabase/client";
import { supabase as parent } from "@/lib/parent";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type SectionTemplate = {
  id: string;
  site_id?: string | null;
  name: string;
  category: string;
  description?: string | null;
  thumbnail_url?: string | null;
  blocks: any[];
  source: "local" | "parent";
  status: "draft" | "pending" | "approved" | "rejected";
  submitted_at?: string | null;
  reviewed_at?: string | null;
  created_at?: string;
};

const tbl = (c: any) => c.from("section_templates");

/** List sections from both parent (approved/shared) and local cloud. */
export async function listSections(siteId?: string | null): Promise<SectionTemplate[]> {
  const out: SectionTemplate[] = [];

  try {
    const { data } = await tbl(parent)
      .select("*")
      .or("status.eq.approved,source.eq.parent")
      .order("created_at", { ascending: false })
      .limit(500);
    for (const r of (data as any[]) || []) out.push({ ...r, source: "parent" });
  } catch { /* ignore */ }

  try {
    let q = tbl(cloud).select("*").order("created_at", { ascending: false }).limit(500);
    if (siteId) q = q.eq("site_id", siteId);
    const { data } = await q;
    for (const r of (data as any[]) || []) {
      if (out.some((x) => x.id === r.id)) continue;
      out.push({ ...r, source: r.source || "local" });
    }
  } catch { /* ignore */ }

  return out;
}

/** Save a tree of blocks as a local section template. */
export async function saveLocalSection(input: {
  site_id?: string | null;
  name: string;
  category?: string;
  description?: string;
  thumbnail_url?: string;
  blocks: any[];
}): Promise<SectionTemplate | null> {
  const { data: { user } } = await cloud.auth.getUser();
  const row = {
    site_id: input.site_id ?? null,
    name: input.name,
    category: input.category || "general",
    description: input.description || null,
    thumbnail_url: input.thumbnail_url || null,
    blocks: input.blocks,
    source: "local",
    status: "draft",
    created_by: user?.id ?? null,
  };
  const { data, error } = await tbl(cloud).insert(row).select("*").single();
  if (error) throw error;
  return data as SectionTemplate;
}

/** Submit a local section upstream — marks it pending in the parent table. */
export async function submitSectionToParent(section: SectionTemplate): Promise<void> {
  const { data: { user } } = await cloud.auth.getUser();
  const row = {
    site_id: section.site_id ?? null,
    name: section.name,
    category: section.category,
    description: section.description ?? null,
    thumbnail_url: section.thumbnail_url ?? null,
    blocks: section.blocks,
    source: "local",
    status: "pending",
    submitted_at: new Date().toISOString(),
    created_by: user?.id ?? null,
  };
  const { error } = await tbl(parent).insert(row);
  if (error) throw error;

  // Also mark the local copy as pending for the author's awareness.
  try { await tbl(cloud).update({ status: "pending", submitted_at: row.submitted_at }).eq("id", section.id); }
  catch { /* ignore */ }
}

/** Admin-only: approve or reject a pending section in the parent table. */
export async function reviewSection(id: string, decision: "approved" | "rejected", notes?: string): Promise<void> {
  const { error } = await tbl(parent).update({
    status: decision,
    reviewed_at: new Date().toISOString(),
    review_notes: notes ?? null,
  }).eq("id", id);
  if (error) throw error;
}