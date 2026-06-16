// Taxonomies: categories, tags, custom — with hierarchical terms and entry assignments.
import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export type Taxonomy = {
  id: string;
  slug: string;
  name: string;
  label_singular: string;
  hierarchical: boolean;
  applies_to: string[];
  description: string | null;
};

export type TaxonomyTerm = {
  id: string;
  taxonomy_id: string;
  parent_id: string | null;
  slug: string;
  name: string;
  description: string | null;
  seo_title: string | null;
  seo_description: string | null;
  og_image: string | null;
  canonical_url: string | null;
  schema_json: Record<string, unknown> | null;
  archive_template_id: string | null;
  position: number;
};

export async function listTaxonomies(): Promise<Taxonomy[]> {
  const { data } = await db.from("taxonomies").select("*").order("name");
  return (data as Taxonomy[]) || [];
}

export async function getTaxonomyBySlug(slug: string): Promise<Taxonomy | null> {
  const { data } = await db.from("taxonomies").select("*").eq("slug", slug).maybeSingle();
  return (data as Taxonomy) || null;
}

export async function saveTaxonomy(t: Partial<Taxonomy> & { slug: string; name: string; label_singular: string }): Promise<Taxonomy | null> {
  const payload = {
    slug: t.slug,
    name: t.name,
    label_singular: t.label_singular,
    hierarchical: t.hierarchical ?? false,
    applies_to: t.applies_to ?? ["post"],
    description: t.description ?? null,
  };
  if (t.id) {
    const { data } = await db.from("taxonomies").update(payload).eq("id", t.id).select().maybeSingle();
    return data as Taxonomy | null;
  }
  const { data } = await db.from("taxonomies").insert(payload).select().maybeSingle();
  return data as Taxonomy | null;
}

export async function deleteTaxonomy(id: string) {
  await db.from("taxonomies").delete().eq("id", id);
}

export async function listTerms(taxonomyId: string): Promise<TaxonomyTerm[]> {
  const { data } = await db.from("taxonomy_terms").select("*").eq("taxonomy_id", taxonomyId).order("position").order("name");
  return (data as TaxonomyTerm[]) || [];
}

export async function getTermBySlug(taxonomyId: string, slug: string): Promise<TaxonomyTerm | null> {
  const { data } = await db.from("taxonomy_terms").select("*").eq("taxonomy_id", taxonomyId).eq("slug", slug).maybeSingle();
  return (data as TaxonomyTerm) || null;
}

export async function saveTerm(t: Partial<TaxonomyTerm> & { taxonomy_id: string; slug: string; name: string }): Promise<TaxonomyTerm | null> {
  const payload = {
    taxonomy_id: t.taxonomy_id,
    parent_id: t.parent_id ?? null,
    slug: t.slug,
    name: t.name,
    description: t.description ?? null,
    seo_title: t.seo_title ?? null,
    seo_description: t.seo_description ?? null,
    og_image: t.og_image ?? null,
    canonical_url: t.canonical_url ?? null,
    schema_json: t.schema_json ?? null,
    archive_template_id: t.archive_template_id ?? null,
    position: t.position ?? 0,
  };
  if (t.id) {
    const { data } = await db.from("taxonomy_terms").update(payload).eq("id", t.id).select().maybeSingle();
    return data as TaxonomyTerm | null;
  }
  const { data } = await db.from("taxonomy_terms").insert(payload).select().maybeSingle();
  return data as TaxonomyTerm | null;
}

export async function deleteTerm(id: string) {
  await db.from("taxonomy_terms").delete().eq("id", id);
}

// Build a parent->children tree.
export type TermNode = TaxonomyTerm & { children: TermNode[] };
export function buildTermTree(terms: TaxonomyTerm[]): TermNode[] {
  const map = new Map<string, TermNode>();
  terms.forEach((t) => map.set(t.id, { ...t, children: [] }));
  const roots: TermNode[] = [];
  map.forEach((node) => {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

// Entry assignments
export async function getEntryTerms(entryType: string, entryId: string): Promise<TaxonomyTerm[]> {
  const { data } = await db
    .from("entry_terms")
    .select("term_id, taxonomy_terms(*)")
    .eq("entry_type", entryType)
    .eq("entry_id", entryId);
  return ((data as { taxonomy_terms: TaxonomyTerm }[]) || []).map((r) => r.taxonomy_terms).filter(Boolean);
}

export async function setEntryTerms(entryType: string, entryId: string, termIds: string[]) {
  await db.from("entry_terms").delete().eq("entry_type", entryType).eq("entry_id", entryId);
  if (termIds.length) {
    await db.from("entry_terms").insert(
      termIds.map((term_id) => ({ entry_type: entryType, entry_id: entryId, term_id })),
    );
  }
}
