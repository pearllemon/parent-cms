// Taxonomies admin: list taxonomies, manage terms (hierarchical), edit SEO per term.
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Edit3, ChevronRight, RefreshCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  listTaxonomies, saveTaxonomy, deleteTaxonomy,
  listTerms, saveTerm, deleteTerm, buildTermTree,
  type Taxonomy, type TaxonomyTerm, type TermNode,
} from "@/lib/taxonomies";

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export default function AdminTaxonomies() {
  const [search, setSearch] = useSearchParams();
  const [taxonomies, setTaxonomies] = useState<Taxonomy[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTax, setEditingTax] = useState<Partial<Taxonomy> | null>(null);

  const activeSlug = search.get("tax") || "category";

  const reload = async () => {
    setLoading(true);
    const list = await listTaxonomies();
    setTaxonomies(list);
    setLoading(false);
  };
  useEffect(() => { void reload(); }, []);

  const active = taxonomies.find((t) => t.slug === activeSlug) || taxonomies[0];

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display">Taxonomies</h1>
          <p className="text-muted-foreground text-sm">
            Categories, tags, and custom taxonomies. Each term gets its own SEO archive page.
          </p>
        </div>
        <Button onClick={() => setEditingTax({ name: "", slug: "", label_singular: "", hierarchical: false, applies_to: ["post"] })}>
          <Plus className="w-4 h-4 mr-1" /> New taxonomy
        </Button>
      </header>

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <Tabs value={active?.slug} onValueChange={(v) => setSearch({ tax: v })}>
          <TabsList className="flex-wrap h-auto">
            {taxonomies.map((t) => (
              <TabsTrigger key={t.id} value={t.slug}>
                {t.name}
                {t.hierarchical && <Badge variant="secondary" className="ml-2 text-[9px]">hierarchical</Badge>}
              </TabsTrigger>
            ))}
          </TabsList>
          {taxonomies.map((t) => (
            <TabsContent key={t.id} value={t.slug}>
              <TaxonomyPanel taxonomy={t} onEditTaxonomy={() => setEditingTax(t)} onDeletedTaxonomy={() => { setSearch({}); void reload(); }} />
            </TabsContent>
          ))}
        </Tabs>
      )}

      {editingTax && (
        <TaxonomyEditor
          initial={editingTax}
          onClose={() => setEditingTax(null)}
          onSaved={(slug) => { setEditingTax(null); void reload(); if (slug) setSearch({ tax: slug }); }}
        />
      )}
    </div>
  );
}

function TaxonomyPanel({ taxonomy, onEditTaxonomy, onDeletedTaxonomy }: { taxonomy: Taxonomy; onEditTaxonomy: () => void; onDeletedTaxonomy: () => void }) {
  const [terms, setTerms] = useState<TaxonomyTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<TaxonomyTerm> | null>(null);

  const reload = async () => {
    setLoading(true);
    setTerms(await listTerms(taxonomy.id));
    setLoading(false);
  };
  useEffect(() => { void reload(); }, [taxonomy.id]);

  const tree = useMemo(() => buildTermTree(terms), [terms]);

  return (
    <div className="space-y-4">
      <Card className="p-4 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium">{taxonomy.name}</p>
          <p className="text-xs text-muted-foreground">
            Slug <code>{taxonomy.slug}</code> · Applies to: {taxonomy.applies_to.join(", ")} ·{" "}
            Archive URL: <code>/{taxonomy.slug}/[term-slug]</code>
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onEditTaxonomy}>Edit taxonomy</Button>
        {!["category", "tag"].includes(taxonomy.slug) && (
          <Button size="sm" variant="ghost" onClick={async () => {
            if (!confirm(`Delete taxonomy "${taxonomy.name}" and all its terms?`)) return;
            await deleteTaxonomy(taxonomy.id);
            toast.success("Deleted"); onDeletedTaxonomy();
          }}>
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
        <Button size="sm" onClick={() => setEditing({ taxonomy_id: taxonomy.id, name: "", slug: "" })}>
          <Plus className="w-4 h-4 mr-1" /> New term
        </Button>
      </Card>

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> :
        terms.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            No terms yet. Create your first {taxonomy.label_singular.toLowerCase()}.
          </Card>
        ) : (
          <Card className="p-2">
            <TermTree
              nodes={tree}
              hierarchical={taxonomy.hierarchical}
              taxonomySlug={taxonomy.slug}
              onEdit={(t) => setEditing(t)}
              onDeleted={reload}
            />
          </Card>
        )
      }

      {editing && (
        <TermEditor
          initial={editing}
          taxonomy={taxonomy}
          allTerms={terms}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); void reload(); }}
        />
      )}
    </div>
  );
}

function TermTree({ nodes, hierarchical, taxonomySlug, onEdit, onDeleted, depth = 0 }: {
  nodes: TermNode[]; hierarchical: boolean; taxonomySlug: string;
  onEdit: (t: TaxonomyTerm) => void; onDeleted: () => Promise<void>; depth?: number;
}) {
  return (
    <ul className="space-y-1">
      {nodes.map((n) => (
        <li key={n.id}>
          <div className="flex items-center gap-2 p-2 rounded hover:bg-muted/50" style={{ paddingLeft: 8 + depth * 20 }}>
            {hierarchical && depth > 0 && <ChevronRight className="w-3 h-3 opacity-40" />}
            <div className="flex-1 min-w-0">
              <span className="font-medium">{n.name}</span>
              <span className="text-xs text-muted-foreground ml-2">/{taxonomySlug}/{n.slug}</span>
              {n.seo_title && <Badge variant="secondary" className="ml-2 text-[9px]">SEO</Badge>}
            </div>
            <Button size="sm" variant="ghost" onClick={() => onEdit(n)}>
              <Edit3 className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" variant="ghost" onClick={async () => {
              if (!confirm(`Delete "${n.name}"?`)) return;
              await deleteTerm(n.id); toast.success("Deleted"); await onDeleted();
            }}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
          {n.children.length > 0 && (
            <TermTree nodes={n.children} hierarchical={hierarchical} taxonomySlug={taxonomySlug} onEdit={onEdit} onDeleted={onDeleted} depth={depth + 1} />
          )}
        </li>
      ))}
    </ul>
  );
}

