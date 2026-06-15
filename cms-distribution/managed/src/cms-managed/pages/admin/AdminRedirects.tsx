// Admin Redirects Manager: full CRUD for 301/302 redirects with validation
// and a Test runner that calls the resolver against the live table.

import { useEffect, useState } from "react";
import { listRedirects, createRedirect, updateRedirect, deleteRedirect, resolveRedirect, type Redirect } from "@/lib/redirects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, RefreshCcw, ArrowRight, FlaskConical } from "lucide-react";
import { toast } from "sonner";

export default function AdminRedirects() {
  const [rows, setRows] = useState<Redirect[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<Partial<Redirect>>({ status_code: 301, match_type: "exact", enabled: true });
  const [testPath, setTestPath] = useState("");
  const [testResult, setTestResult] = useState<string>("");

  const reload = async () => {
    setLoading(true);
    try { setRows(await listRedirects()); }
    catch (e: any) { toast.error(e.message); }
    setLoading(false);
  };

  useEffect(() => { void reload(); }, []);

  const add = async () => {
    try {
      await createRedirect(draft);
      setDraft({ status_code: 301, match_type: "exact", enabled: true });
      toast.success("Redirect added");
      await reload();
    } catch (e: any) { toast.error(e.message); }
  };

  const save = async (r: Redirect, patch: Partial<Redirect>) => {
    try {
      await updateRedirect(r.id, patch);
      setRows((cur) => cur.map((x) => x.id === r.id ? { ...x, ...patch } : x));
    } catch (e: any) { toast.error(e.message); }
  };

  const remove = async (r: Redirect) => {
    if (!confirm(`Delete redirect ${r.from_path}?`)) return;
    try {
      await deleteRedirect(r.id);
      setRows((cur) => cur.filter((x) => x.id !== r.id));
    } catch (e: any) { toast.error(e.message); }
  };

  const runTest = async () => {
    if (!testPath) { setTestResult(""); return; }
    const r = await resolveRedirect(testPath);
    setTestResult(r ? `→ ${r.status_code} ${r.to_url} (${r.match_type})` : "No matching redirect — would 200/serve normally.");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-display">Redirects</h2>
          <p className="text-sm text-muted-foreground">Manage 301/302/307/308 redirects. Applied site-wide on every navigation.</p>
        </div>
        <Button variant="outline" onClick={reload} disabled={loading}>
          <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Reload
        </Button>
      </div>

      <div className="border rounded-lg p-4 space-y-3">
        <p className="text-sm font-medium">Add new redirect</p>
        <div className="grid md:grid-cols-12 gap-2">
          <div className="md:col-span-4">
            <Label className="text-xs">From path</Label>
            <Input placeholder="/old-page" value={draft.from_path || ""} onChange={(e) => setDraft({ ...draft, from_path: e.target.value })} />
          </div>
          <div className="md:col-span-4">
            <Label className="text-xs">To URL</Label>
            <Input placeholder="/new-page or https://…" value={draft.to_url || ""} onChange={(e) => setDraft({ ...draft, to_url: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">Status</Label>
            <Select value={String(draft.status_code || 301)} onValueChange={(v) => setDraft({ ...draft, status_code: Number(v) as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[301, 302, 307, 308].map((s) => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">Match</Label>
            <Select value={draft.match_type || "exact"} onValueChange={(v) => setDraft({ ...draft, match_type: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="exact">Exact</SelectItem>
                <SelectItem value="prefix">Prefix</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={add}><Plus className="w-4 h-4 mr-2" /> Add redirect</Button>
        </div>
      </div>

      <div className="border rounded-lg p-4 space-y-2">
        <p className="text-sm font-medium flex items-center gap-2"><FlaskConical className="w-4 h-4" /> Test a path</p>
        <div className="flex gap-2">
          <Input placeholder="/some/path" value={testPath} onChange={(e) => setTestPath(e.target.value)} />
          <Button variant="outline" onClick={runTest}>Test</Button>
        </div>
        {testResult && <p className="text-sm text-muted-foreground">{testResult}</p>}
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>From</TableHead>
              <TableHead></TableHead>
              <TableHead>To</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Match</TableHead>
              <TableHead>Enabled</TableHead>
              <TableHead className="text-center">Hits</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No redirects yet.</TableCell></TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.from_path}</TableCell>
                <TableCell><ArrowRight className="w-4 h-4 text-muted-foreground" /></TableCell>
                <TableCell className="font-mono text-xs truncate max-w-xs">{r.to_url}</TableCell>
                <TableCell>
                  <Select value={String(r.status_code)} onValueChange={(v) => save(r, { status_code: Number(v) as any })}>
                    <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[301, 302, 307, 308].map((s) => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell><Badge variant="outline">{r.match_type}</Badge></TableCell>
                <TableCell><Switch checked={r.enabled} onCheckedChange={(v) => save(r, { enabled: v })} /></TableCell>
                <TableCell className="text-center text-xs">{r.hits}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => remove(r)}><Trash2 className="w-4 h-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
