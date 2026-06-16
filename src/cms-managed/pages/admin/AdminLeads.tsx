// Leads CRM — list, filter, edit notes/status, export.
// Backed by `public.leads`. Anon inserts come from the public Contact form.

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Search, Trash2, Download, Mail, Phone } from "lucide-react";

type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  source: string;
  source_url: string | null;
  status: string;
  tags: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const STATUSES = ["new", "contacted", "qualified", "won", "lost"] as const;
const STATUS_COLOR: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-amber-100 text-amber-800",
  qualified: "bg-violet-100 text-violet-800",
  won: "bg-emerald-100 text-emerald-800",
  lost: "bg-rose-100 text-rose-800",
};

export default function AdminLeads() {
  const [rows, setRows] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [editing, setEditing] = useState<Partial<Lead> | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) toast.error(error.message);
    setRows((data as Lead[]) || []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  // Realtime — new submissions show up instantly
  useEffect(() => {
    const ch = supabase.channel("admin-leads")
      .on("postgres_changes" as never, { event: "*", schema: "public", table: "leads" }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, []);

  const filtered = useMemo(() => rows.filter((r) =>
    (status === "all" || r.status === status) &&
    (!q || `${r.name} ${r.email} ${r.phone || ""} ${r.message || ""}`.toLowerCase().includes(q.toLowerCase()))
  ), [rows, q, status]);

  const save = async () => {
    if (!editing) return;
    const payload = {
      name: editing.name?.trim(),
      email: editing.email?.trim(),
      phone: editing.phone || null,
      message: editing.message || null,
      status: editing.status || "new",
      notes: editing.notes || null,
      tags: editing.tags || [],
      source: editing.source || "manual",
    };
    if (!payload.name || !payload.email) { toast.error("Name and email are required"); return; }
    const res = editing.id
      ? await supabase.from("leads").update(payload).eq("id", editing.id)
      : await supabase.from("leads").insert(payload);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success("Saved");
    setEditing(null);
    void load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this lead?")) return;
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    void load();
  };

  const exportCsv = () => {
    const head = ["created_at","name","email","phone","status","source","message","notes","tags"];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [head.join(",")].concat(
      filtered.map((r) => head.map((k) => esc(k === "tags" ? (r.tags || []).join("|") : (r as Record<string, unknown>)[k])).join(","))
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `leads-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-3xl">Leads</h1>
          <p className="text-sm text-muted-foreground">Contact-form submissions and manually-added leads.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv}><Download className="w-4 h-4 mr-1" /> Export CSV</Button>
          <Button onClick={() => setEditing({ status: "new", source: "manual", tags: [] })}><Plus className="w-4 h-4 mr-1" /> New lead</Button>
        </div>
      </div>

      <Card className="p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search name, email, message…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="text-xs text-muted-foreground">{filtered.length} / {rows.length}</div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left p-3">Received</th>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Contact</th>
                <th className="text-left p-3">Message</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Source</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No leads yet. Contact-form submissions will appear here.</td></tr>
              ) : filtered.map((r) => (
                <tr key={r.id} className="border-t hover:bg-muted/20 cursor-pointer" onClick={() => setEditing(r)}>
                  <td className="p-3 whitespace-nowrap text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-3 font-medium">{r.name}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1 text-xs"><Mail className="w-3 h-3" />{r.email}</div>
                    {r.phone && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="w-3 h-3" />{r.phone}</div>}
                  </td>
                  <td className="p-3 max-w-[280px] truncate text-muted-foreground">{r.message}</td>
                  <td className="p-3"><Badge className={STATUS_COLOR[r.status] || ""} variant="secondary">{r.status}</Badge></td>
                  <td className="p-3 text-xs text-muted-foreground">{r.source}</td>
                  <td className="p-3 text-right">
                    <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); void remove(r.id); }}><Trash2 className="w-4 h-4" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit lead" : "New lead"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Name</Label><Input value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
                <div><Label className="text-xs">Email</Label><Input type="email" value={editing.email || ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></div>
                <div><Label className="text-xs">Phone</Label><Input value={editing.phone || ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></div>
                <div><Label className="text-xs">Status</Label>
                  <Select value={editing.status || "new"} onValueChange={(v) => setEditing({ ...editing, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label className="text-xs">Message</Label><Textarea rows={3} value={editing.message || ""} onChange={(e) => setEditing({ ...editing, message: e.target.value })} /></div>
              <div><Label className="text-xs">Internal notes</Label><Textarea rows={3} value={editing.notes || ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></div>
              <div><Label className="text-xs">Tags (comma-separated)</Label><Input value={(editing.tags || []).join(", ")} onChange={(e) => setEditing({ ...editing, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
