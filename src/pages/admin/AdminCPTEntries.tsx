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
    await (supabase.from(TBL_ENTRY) as any).delete().eq("id", r.id);
    setRows((rs) => rs.filter((x) => x.id !== r.id));
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

      <div className="border rounded-lg">
        <Table>
          <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Slug</TableHead><TableHead>Status</TableHead><TableHead>Updated</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.title || "(untitled)"}</TableCell>
                <TableCell className="text-xs">{r.slug}</TableCell>
                <TableCell><Badge variant={r.status === "published" ? "default" : "outline"}>{r.status}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(r.updated_at).toLocaleString()}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button asChild size="sm" variant="ghost"><Link to={`/admin/cpt/${cpt.slug}/entries/${r.id}`}>Edit</Link></Button>
                  <Button size="sm" variant="ghost" onClick={() => del(r)}><Trash2 className="w-4 h-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{loading ? "Loading…" : "No entries yet."}</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function EntryEditor({ cpt, fields, entryId, onBack }: { cpt: CPT; fields: CustomField[]; entryId: string; onBack: () => void }) {
  const isNew = entryId === "new";
  const nav = useNavigate();
  const [entry, setEntry] = useState<CPTEntry | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [status, setStatus] = useState<"draft" | "published" | "archived">("draft");
  const [data, setData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNew) { setEntry(null); return; }
    (async () => {
      const { data: e } = await (supabase.from(TBL_ENTRY) as any).select("*").eq("id", entryId).maybeSingle();
      if (e) {
        setEntry(e as CPTEntry);
        setTitle(e.title || ""); setSlug(e.slug || ""); setStatus(e.status);
        setData(e.data || {});
      }
    })();
  }, [entryId, isNew]);

  const save = async () => {
    setSaving(true);
    const finalSlug = slug || slugify(title) || `entry-${Date.now()}`;
    if (isNew) {
      const { data: created, error } = await (supabase.from(TBL_ENTRY) as any).insert({
        cpt_slug: cpt.slug, title, slug: finalSlug, status, data,
        published_at: status === "published" ? new Date().toISOString() : null,
      }).select().single();
      setSaving(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Created");
      nav(`/admin/cpt/${cpt.slug}/entries/${(created as any).id}`);
    } else if (entry) {
      const { error } = await (supabase.from(TBL_ENTRY) as any).update({
        title, slug: finalSlug, status, data,
        published_at: status === "published" && !entry.published_at ? new Date().toISOString() : entry.published_at,
      }).eq("id", entry.id);
      setSaving(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Saved");
    }
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
            <h3 className="font-medium text-sm">Custom fields</h3>
            {fields.length === 0 && <p className="text-xs text-muted-foreground">No fields defined for this type yet.</p>}
            {fields.map((f) => (
              <FieldRenderer key={f.id} field={f} value={data[f.field_key]} onChange={(v) => setData((d) => ({ ...d, [f.field_key]: v }))} />
            ))}
          </div>
        </div>
        <div>
          {entry && <RevisionPanel entityType="cpt_entry" entityId={entry.id} onRestore={restore} />}
        </div>
      </div>
    </div>
  );
}
