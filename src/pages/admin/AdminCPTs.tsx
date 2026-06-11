// Admin: CPT manager. List CPTs, create new ones, edit fields per CPT.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Save, Trash2, ArrowLeft, ArrowUp, ArrowDown, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { FIELD_TYPES, slugify, type CPT, type CustomField, type FieldType } from "@/lib/cpt";

const TBL_CPT = "custom_post_types" as any;
const TBL_FIELD = "custom_fields" as any;

export default function AdminCPTs() {
  const [cpts, setCpts] = useState<CPT[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<CPT | null>(null);
  const [newLabel, setNewLabel] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase.from(TBL_CPT) as any).select("*").order("label");
    setCpts((data || []) as CPT[]);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const create = async () => {
    const label = newLabel.trim();
    if (!label) return;
    const slug = slugify(label);
    const plural = label.endsWith("s") ? label : label + "s";
    const { data, error } = await (supabase.from(TBL_CPT) as any)
      .insert({ slug, label, plural_label: plural }).select().single();
    if (error) { toast.error(error.message); return; }
    setCpts((c) => [...c, data as CPT]);
    setNewLabel(""); setCreating(false);
    toast.success("Type created");
    setEditing(data as CPT);
  };

  const update = async (row: CPT, patch: Partial<CPT>) => {
    const { error } = await (supabase.from(TBL_CPT) as any).update(patch).eq("id", row.id);
    if (error) { toast.error(error.message); return; }
    setCpts((rs) => rs.map((r) => (r.id === row.id ? { ...r, ...patch } : r)));
    if (editing?.id === row.id) setEditing({ ...editing, ...patch } as CPT);
  };

  const del = async (row: CPT) => {
    if (!confirm(`Delete "${row.label}" and all its entries?`)) return;
    const { error } = await (supabase.from(TBL_CPT) as any).delete().eq("id", row.id);
    if (error) { toast.error(error.message); return; }
    setCpts((rs) => rs.filter((r) => r.id !== row.id));
    if (editing?.id === row.id) setEditing(null);
  };

  if (editing) return <CPTEditor cpt={editing} onBack={() => setEditing(null)} onSave={update} />;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-display">Custom Post Types</h1>
          <p className="text-sm text-muted-foreground">Define new content types and their custom fields.</p>
        </div>
        <Button onClick={() => setCreating(true)}><Plus className="w-4 h-4 mr-2" /> New type</Button>
      </div>

      {creating && (
        <div className="border rounded-lg p-4 flex gap-2">
          <Input placeholder="e.g. Case Study" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
          <Button onClick={create}><Save className="w-4 h-4 mr-2" /> Create</Button>
          <Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
        </div>
      )}

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Label</TableHead><TableHead>Slug</TableHead><TableHead>Public</TableHead><TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cpts.map((c) => (
              <TableRow key={c.id}>
                <TableCell><div className="font-medium">{c.label}</div><div className="text-xs text-muted-foreground">{c.plural_label}</div></TableCell>
                <TableCell><Badge variant="outline">{c.slug}</Badge></TableCell>
                <TableCell><Switch checked={c.is_public} onCheckedChange={(v) => update(c, { is_public: v })} /></TableCell>
                <TableCell className="text-right space-x-1">
                  <Button asChild size="sm" variant="ghost"><Link to={`/admin/cpt/${c.slug}/entries`}>Entries →</Link></Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(c)}>Fields</Button>
                  <Button size="sm" variant="ghost" onClick={() => del(c)}><Trash2 className="w-4 h-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {cpts.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No custom post types yet.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function CPTEditor({ cpt, onBack, onSave }: { cpt: CPT; onBack: () => void; onSave: (cpt: CPT, patch: Partial<CPT>) => Promise<void> }) {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [label, setLabel] = useState(cpt.label);
  const [plural, setPlural] = useState(cpt.plural_label);
  const [slug] = useState(cpt.slug);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase.from(TBL_FIELD) as any)
      .select("*").eq("cpt_slug", slug).order("position");
    setFields((data || []) as CustomField[]);
    setLoading(false);
  };
  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [slug]);

  const addField = async () => {
    const key = `field_${fields.length + 1}`;
    const { data, error } = await (supabase.from(TBL_FIELD) as any).insert({
      cpt_slug: slug, field_key: key, label: "New field",
      field_type: "text", position: fields.length, required: false, settings: {},
    }).select().single();
    if (error) { toast.error(error.message); return; }
    setFields((f) => [...f, data as CustomField]);
  };

  const updField = async (f: CustomField, patch: Partial<CustomField>) => {
    const { error } = await (supabase.from(TBL_FIELD) as any).update(patch).eq("id", f.id);
    if (error) { toast.error(error.message); return; }
    setFields((fs) => fs.map((x) => (x.id === f.id ? { ...x, ...patch } : x)));
  };

  const delField = async (f: CustomField) => {
    if (!confirm(`Delete field "${f.label}"?`)) return;
    await (supabase.from(TBL_FIELD) as any).delete().eq("id", f.id);
    setFields((fs) => fs.filter((x) => x.id !== f.id));
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const next = [...fields];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setFields(next);
    await Promise.all(next.map((f, i) => (supabase.from(TBL_FIELD) as any).update({ position: i }).eq("id", f.id)));
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>

      <div className="border rounded-lg p-4 grid sm:grid-cols-3 gap-3">
        <div className="space-y-1.5"><Label className="text-xs">Singular</Label><Input value={label} onChange={(e) => setLabel(e.target.value)} onBlur={() => onSave(cpt, { label })} /></div>
        <div className="space-y-1.5"><Label className="text-xs">Plural</Label><Input value={plural} onChange={(e) => setPlural(e.target.value)} onBlur={() => onSave(cpt, { plural_label: plural })} /></div>
        <div className="space-y-1.5"><Label className="text-xs">Slug</Label><Input value={slug} readOnly /></div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="font-medium">Fields ({fields.length})</h3>
        <Button onClick={addField}><Plus className="w-4 h-4 mr-2" /> Add field</Button>
      </div>

      <div className="space-y-2">
        {fields.map((f, i) => (
          <div key={f.id} className="border rounded-lg p-3 grid grid-cols-12 gap-2 items-end">
            <div className="col-span-1 flex flex-col gap-1 items-center pt-5">
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp className="w-3 h-3" /></Button>
              <GripVertical className="w-3 h-3 text-muted-foreground" />
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => move(i, 1)} disabled={i === fields.length - 1}><ArrowDown className="w-3 h-3" /></Button>
            </div>
            <div className="col-span-3 space-y-1"><Label className="text-xs">Label</Label>
              <Input value={f.label} onChange={(e) => updField(f, { label: e.target.value })} />
            </div>
            <div className="col-span-3 space-y-1"><Label className="text-xs">Key</Label>
              <Input value={f.field_key} onChange={(e) => updField(f, { field_key: slugify(e.target.value).replace(/-/g, "_") })} />
            </div>
            <div className="col-span-3 space-y-1"><Label className="text-xs">Type</Label>
              <Select value={f.field_type} onValueChange={(v) => updField(f, { field_type: v as FieldType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FIELD_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-1 flex flex-col items-center gap-1"><Label className="text-xs">Req.</Label>
              <Switch checked={f.required} onCheckedChange={(v) => updField(f, { required: v })} />
            </div>
            <div className="col-span-1 flex justify-end pt-5">
              <Button size="icon" variant="ghost" onClick={() => delField(f)}><Trash2 className="w-4 h-4" /></Button>
            </div>
            {(f.field_type === "select" || f.field_type === "multiselect") && (
              <div className="col-span-12 space-y-1 mt-1">
                <Label className="text-xs">Options (label:value, comma separated)</Label>
                <Input
                  defaultValue={(f.settings?.options || []).map((o: any) => `${o.label}:${o.value}`).join(", ")}
                  onBlur={(e) => {
                    const options = e.target.value.split(",").map((s) => s.trim()).filter(Boolean).map((p) => {
                      const [l, v] = p.split(":").map((x) => x?.trim());
                      return { label: l, value: v || slugify(l) };
                    });
                    updField(f, { settings: { ...f.settings, options } });
                  }}
                  placeholder="Alpha:alpha, Beta:beta"
                />
              </div>
            )}
          </div>
        ))}
        {fields.length === 0 && !loading && <p className="text-sm text-muted-foreground text-center py-8 border rounded-lg">No fields yet.</p>}
      </div>
    </div>
  );
}
