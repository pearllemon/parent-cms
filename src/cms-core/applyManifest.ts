// Child-side manifest applier. Takes the populated manifest the parent built
// and upserts it into the local public.* tables.
//
// Safe to call repeatedly:
//   - Matches rows by slug / id where available.
//   - Skips rows where the LOCAL `updated_at` is newer than the manifest row
//     (last-write-wins guard so admin edits on the child aren't trampled).
//
// This is intentionally tolerant: any failure for one entity type is logged
// and skipped — the rest of the manifest still applies. The site keeps
// rendering regardless.

import { supabase as cloud } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = cloud as any;

type Row = Record<string, unknown> & { id?: string; slug?: string; updated_at?: string };

async function upsertList(
  table: string,
  rows: Row[],
  onConflict: string,
): Promise<{ applied: number; skipped: number; error: string | null }> {
  if (!rows.length) return { applied: 0, skipped: 0, error: null };
  try {
    // Fetch existing updated_at for conflict-window resolution.
    const keys = rows
      .map((r) => (onConflict === "id" ? r.id : r.slug))
      .filter(Boolean) as string[];
    const { data: existing } = await db.from(table).select(`${onConflict}, updated_at`).in(onConflict, keys);
    const localMap = new Map<string, string>();
    for (const e of (existing || []) as Row[]) {
      const k = (onConflict === "id" ? e.id : e.slug) as string | undefined;
      if (k && e.updated_at) localMap.set(k, e.updated_at as string);
    }

    const toApply: Row[] = [];
    let skipped = 0;
    for (const r of rows) {
      const k = (onConflict === "id" ? r.id : r.slug) as string | undefined;
      const localTs = k ? localMap.get(k) : undefined;
      if (localTs && r.updated_at && Date.parse(localTs) > Date.parse(r.updated_at as string)) {
        skipped++; continue;
      }
      toApply.push(r);
    }
    if (!toApply.length) return { applied: 0, skipped, error: null };

    const { error } = await db.from(table).upsert(toApply, { onConflict });
    if (error) return { applied: 0, skipped, error: error.message };
    return { applied: toApply.length, skipped, error: null };
  } catch (e) {
    return { applied: 0, skipped: 0, error: String((e as Error)?.message || e) };
  }
}

export type ApplyReport = {
  ok: boolean;
  totals: { applied: number; skipped: number };
  perEntity: Record<string, { applied: number; skipped: number; error: string | null }>;
};

export async function applyManifest(manifest: unknown): Promise<ApplyReport> {
  const report: ApplyReport = {
    ok: true, totals: { applied: 0, skipped: 0 }, perEntity: {},
  };
  if (!manifest || typeof manifest !== "object") return report;
  const m = manifest as Record<string, unknown>;

  const track = async (label: string, p: Promise<{ applied: number; skipped: number; error: string | null }>) => {
    const r = await p;
    report.perEntity[label] = r;
    report.totals.applied += r.applied;
    report.totals.skipped += r.skipped;
    if (r.error) report.ok = false;
  };

  // Theme tokens (single-row)
  const theme = m.theme as { tokens?: Row | null } | undefined;
  if (theme?.tokens) {
    await track("theme_tokens", upsertList("theme_tokens", [theme.tokens], "id"));
  }

  // Templates / sections
  if (Array.isArray(m.templates)) await track("theme_templates", upsertList("theme_templates", m.templates as Row[], "slug"));
  if (Array.isArray(m.sections))  await track("theme_sections",  upsertList("theme_sections",  m.sections  as Row[], "slug"));

  // Taxonomies
  const tx = m.taxonomies as { taxonomies?: Row[]; terms?: Row[] } | undefined;
  if (tx?.taxonomies) await track("taxonomies", upsertList("taxonomies", tx.taxonomies, "slug"));
  if (tx?.terms)      await track("taxonomy_terms", upsertList("taxonomy_terms", tx.terms, "id"));

  // CPTs
  const cpts = m.cpts as { types?: Row[]; entries?: Row[] } | undefined;
  if (cpts?.types)   await track("custom_post_types", upsertList("custom_post_types", cpts.types, "slug"));
  if (cpts?.entries) await track("cpt_entries", upsertList("cpt_entries", cpts.entries, "id"));

  // Pages / posts (also cpt_entries)
  if (Array.isArray(m.pages)) await track("pages", upsertList("cpt_entries", m.pages as Row[], "id"));
  if (Array.isArray(m.posts)) await track("posts", upsertList("cpt_entries", m.posts as Row[], "id"));

  // Redirects
  if (Array.isArray(m.redirects)) await track("redirects", upsertList("redirects", m.redirects as Row[], "id"));

  // Site settings
  if (m.settings && typeof m.settings === "object") {
    await track("site_settings", upsertList("site_settings", [m.settings as Row], "id"));
  }

  // Cloud components → local theme_sections / theme_templates
  if (Array.isArray(m.components)) {
    const sections: Row[] = []; const templates: Row[] = [];
    for (const c of m.components as Array<Record<string, unknown>>) {
      const kind = String(c.kind || "");
      const slug = String(c.slug || "");
      if (!slug) continue;
      const payload = (c.payload as Row) || {};
      if (kind === "template") templates.push({ ...payload, slug });
      else sections.push({ ...payload, slug });
    }
    if (sections.length)  await track("components→sections",  upsertList("theme_sections",  sections,  "slug"));
    if (templates.length) await track("components→templates", upsertList("theme_templates", templates, "slug"));
  }

  // SEO
  const seo = m.seo as { settings?: Row | null; files?: Row[] } | undefined;
  if (seo?.settings) await track("seo_settings", upsertList("seo_settings", [seo.settings], "id"));
  if (seo?.files)    await track("seo_files",    upsertList("seo_files",    seo.files, "id"));

  return report;
}
