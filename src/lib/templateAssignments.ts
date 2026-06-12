// Template assignments — bind a Theme Template to a scope (route / cpt / taxonomy / global).
//
// scope:    "global" | "cpt" | "route" | "taxonomy"
// target:   slug or path (e.g. "service", "/blog", "category")
// kind:     mirrors template kind for fast resolution ("header" | "footer" | "archive" | etc.)
import { supabase as cloud } from "@/integrations/supabase/client";
import type { TemplateKind, ThemeTemplate } from "@/lib/themeStore";
import { listTemplates } from "@/lib/themeStore";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = cloud as any;

export type TemplateScope = "global" | "cpt" | "route" | "taxonomy";

export type TemplateAssignment = {
  id: string;
  template_id: string;
  scope: TemplateScope;
  target: string;
  kind: TemplateKind;
  priority: number;
  created_at: string;
  updated_at: string;
};

export async function listAssignments(): Promise<TemplateAssignment[]> {
  const { data } = await db.from("template_assignments").select("*").order("priority", { ascending: false });
  return (data || []) as TemplateAssignment[];
}

export async function saveAssignment(a: {
  id?: string;
  template_id: string;
  scope: TemplateScope;
  target: string;
  kind: TemplateKind;
  priority?: number;
}): Promise<TemplateAssignment | null> {
  const payload = {
    template_id: a.template_id,
    scope: a.scope,
    target: a.target,
    kind: a.kind,
    priority: a.priority ?? 0,
  };
  if (a.id) {
    const { data } = await db.from("template_assignments").update(payload).eq("id", a.id).select().maybeSingle();
    return data as TemplateAssignment | null;
  }
  const { data } = await db.from("template_assignments").upsert(payload, { onConflict: "scope,target,kind" }).select().maybeSingle();
  return data as TemplateAssignment | null;
}

export async function deleteAssignment(id: string) {
  await db.from("template_assignments").delete().eq("id", id);
}

/** Resolve the best-matching template for a route/cpt/taxonomy context. */
export async function resolveTemplate(opts: {
  kind: TemplateKind;
  route?: string;
  cpt?: string;
  taxonomy?: string;
}): Promise<ThemeTemplate | null> {
  const [assignments, templates] = await Promise.all([listAssignments(), listTemplates()]);
  const byId = new Map(templates.map((t) => [t.id, t]));

  const candidates = assignments.filter((a) => a.kind === opts.kind);

  // Priority: route > cpt > taxonomy > global
  const find = (pred: (a: TemplateAssignment) => boolean) =>
    candidates.filter(pred).sort((x, y) => y.priority - x.priority)[0];

  let pick: TemplateAssignment | undefined;
  if (opts.route) pick = find((a) => a.scope === "route" && a.target === opts.route);
  if (!pick && opts.cpt) pick = find((a) => a.scope === "cpt" && a.target === opts.cpt);
  if (!pick && opts.taxonomy) pick = find((a) => a.scope === "taxonomy" && a.target === opts.taxonomy);
  if (!pick) pick = find((a) => a.scope === "global");

  if (pick && byId.has(pick.template_id)) return byId.get(pick.template_id)!;
  // Fallback to any "default" template of that kind.
  return templates.find((t) => t.kind === opts.kind && t.is_default) || null;
}
