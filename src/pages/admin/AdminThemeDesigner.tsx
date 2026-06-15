// Theme Designer: Sections library + Templates library + Global Design Tokens.
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Search, Trash2, Edit3, LayoutTemplate, Boxes, Palette, History as HistoryIcon, RotateCcw, Link2, CloudUpload } from "lucide-react";
import { publishComponent } from "@/lib/componentCloud";
import { useSiteConfig } from "@/providers/SiteProvider";
import VisualCanvas, { type Block as VCBlock } from "@/components/admin/VisualCanvas";
import {
  listSections, listTemplates, saveSection, saveTemplate, deleteSection, deleteTemplate,
  loadTokens, saveTokens, listSectionRevisions, SECTION_CATEGORIES, TEMPLATE_KINDS,
  type ThemeSection, type ThemeTemplate, type ThemeTokens, type TemplateKind, DEFAULT_TOKENS,
  type SectionRevision,
} from "@/lib/themeStore";
import {
  listAssignments, saveAssignment, deleteAssignment,
  type TemplateAssignment, type TemplateScope,
} from "@/lib/templateAssignments";

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export default function AdminThemeDesigner() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-display">Theme Designer</h1>
        <p className="text-muted-foreground text-sm">
          Manage reusable sections, page templates, and global design tokens.
        </p>
      </header>

      <Tabs defaultValue="sections" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sections"><Boxes className="w-4 h-4 mr-1.5" />Sections</TabsTrigger>
          <TabsTrigger value="templates"><LayoutTemplate className="w-4 h-4 mr-1.5" />Templates</TabsTrigger>
          <TabsTrigger value="assignments"><Link2 className="w-4 h-4 mr-1.5" />Assignments</TabsTrigger>
          <TabsTrigger value="tokens"><Palette className="w-4 h-4 mr-1.5" />Global Design</TabsTrigger>
        </TabsList>
        <TabsContent value="sections"><SectionsTab /></TabsContent>
        <TabsContent value="templates"><TemplatesTab /></TabsContent>
        <TabsContent value="assignments"><AssignmentsTab /></TabsContent>
        <TabsContent value="tokens"><TokensTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------- Sections ----------------
