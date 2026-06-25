// Admin: CPT entries. List / create / edit entries for a given CPT.
// Routes:
//   /admin/cpt/:slug/entries        -> list
//   /admin/cpt/:slug/entries/:id    -> edit ('new' for new)

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Save, Trash2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import FieldRenderer from "@/components/admin/FieldRenderer";
import RevisionPanel from "@/components/admin/RevisionPanel";
import CustomFieldsPanel from "@/components/admin/CustomFieldsPanel";
import { loadValues, saveValues } from "@/lib/customFields";
import { useSiteConfig } from "@/providers/SiteProvider";
import { slugify, type CPT, type CPTEntry, type CustomField } from "@/lib/cpt";

const TBL_CPT = "custom_post_types" as any;
const TBL_FIELD = "custom_fields" as any;
const TBL_ENTRY = "cpt_entries" as any;

export default function AdminCPTEntries() {
  const { slug = "", id } = useParams();
  const nav = useNavigate();
  const [cpt, setCpt] = useState<CPT | null>(null);
  const [fields, setFields] = useState<CustomField[]>([]);

  useEffect(() => {
    (async () => {
      const { data: c } = await (supabase.from(TBL_CPT) as any).select("*").eq("slug", slug).maybeSingle();
      setCpt(c as CPT);
      const { data: f } = await (supabase.from(TBL_FIELD) as any).select("*").eq("cpt_slug", slug).order("position");
      setFields((f || []) as CustomField[]);
    })();
  }, [slug]);

  if (!cpt) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (id) return <EntryEditor cpt={cpt} fields={fields} entryId={id} onBack={() => nav(`/admin/cpt/${slug}/entries`)} />;
  return <EntryList cpt={cpt} />;
}