function TermEditor({ initial, taxonomy, allTerms, onClose, onSaved }: {
  initial: Partial<TaxonomyTerm>; taxonomy: Taxonomy; allTerms: TaxonomyTerm[];
  onClose: () => void; onSaved: () => void;
}) {
  const [t, setT] = useState<Partial<TaxonomyTerm>>(initial);
  const [busy, setBusy] = useState(false);
  const parentOptions = allTerms.filter((x) => x.id !== t.id);

  const handleSave = async () => {
    if (!t.name) { toast.error("Name required"); return; }
    setBusy(true);
    const saved = await saveTerm({
      ...t,
      taxonomy_id: taxonomy.id,
      name: t.name!,
      slug: t.slug || slugify(t.name!),
    });
    setBusy(false);
    if (saved) { toast.success("Saved"); onSaved(); } else toast.error("Save failed");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 space-y-4">
          <h2 className="text-xl font-display">{t.id ? `Edit ${taxonomy.label_singular.toLowerCase()}` : `New ${taxonomy.label_singular.toLowerCase()}`}</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Name</Label>
              <Input value={t.name || ""} onChange={(e) => setT({ ...t, name: e.target.value })} />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={t.slug || ""} onChange={(e) => setT({ ...t, slug: e.target.value })} placeholder="auto from name" />
            </div>
            {taxonomy.hierarchical && (
              <div className="sm:col-span-2">
                <Label>Parent</Label>
                <Select value={t.parent_id || "__none__"} onValueChange={(v) => setT({ ...t, parent_id: v === "__none__" ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None (top level) —</SelectItem>
                    {parentOptions.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={t.description || ""} onChange={(e) => setT({ ...t, description: e.target.value })} />
          </div>

          <div className="pt-2 border-t space-y-3">
            <h3 className="text-sm font-medium">SEO</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label>SEO title</Label>
                <Input value={t.seo_title || ""} onChange={(e) => setT({ ...t, seo_title: e.target.value })} maxLength={70} />
              </div>
              <div className="sm:col-span-2">
                <Label>Meta description</Label>
                <Textarea value={t.seo_description || ""} onChange={(e) => setT({ ...t, seo_description: e.target.value })} maxLength={170} />
              </div>
              <div>
                <Label>Canonical URL</Label>
                <Input value={t.canonical_url || ""} onChange={(e) => setT({ ...t, canonical_url: e.target.value })} placeholder="leave blank to auto" />
              </div>
              <div>
                <Label>OG image URL</Label>
                <Input value={t.og_image || ""} onChange={(e) => setT({ ...t, og_image: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Schema JSON-LD (optional)</Label>
              <Textarea
                rows={5}
                className="font-mono text-xs"
                value={t.schema_json ? JSON.stringify(t.schema_json, null, 2) : ""}
                onChange={(e) => {
                  if (!e.target.value.trim()) { setT({ ...t, schema_json: null }); return; }
                  try { setT({ ...t, schema_json: JSON.parse(e.target.value) }); } catch { /* ignore */ }
                }}
              />
            </div>
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

function TaxonomyEditor({ initial, onClose, onSaved }: {
  initial: Partial<Taxonomy>; onClose: () => void; onSaved: (slug?: string) => void;
}) {
  const [t, setT] = useState<Partial<Taxonomy>>(initial);
  const [appliesText, setAppliesText] = useState((initial.applies_to || ["post"]).join(", "));
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    if (!t.name) { toast.error("Name required"); return; }
    setBusy(true);
    const saved = await saveTaxonomy({
      ...t,
      name: t.name!,
      slug: t.slug || slugify(t.name!),
      label_singular: t.label_singular || t.name!,
      applies_to: appliesText.split(",").map((s) => s.trim()).filter(Boolean),
    });
    setBusy(false);
    if (saved) { toast.success("Saved"); onSaved(saved.slug); } else toast.error("Save failed");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <Card className="w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 space-y-4">
          <h2 className="text-xl font-display">{t.id ? "Edit taxonomy" : "New taxonomy"}</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Name (plural)</Label>
              <Input value={t.name || ""} onChange={(e) => setT({ ...t, name: e.target.value })} placeholder="Industries" />
            </div>
            <div>
              <Label>Label (singular)</Label>
              <Input value={t.label_singular || ""} onChange={(e) => setT({ ...t, label_singular: e.target.value })} placeholder="Industry" />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={t.slug || ""} onChange={(e) => setT({ ...t, slug: e.target.value })} disabled={["category", "tag"].includes(t.slug || "")} />
            </div>
            <div className="flex items-end gap-2">
              <Switch checked={!!t.hierarchical} onCheckedChange={(v) => setT({ ...t, hierarchical: v })} />
              <Label>Hierarchical (like categories)</Label>
            </div>
            <div className="sm:col-span-2">
              <Label>Applies to (comma-separated content types)</Label>
              <Input value={appliesText} onChange={(e) => setAppliesText(e.target.value)} placeholder="post, page, service" />
            </div>
            <div className="sm:col-span-2">
              <Label>Description</Label>
              <Textarea value={t.description || ""} onChange={(e) => setT({ ...t, description: e.target.value })} />
            </div>
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