function SectionsTab() {
  const { config } = useSiteConfig();
  const siteId = config?.site?.id;
  const [items, setItems] = useState<ThemeSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [editing, setEditing] = useState<Partial<ThemeSection> | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);

  const publishToCloud = async (s: ThemeSection) => {
    setPublishing(s.id);
    try {
      const { status, asset } = await publishComponent({
        kind: "section",
        slug: s.slug,
        name: s.name,
        description: s.description || null,
        category: s.category || null,
        payload: { blocks: s.blocks, category: s.category, design_tokens: s.design_tokens, variants: s.variants },
        publisher_site_id: siteId || null,
      });
      toast.success(status === "pending_review" ? `Submitted "${asset.name}" for review` : `Published "${asset.name}" v${asset.version}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Publish failed");
    }
    setPublishing(null);
  };

  const reload = async () => {
    setLoading(true);
    setItems(await listSections());
    setLoading(false);
  };
  useEffect(() => { void reload(); }, []);

  const filtered = useMemo(() => items.filter((s) =>
    (category === "all" || s.category === category) &&
    (!q || s.name.toLowerCase().includes(q.toLowerCase()) || s.slug.includes(q.toLowerCase()))
  ), [items, q, category]);

  const grouped = useMemo(() => {
    const m: Record<string, ThemeSection[]> = {};
    filtered.forEach((s) => { (m[s.category] ||= []).push(s); });
    return m;
  }, [filtered]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 opacity-50" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search sections" className="pl-8 w-64" />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {SECTION_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button onClick={() => setEditing({ name: "", slug: "", category: "Hero", blocks: [], variants: [], design_tokens: {} })}>
          <Plus className="w-4 h-4 mr-1" /> New section
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No sections yet. Create your first reusable section.
        </Card>
      ) : (
        Object.entries(grouped).map(([cat, list]) => (
          <div key={cat} className="space-y-2">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground">{cat}</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {list.map((s) => (
                <Card key={s.id} className="p-4 flex flex-col gap-2">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{s.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{s.slug}</p>
                    </div>
                    <div className="flex gap-1">
                      {s.source === "parent" && <Badge variant="secondary">parent</Badge>}
                      {s.is_global && <Badge>global</Badge>}
                    </div>
                  </div>
                  {s.description && <p className="text-xs text-muted-foreground line-clamp-2">{s.description}</p>}
                  <div className="text-[10px] text-muted-foreground">
                    v{s.version} · {(s.variants || []).length} variant{(s.variants || []).length === 1 ? "" : "s"}
                  </div>
                  <div className="flex gap-2 mt-auto pt-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditing(s)}>
                      <Edit3 className="w-3.5 h-3.5 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={async () => {
                      if (!confirm(`Delete "${s.name}"?`)) return;
                      await deleteSection(s.id); toast.success("Deleted"); void reload();
                    }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}

      {editing && (
        <SectionEditor
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); void reload(); }}
        />
      )}
    </div>
  );
}

function SectionEditor({ initial, onClose, onSaved }: { initial: Partial<ThemeSection>; onClose: () => void; onSaved: () => void }) {
  const [s, setS] = useState<Partial<ThemeSection>>(initial);
  const [busy, setBusy] = useState(false);
  const [activeVariantId, setActiveVariantId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [revisions, setRevisions] = useState<SectionRevision[]>([]);

  const openHistory = async () => {
    if (!s.id) return;
    setHistoryOpen(true);
    setRevisions(await listSectionRevisions(s.id));
  };
  const restoreRevision = (r: SectionRevision) => {
    const snap = r.snapshot || {};
    setS({
      ...s,
      name: snap.name ?? s.name,
      slug: snap.slug ?? s.slug,
      category: snap.category ?? s.category,
      description: snap.description ?? s.description,
      blocks: snap.blocks ?? [],
      variants: snap.variants ?? [],
      design_tokens: snap.design_tokens ?? {},
    });
    setHistoryOpen(false);
    toast.success("Snapshot loaded — click Save to apply");
  };


  const blocks = activeVariantId
    ? ((s.variants || []).find((v) => v.id === activeVariantId)?.blocks || []) as unknown[]
    : (s.blocks || []) as unknown[];

  const setBlocks = (next: unknown[]) => {
    if (activeVariantId) {
      const vs = (s.variants || []).map((v) => v.id === activeVariantId ? { ...v, blocks: next } : v);
      setS({ ...s, variants: vs });
    } else {
      setS({ ...s, blocks: next });
    }
  };

  const saveAsVariant = () => {
    const name = prompt("Variant name?");
    if (!name) return;
    const newV = { id: Math.random().toString(36).slice(2, 10), name, blocks: (s.blocks || []) as unknown[] };
    setS({ ...s, variants: [...(s.variants || []), newV] });
    setActiveVariantId(newV.id);
    toast.success(`Variant "${name}" created`);
  };

  const handleSave = async () => {
    if (!s.name || !s.category) { toast.error("Name and category required"); return; }
    setBusy(true);
    const saved = await saveSection({
      ...s,
      name: s.name!,
      slug: s.slug || slugify(s.name!),
      category: s.category!,
    });
    setBusy(false);
    if (saved) { toast.success("Saved"); onSaved(); } else toast.error("Save failed");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 p-3" onClick={onClose}>
      <Card className="w-full h-full overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <Input value={s.name || ""} onChange={(e) => setS({ ...s, name: e.target.value })} placeholder="Section name" className="text-lg font-medium border-0 px-0 focus-visible:ring-0" />
            <div className="flex gap-2 mt-1">
              <Input value={s.slug || ""} onChange={(e) => setS({ ...s, slug: e.target.value })} placeholder="slug" className="h-6 text-xs w-40" />
              <Select value={s.category || "Hero"} onValueChange={(v) => setS({ ...s, category: v })}>
                <SelectTrigger className="h-6 text-xs w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SECTION_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1 text-xs">
                <Switch checked={!!s.is_global} onCheckedChange={(v) => setS({ ...s, is_global: v })} />
                <span>Global</span>
              </div>
            </div>
          </div>
          {s.id && (
            <Button variant="outline" onClick={openHistory} title="Version history">
              <HistoryIcon className="w-4 h-4 mr-1" /> History
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={busy}>Save section</Button>
        </div>

        <div className="flex-1 overflow-hidden p-3">
          <Tabs defaultValue="visual" className="h-full flex flex-col">
            <TabsList className="self-start">
              <TabsTrigger value="visual">Visual</TabsTrigger>
              <TabsTrigger value="json">JSON</TabsTrigger>
              <TabsTrigger value="meta">Meta</TabsTrigger>
            </TabsList>
            <TabsContent value="visual" className="flex-1 mt-3">
              <VisualCanvas
                blocks={blocks as VCBlock[]}
                onChange={(b) => setBlocks(b)}
                variants={(s.variants || []) as { id: string; name: string; blocks: VCBlock[] }[]}
                activeVariantId={activeVariantId}
                onVariantChange={setActiveVariantId}
                onSaveVariant={saveAsVariant}
              />
            </TabsContent>
            <TabsContent value="json" className="flex-1 mt-3">
              <Textarea
                rows={20}
                className="font-mono text-xs h-full"
                value={JSON.stringify(s.blocks || [], null, 2)}
                onChange={(e) => {
                  try { setS({ ...s, blocks: JSON.parse(e.target.value) }); } catch { /* */ }
                }}
              />
            </TabsContent>
            <TabsContent value="meta" className="flex-1 mt-3 max-w-xl space-y-3">
              <div>
                <Label>Description</Label>
                <Textarea value={s.description || ""} onChange={(e) => setS({ ...s, description: e.target.value })} />
              </div>
              <p className="text-xs text-muted-foreground">
                Version {s.version || 1} · {(s.variants || []).length} variant{(s.variants || []).length === 1 ? "" : "s"}
              </p>
            </TabsContent>
          </Tabs>
        </div>
      </Card>

      {historyOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4" onClick={() => setHistoryOpen(false)}>
          <Card className="w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-medium">Version history</h3>
              <Button size="sm" variant="ghost" onClick={() => setHistoryOpen(false)}>Close</Button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {revisions.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground text-center">No snapshots yet. Future saves will appear here.</p>
              ) : (
                <ul className="space-y-1">
                  {revisions.map((r) => (
                    <li key={r.id} className="flex items-center justify-between p-3 rounded hover:bg-muted/50">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">v{r.snapshot?.version ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => restoreRevision(r)}>
                        <RotateCcw className="w-3.5 h-3.5 mr-1" /> Restore
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ---------------- Templates ----------------
function TemplatesTab() {
  const [items, setItems] = useState<ThemeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState<string>("all");
  const [editing, setEditing] = useState<Partial<ThemeTemplate> | null>(null);

  const reload = async () => {
    setLoading(true);
    setItems(await listTemplates());
    setLoading(false);
  };
  useEffect(() => { void reload(); }, []);

  const filtered = useMemo(() => items.filter((t) => kind === "all" || t.kind === kind), [items, kind]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All template kinds</SelectItem>
            {TEMPLATE_KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button onClick={() => setEditing({ name: "", slug: "", kind: "page", blocks: [] })}>
          <Plus className="w-4 h-4 mr-1" /> New template
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No templates yet. Create your first template.
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((t) => (
            <Card key={t.id} className="p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="font-medium truncate">{t.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{t.slug}</p>
                </div>
                <Badge variant="secondary">{TEMPLATE_KINDS.find((k) => k.value === t.kind)?.label || t.kind}</Badge>
              </div>
              {t.description && <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>}
              <div className="text-[10px] text-muted-foreground">v{t.version}{t.is_default ? " · default" : ""}</div>
              <div className="flex gap-2 mt-auto pt-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditing(t)}>
                  <Edit3 className="w-3.5 h-3.5 mr-1" /> Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={async () => {
                  if (!confirm(`Delete "${t.name}"?`)) return;
                  await deleteTemplate(t.id); toast.success("Deleted"); void reload();
                }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <TemplateEditor
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); void reload(); }}
        />
      )}
    </div>
  );
}

function TemplateEditor({ initial, onClose, onSaved }: { initial: Partial<ThemeTemplate>; onClose: () => void; onSaved: () => void }) {
  const [t, setT] = useState<Partial<ThemeTemplate>>(initial);
  const [busy, setBusy] = useState(false);
  const handleSave = async () => {
    if (!t.name || !t.kind) { toast.error("Name and kind required"); return; }
    setBusy(true);
    const saved = await saveTemplate({
      ...t,
      name: t.name!,
      slug: t.slug || slugify(t.name!),
      kind: t.kind as TemplateKind,
    });
    setBusy(false);
    if (saved) { toast.success("Saved"); onSaved(); } else toast.error("Save failed");
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 space-y-4">
          <h2 className="text-xl font-display">{t.id ? "Edit template" : "New template"}</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Name</Label>
              <Input value={t.name || ""} onChange={(e) => setT({ ...t, name: e.target.value })} />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={t.slug || ""} onChange={(e) => setT({ ...t, slug: e.target.value })} placeholder="auto from name" />
            </div>
            <div>
              <Label>Kind</Label>
              <Select value={t.kind || "page"} onValueChange={(v) => setT({ ...t, kind: v as TemplateKind })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEMPLATE_KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Switch checked={!!t.is_default} onCheckedChange={(v) => setT({ ...t, is_default: v })} />
              <Label>Default for this kind</Label>
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={t.description || ""} onChange={(e) => setT({ ...t, description: e.target.value })} />
          </div>
          <div>
            <Label>Blocks (JSON)</Label>
            <Textarea
              rows={8}
              className="font-mono text-xs"
              value={JSON.stringify(t.blocks || [], null, 2)}
              onChange={(e) => {
                try { setT({ ...t, blocks: JSON.parse(e.target.value) }); } catch { /* ignore */ }
              }}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={busy}>Save</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ---------------- Tokens ----------------
function TokensTab() {
  const [t, setT] = useState<ThemeTokens>(DEFAULT_TOKENS);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => { setT(await loadTokens()); setLoading(false); })();
  }, []);

  const save = async () => {
    setBusy(true);
    await saveTokens(t);
    setBusy(false);
    toast.success("Design tokens saved");
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6 max-w-3xl">
      <Card className="p-5 space-y-4">
        <h3 className="font-medium">Colors</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {Object.entries(t.colors).map(([k, v]) => (
            <div key={k} className="flex items-center gap-2">
              <input type="color" value={v} onChange={(e) => setT({ ...t, colors: { ...t.colors, [k]: e.target.value } })} className="w-10 h-10 rounded border" />
              <div className="flex-1">
                <Label className="text-xs">{k}</Label>
                <Input value={v} onChange={(e) => setT({ ...t, colors: { ...t.colors, [k]: e.target.value } })} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="font-medium">Typography</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Heading font family</Label>
            <Input value={t.typography.fontFamilyHeading || ""} onChange={(e) => setT({ ...t, typography: { ...t.typography, fontFamilyHeading: e.target.value } })} />
          </div>
          <div>
            <Label>Body font family</Label>
            <Input value={t.typography.fontFamilyBody || ""} onChange={(e) => setT({ ...t, typography: { ...t.typography, fontFamilyBody: e.target.value } })} />
          </div>
          <div>
            <Label>Base size (px)</Label>
            <Input type="number" value={t.typography.baseSize || 16} onChange={(e) => setT({ ...t, typography: { ...t.typography, baseSize: Number(e.target.value) } })} />
          </div>
          <div>
            <Label>Scale ratio</Label>
            <Input type="number" step="0.05" value={t.typography.scale || 1.25} onChange={(e) => setT({ ...t, typography: { ...t.typography, scale: Number(e.target.value) } })} />
          </div>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="font-medium">Responsive breakpoints (px)</h3>
        <div className="grid sm:grid-cols-3 gap-3">
          {(["mobile", "tablet", "desktop"] as const).map((bp) => (
            <div key={bp}>
              <Label className="capitalize">{bp}</Label>
              <Input type="number" value={t.breakpoints[bp]} onChange={(e) => setT({ ...t, breakpoints: { ...t.breakpoints, [bp]: Number(e.target.value) } })} />
            </div>
          ))}
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={busy}>Save tokens</Button>
      </div>
    </div>
  );
}

// ---------------- Assignments ----------------
const SCOPE_OPTIONS: { value: TemplateScope; label: string; placeholder: string }[] = [
  { value: "global", label: "Global (site-wide)", placeholder: "site" },
  { value: "route", label: "Route", placeholder: "/blog" },
  { value: "cpt", label: "Custom Post Type", placeholder: "service" },
  { value: "taxonomy", label: "Taxonomy", placeholder: "category" },
];

function AssignmentsTab() {
  const [assignments, setAssignments] = useState<TemplateAssignment[]>([]);
  const [templates, setTemplates] = useState<ThemeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Partial<TemplateAssignment>>({ scope: "global", target: "site", kind: "header", priority: 0 });

  const reload = async () => {
    setLoading(true);
    const [a, t] = await Promise.all([listAssignments(), listTemplates()]);
    setAssignments(a); setTemplates(t);
    setLoading(false);
  };
  useEffect(() => { void reload(); }, []);

  const templateName = (id: string) => templates.find((t) => t.id === id)?.name || "(missing)";

  const handleAdd = async () => {
    if (!draft.template_id) { toast.error("Pick a template"); return; }
    if (!draft.scope || !draft.target || !draft.kind) { toast.error("Scope, target and kind required"); return; }
    const saved = await saveAssignment({
      template_id: draft.template_id,
      scope: draft.scope as TemplateScope,
      target: draft.target,
      kind: draft.kind as TemplateKind,
      priority: draft.priority || 0,
    });
    if (saved) { toast.success("Assigned"); setDraft({ scope: "global", target: "site", kind: "header", priority: 0 }); void reload(); }
    else toast.error("Save failed");
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <Card className="p-4 space-y-3">
        <h3 className="font-medium">New assignment</h3>
        <div className="grid sm:grid-cols-5 gap-2">
          <div>
            <Label className="text-xs">Template</Label>
            <Select value={draft.template_id || ""} onValueChange={(v) => {
              const tpl = templates.find((t) => t.id === v);
              setDraft((d) => ({ ...d, template_id: v, kind: (tpl?.kind as TemplateKind) || d.kind }));
            }}>
              <SelectTrigger><SelectValue placeholder="Pick…" /></SelectTrigger>
              <SelectContent>
                {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name} ({t.kind})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Kind</Label>
            <Select value={draft.kind || "header"} onValueChange={(v) => setDraft((d) => ({ ...d, kind: v as TemplateKind }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TEMPLATE_KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Scope</Label>
            <Select value={draft.scope || "global"} onValueChange={(v) => setDraft((d) => ({ ...d, scope: v as TemplateScope }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SCOPE_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Target</Label>
            <Input
              value={draft.target || ""}
              onChange={(e) => setDraft((d) => ({ ...d, target: e.target.value }))}
              placeholder={SCOPE_OPTIONS.find((s) => s.value === draft.scope)?.placeholder}
            />
          </div>
          <div>
            <Label className="text-xs">Priority</Label>
            <Input type="number" value={draft.priority || 0} onChange={(e) => setDraft((d) => ({ ...d, priority: Number(e.target.value) }))} />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleAdd}><Plus className="w-4 h-4 mr-1" /> Add assignment</Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Resolution order: <code>route</code> → <code>cpt</code> → <code>taxonomy</code> → <code>global</code>. Higher priority wins inside the same scope.
        </p>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading…</p>
        ) : assignments.length === 0 ? (
          <p className="p-8 text-sm text-muted-foreground text-center">No assignments yet. Add one above to bind a header / footer / archive template to a route or CPT.</p>
        ) : (
          <ul className="divide-y">
            {assignments.map((a) => (
              <li key={a.id} className="p-3 flex items-center gap-3 text-sm">
                <Badge variant="outline">{a.kind}</Badge>
                <span className="font-medium">{templateName(a.template_id)}</span>
                <span className="text-muted-foreground">on</span>
                <Badge variant="secondary">{a.scope}: {a.target}</Badge>
                <span className="text-xs text-muted-foreground">priority {a.priority}</span>
                <div className="flex-1" />
                <Button size="sm" variant="ghost" onClick={async () => {
                  if (!confirm("Remove this assignment?")) return;
                  await deleteAssignment(a.id);
                  toast.success("Removed");
                  void reload();
                }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
