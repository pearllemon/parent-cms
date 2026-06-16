// Admin: Schema Builder
// Manages JSON-LD schemas per page URL stored in public.page_schemas.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SCHEMA_TEMPLATES, getTemplate, validateSchema, type SchemaType } from "@/lib/schemaTemplates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Check, X, Save, FileJson, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

type Row = {
  id: string;
  page_url: string;
  schema_type: string;
  schema_json: any;
  enabled: boolean;
  note: string | null;
  updated_at: string;
};

const TBL = "page_schemas" as any;

export default function AdminSchemaBuilder() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);
  const [newType, setNewType] = useState<SchemaType>("Article");
  const [newUrl, setNewUrl] = useState("/");

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase.from(TBL) as any)
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data || []) as Row[]);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const create = async () => {
    const t = getTemplate(newType);
    if (!t) return;
    const { data, error } = await (supabase.from(TBL) as any)
      .insert({ page_url: newUrl, schema_type: newType, schema_json: t.example, enabled: true })
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    toast.success("Schema added");
    setCreating(false);
    setRows((r) => [data as Row, ...r]);
    setEditing(data as Row);
  };

  const save = async (row: Row, patch: Partial<Row>) => {
    const { error } = await (supabase.from(TBL) as any).update(patch).eq("id", row.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, ...patch } : r)));
    if (editing?.id === row.id) setEditing({ ...editing, ...patch });
  };

  const del = async (row: Row) => {
    if (!confirm(`Delete ${row.schema_type} for ${row.page_url}?`)) return;
    const { error } = await (supabase.from(TBL) as any).delete().eq("id", row.id);
    if (error) { toast.error(error.message); return; }
    setRows((rs) => rs.filter((r) => r.id !== row.id));
    if (editing?.id === row.id) setEditing(null);
  };

  if (editing) return <Editor row={editing} onBack={() => setEditing(null)} onSave={save} onDelete={del} />;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-display">Schema Builder</h1>
          <p className="text-sm text-muted-foreground">Per-page JSON-LD schema.org entries. Site renderer injects enabled schemas.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Reload
          </Button>
          <Button onClick={() => setCreating(true)}><Plus className="w-4 h-4 mr-2" /> Add schema</Button>
        </div>
      </div>

      {creating && (
        <div className="border rounded-lg p-4 space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs">Page URL (path)</Label>
              <Input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="/blog/my-post or * for sitewide" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Schema type</Label>
              <Select value={newType} onValueChange={(v) => setNewType(v as SchemaType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCHEMA_TEMPLATES.map((t) => <SelectItem key={t.type} value={t.type}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{getTemplate(newType)?.description}</p>
          <div className="flex gap-2">
            <Button onClick={create}><Save className="w-4 h-4 mr-2" /> Create</Button>
            <Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Page</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Enabled</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.page_url}</TableCell>
                <TableCell><Badge variant="outline">{r.schema_type}</Badge></TableCell>
                <TableCell>
                  <Switch checked={r.enabled} onCheckedChange={(v) => save(r, { enabled: v })} />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(r.updated_at).toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(r)}><FileJson className="w-4 h-4 mr-1" /> Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => del(r)}><Trash2 className="w-4 h-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No schemas yet — click “Add schema”.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Editor({ row, onBack, onSave, onDelete }: {
  row: Row;
  onBack: () => void;
  onSave: (row: Row, patch: Partial<Row>) => Promise<void>;
  onDelete: (row: Row) => Promise<void>;
}) {
  const [pageUrl, setPageUrl] = useState(row.page_url);
  const [json, setJson] = useState(JSON.stringify(row.schema_json, null, 2));
  const [note, setNote] = useState(row.note || "");
  const [parsed, setParsed] = useState<any>(row.schema_json);
  const [parseError, setParseError] = useState<string | null>(null);
  const validation = validateSchema(parsed);

  useEffect(() => {
    try { setParsed(JSON.parse(json)); setParseError(null); }
    catch (e: any) { setParseError(e.message); }
  }, [json]);

  const handleSave = async () => {
    if (parseError) { toast.error("Fix JSON parse error first"); return; }
    if (!validation.ok) { toast.error(validation.errors.join("; ")); return; }
    await onSave(row, { page_url: pageUrl, schema_json: parsed, note });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>← Back</Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onDelete(row)}><Trash2 className="w-4 h-4 mr-2" /> Delete</Button>
          <Button onClick={handleSave}><Save className="w-4 h-4 mr-2" /> Save</Button>
        </div>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 space-y-1.5">
          <Label className="text-xs">Page URL</Label>
          <Input value={pageUrl} onChange={(e) => setPageUrl(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Type</Label>
          <Input value={row.schema_type} readOnly />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Note (internal)</Label>
        <Input value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs">JSON-LD</Label>
          <Textarea value={json} onChange={(e) => setJson(e.target.value)} className="font-mono text-xs h-96" />
        </div>
        <div className="space-y-2">
          <div className="text-xs font-medium">Validation</div>
          {parseError ? (
            <div className="rounded border border-red-500/40 bg-red-500/10 text-red-700 text-xs p-3 flex gap-2"><X className="w-4 h-4 shrink-0" /> {parseError}</div>
          ) : validation.ok ? (
            <div className="rounded border border-green-500/40 bg-green-500/10 text-green-700 text-xs p-3 flex gap-2"><Check className="w-4 h-4 shrink-0" /> Valid JSON-LD</div>
          ) : (
            <div className="rounded border border-yellow-500/40 bg-yellow-500/10 text-yellow-800 text-xs p-3 space-y-1">
              {validation.errors.map((e, i) => <div key={i}>· {e}</div>)}
            </div>
          )}
          <div className="text-xs font-medium pt-2">Preview</div>
          <pre className="text-[11px] bg-muted/40 rounded p-3 overflow-auto max-h-72">{JSON.stringify(parsed, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}