function EntryList({ cpt }: { cpt: CPT }) {
  const [rows, setRows] = useState<CPTEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string>("");
  const [quickEditingId, setQuickEditingId] = useState<string | null>(null);
  const [quickEditForm, setQuickEditForm] = useState({
    title: "",
    slug: "",
    status: "draft" as "draft" | "published" | "archived",
  });

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase.from(TBL_ENTRY) as any)
      .select("*").eq("cpt_slug", cpt.slug).order("updated_at", { ascending: false });
    setRows((data || []) as CPTEntry[]);
    setLoading(false);
  };
  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [cpt.slug]);

  const del = async (r: CPTEntry) => {
    if (!confirm(`Delete "${r.title}"?`)) return;
    const { error } = await (supabase.from(TBL_ENTRY) as any).delete().eq("id", r.id);
    if (error) {
      toast.error("Delete failed: " + error.message);
      return;
    }
    toast.success("Entry deleted");
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(r.id);
      return next;
    });
    setRows((rs) => rs.filter((x) => x.id !== r.id));
  };

  const startQuickEdit = (r: CPTEntry) => {
    setQuickEditingId(r.id);
    setQuickEditForm({
      title: r.title || "",
      slug: r.slug || "",
      status: r.status || "draft",
    });
  };

  const saveQuickEdit = async (r: CPTEntry) => {
    const toastId = toast.loading("Updating entry...");
    try {
      const finalSlug = quickEditForm.slug || slugify(quickEditForm.title) || `entry-${Date.now()}`;
      const { error } = await (supabase.from(TBL_ENTRY) as any).update({
        title: quickEditForm.title,
        slug: finalSlug,
        status: quickEditForm.status,
        updated_at: new Date().toISOString(),
      }).eq("id", r.id);

      if (error) throw error;

      toast.success("Entry updated", { id: toastId });
      void load();
      setQuickEditingId(null);
    } catch (err: any) {
      toast.error("Update failed: " + err.message, { id: toastId });
    }
  };

  const handleBulkApply = async () => {
    if (bulkAction !== "delete") return;
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to permanently delete these ${selectedIds.size} entries?`)) return;

    const toastId = toast.loading(`Deleting ${selectedIds.size} entries...`);
    try {
      const { error } = await (supabase.from(TBL_ENTRY) as any)
        .delete()
        .in("id", Array.from(selectedIds));

      if (error) throw error;

      toast.success(`Successfully deleted ${selectedIds.size} entries`, { id: toastId });
      setSelectedIds(new Set());
      void load();
    } catch (err: any) {
      toast.error("Bulk delete failed: " + err.message, { id: toastId });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-1"><Link to="/admin/cpt"><ArrowLeft className="w-4 h-4 mr-2" /> All types</Link></Button>
          <h1 className="text-2xl font-display">{cpt.plural_label}</h1>
          <p className="text-sm text-muted-foreground">{rows.length} entries</p>
        </div>
        <Button asChild><Link to={`/admin/cpt/${cpt.slug}/entries/new`}><Plus className="w-4 h-4 mr-2" /> New {cpt.label.toLowerCase()}</Link></Button>
      </div>

      {/* Bulk Actions Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-muted/20 p-3 border rounded-2xl">
        <div className="flex items-center gap-2">
          <Select value={bulkAction} onValueChange={setBulkAction}>
            <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Bulk Actions" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="delete">Delete permanently</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleBulkApply} disabled={!bulkAction || selectedIds.size === 0} variant="secondary" size="sm" className="h-9">
            Apply
          </Button>
        </div>
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span>{selectedIds.size} items selected</span>
            <Button onClick={() => setSelectedIds(new Set())} variant="ghost" size="sm" className="h-7 px-2">
              Deselect All
            </Button>
          </div>
        )}
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={rows.length > 0 && rows.every((r) => selectedIds.has(r.id))}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds(new Set(rows.map((r) => r.id)));
                    } else {
                      setSelectedIds(new Set());
                    }
                  }}
                  className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer align-middle"
                />
              </TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              if (r.id === quickEditingId) {
                return (
                  <TableRow key={r.id} className="bg-muted/30 hover:bg-muted/30">
                    <TableCell colSpan={6} className="p-4">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b pb-2">
                          <h4 className="font-semibold text-sm text-foreground">Quick Edit</h4>
                          <span className="text-xs text-muted-foreground">Slug: /{r.slug}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium">Title</label>
                            <Input
                              value={quickEditForm.title}
                              onChange={(e) => setQuickEditForm(prev => ({ ...prev, title: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium">Slug</label>
                            <Input
                              value={quickEditForm.slug}
                              onChange={(e) => setQuickEditForm(prev => ({ ...prev, slug: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium">Status</label>
                            <Select
                              value={quickEditForm.status}
                              onValueChange={(v) => setQuickEditForm(prev => ({ ...prev, status: v as any }))}
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="published">Published</SelectItem>
                                <SelectItem value="archived">Archived</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2 border-t">
                          <Button variant="outline" size="sm" onClick={() => setQuickEditingId(null)}>
                            Cancel
                          </Button>
                          <Button size="sm" onClick={() => saveQuickEdit(r)}>
                            Update
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              }

              return (
                <TableRow key={r.id}>
                  <TableCell className="w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(r.id)}
                      onChange={(e) => {
                        setSelectedIds(prev => {
                          const next = new Set(prev);
                          if (e.target.checked) {
                            next.add(r.id);
                          } else {
                            next.delete(r.id);
                          }
                          return next;
                        });
                      }}
                      className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer align-middle"
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link to={`/admin/cpt/${cpt.slug}/entries/${r.id}`} className="hover:underline">
                      {r.title || "(untitled)"}
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs">{r.slug}</TableCell>
                  <TableCell><Badge variant={r.status === "published" ? "default" : "outline"}>{r.status}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(r.updated_at).toLocaleString()}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="outline" onClick={() => startQuickEdit(r)}>Quick Edit</Button>
                    <Button asChild size="sm" variant="outline"><Link to={`/admin/cpt/${cpt.slug}/entries/${r.id}`}>Edit</Link></Button>
                    <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => del(r)}><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{loading ? "Loading…" : "No entries yet."}</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function EntryEditor({ cpt, fields, entryId, onBack }: { cpt: CPT; fields: CustomField[]; entryId: string; onBack: () => void }) {
  const isNew = entryId === "new";
  const nav = useNavigate();
  const { config } = useSiteConfig();
  const [entry, setEntry] = useState<CPTEntry | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [status, setStatus] = useState<"draft" | "published" | "archived">("draft");
  const [data, setData] = useState<Record<string, any>>({});
  const [cfValues, setCfValues] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNew) { setEntry(null); return; }
    (async () => {
      const { data: e } = await (supabase.from(TBL_ENTRY) as any).select("*").eq("id", entryId).maybeSingle();
      if (e) {
        setEntry(e as CPTEntry);
        setTitle(e.title || ""); setSlug(e.slug || ""); setStatus(e.status);
        setData(e.data || {});
        const v = await loadValues(`cpt:${cpt.slug}`, e.id);
        setCfValues(v);
      }
    })();
  }, [entryId, isNew, cpt.slug]);

  const save = async () => {
    setSaving(true);
    const finalSlug = slug || slugify(title) || `entry-${Date.now()}`;
    let savedId = entry?.id || "";
    if (isNew) {
      const { data: created, error } = await (supabase.from(TBL_ENTRY) as any).insert({
        cpt_slug: cpt.slug, title, slug: finalSlug, status, data,
        published_at: status === "published" ? new Date().toISOString() : null,
      }).select().single();
      if (error) { setSaving(false); toast.error(error.message); return; }
      savedId = (created as any).id;
      toast.success("Created");
    } else if (entry) {
      const { error } = await (supabase.from(TBL_ENTRY) as any).update({
        title, slug: finalSlug, status, data,
        published_at: status === "published" && !entry.published_at ? new Date().toISOString() : entry.published_at,
      }).eq("id", entry.id);
      if (error) { setSaving(false); toast.error(error.message); return; }
      toast.success("Saved");
    }
    try {
      if (savedId) await saveValues(`cpt:${cpt.slug}`, savedId, config?.site?.id || null, cfValues);
    } catch { /* ignore */ }
    setSaving(false);
    if (isNew && savedId) nav(`/admin/cpt/${cpt.slug}/entries/${savedId}`);
  };

  const restore = async (snapshot: any) => {
    setTitle(snapshot.title || ""); setSlug(snapshot.slug || ""); setStatus(snapshot.status || "draft"); setData(snapshot.data || {});
    if (entry) {
      await (supabase.from(TBL_ENTRY) as any).update({
        title: snapshot.title, slug: snapshot.slug, status: snapshot.status, data: snapshot.data,
      }).eq("id", entry.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
        <Button onClick={save} disabled={saving}><Save className="w-4 h-4 mr-2" /> {saving ? "Saving…" : "Save"}</Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="space-y-1.5"><Label className="text-xs">Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Slug</Label><Input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} placeholder={slugify(title)} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-medium text-sm">Schema fields ({cpt.label})</h3>
            {fields.length === 0 && <p className="text-xs text-muted-foreground">No schema fields. Add some in Custom Types or use the Custom Fields panel below.</p>}
            {fields.map((f) => (
              <FieldRenderer key={f.id} field={f} value={data[f.field_key]} onChange={(v) => setData((d) => ({ ...d, [f.field_key]: v }))} />
            ))}
          </div>

          <CustomFieldsPanel
            entityType={`cpt:${cpt.slug}`}
            entityId={entry?.id || null}
            values={cfValues}
            onValuesChange={setCfValues}
          />
        </div>
        <div>
          {entry && <RevisionPanel entityType="cpt_entry" entityId={entry.id} onRestore={restore} />}
        </div>
      </div>
    </div>
  );
}
