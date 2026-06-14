// Manifest Builder — turns parent CMS data into a fully-populated release
// manifest that children can apply locally without any extra fetching.
//
// Used by the Build Release flow. The output of buildManifest() becomes the
// `manifest` jsonb on a cms_releases row. Children download it through the
// cms-release edge function and pass it to applyManifest() on the child side.

import { supabase as cloud } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = cloud as any;

export type SnapshotSelection = {
  pages: boolean;
  posts: boolean;
  cpts: boolean;
  templates: boolean;
  sections: boolean;
  tokens: boolean;
  taxonomies: boolean;
  menus: boolean;
  redirects: boolean;
  settings: boolean;
  components: boolean;
  seo: boolean;
  mediaMeta: boolean;
};

export const DEFAULT_SELECTION: SnapshotSelection = {
  pages: true, posts: true, cpts: true, templates: true, sections: true,
  tokens: true, taxonomies: true, menus: true, redirects: true,
  settings: true, components: true, seo: true, mediaMeta: false,
};

export type BuiltManifest = {
  generated_at: string;
  source: "parent";
  pages?: unknown[];
  posts?: unknown[];
  cpts?: { types: unknown[]; entries: unknown[] };
  templates?: unknown[];
  sections?: unknown[];
  theme?: { tokens: unknown };
  taxonomies?: { taxonomies: unknown[]; terms: unknown[] };
  menus?: unknown[];
  redirects?: unknown[];
  settings?: Record<string, unknown> | null;
  components?: unknown[];
  seo?: { settings: unknown; files: unknown[] };
  media?: unknown[];
  // Cardinality summary so admins can sanity-check the build at a glance.
  _counts: Record<string, number>;
};

async function safe<T = unknown>(p: PromiseLike<{ data: T | null }>): Promise<T | null> {
  try { const r = await p; return r.data ?? null; } catch { return null; }
}
type AnyRow = Record<string, unknown>;


export async function buildManifest(sel: SnapshotSelection): Promise<BuiltManifest> {
  const out: BuiltManifest = {
    generated_at: new Date().toISOString(),
    source: "parent",
    _counts: {},
  };

  if (sel.pages) {
    // "pages" live as CPT entries with cpt_slug='page' in this project.
    const data = await safe<AnyRow[]>(db.from("cpt_entries").select("*").eq("cpt_slug", "page").eq("status", "published"));
    out.pages = data || [];
    out._counts.pages = (data || []).length;
  }
  if (sel.posts) {
    const data = await safe<AnyRow[]>(db.from("cpt_entries").select("*").eq("cpt_slug", "post").eq("status", "published"));
    out.posts = data || [];
    out._counts.posts = (data || []).length;
  }
  if (sel.cpts) {
    const types = await safe<AnyRow[]>(db.from("custom_post_types").select("*"));
    const entries = await safe<AnyRow[]>(
      db.from("cpt_entries").select("*").eq("status", "published").not("cpt_slug", "in", "(page,post)"),
    );

    out.cpts = { types: types || [], entries: entries || [] };
    out._counts.cpts = (types || []).length;
    out._counts.cpt_entries = (entries || []).length;
  }
  if (sel.templates) {
    const data = await safe<AnyRow[]>(db.from("theme_templates").select("*"));
    out.templates = data || [];
    out._counts.templates = (data || []).length;
  }
  if (sel.sections) {
    const data = await safe<AnyRow[]>(db.from("theme_sections").select("*"));
    out.sections = data || [];
    out._counts.sections = (data || []).length;
  }
  if (sel.tokens) {
    const data = await safe<AnyRow>(db.from("theme_tokens").select("*").limit(1).maybeSingle());
    out.theme = { tokens: data || null };
    out._counts.tokens = data ? 1 : 0;
  }
  if (sel.taxonomies) {
    const taxonomies = await safe<AnyRow[]>(db.from("taxonomies").select("*"));
    const terms = await safe<AnyRow[]>(db.from("taxonomy_terms").select("*"));
    out.taxonomies = { taxonomies: taxonomies || [], terms: terms || [] };
    out._counts.taxonomies = (taxonomies || []).length;
    out._counts.terms = (terms || []).length;
  }
  if (sel.redirects) {
    const data = await safe<AnyRow[]>(db.from("redirects").select("*"));
    out.redirects = data || [];
    out._counts.redirects = (data || []).length;
  }
  if (sel.settings) {
    const data = await safe<AnyRow>(db.from("site_settings").select("*").limit(1).maybeSingle());
    out.settings = (data as Record<string, unknown>) || null;
    out._counts.settings = data ? 1 : 0;
  }
  if (sel.components) {
    // Latest version per (kind, slug).
    const all = await safe<AnyRow[]>(db.from("cloud_components").select("*").eq("is_published", true));
    const latest = new Map<string, unknown>();
    for (const c of (all || []) as Array<Record<string, unknown>>) {
      const key = `${c.kind}::${c.slug}`;
      const existing = latest.get(key) as Record<string, unknown> | undefined;
      if (!existing || (Number(c.version) || 0) > (Number(existing.version) || 0)) {
        latest.set(key, c);
      }
    }
    out.components = Array.from(latest.values());
    out._counts.components = out.components.length;
  }
  if (sel.seo) {
    const settings = await safe<AnyRow>(db.from("seo_settings").select("*").limit(1).maybeSingle());
    const files = await safe<AnyRow[]>(db.from("seo_files").select("*"));
    out.seo = { settings, files: files || [] };
    out._counts.seo_files = (files || []).length;
  }
  if (sel.menus) {
    // Menus are stored on site_settings in this project. Exposed for clarity.
    out.menus = [];
    out._counts.menus = 0;
  }
  if (sel.mediaMeta) {
    const data = await safe<AnyRow[]>(db.from("media_meta").select("*").limit(2000));
    out.media = data || [];
    out._counts.media = (data || []).length;
  }

  return out;
}
