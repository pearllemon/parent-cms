// Activity Log admin page — who did what, when.
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, RefreshCw, Search } from "lucide-react";
import { listActivity, type ActivityRow } from "@/lib/activityLog";

const ACTION_TONE: Record<string, string> = {
  create: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  update: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  delete: "bg-red-500/15 text-red-700 dark:text-red-400",
  restore: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  publish: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  assign: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
};

export default function AdminActivityLog() {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [type, setType] = useState<string>("all");

  const reload = async () => {
    setLoading(true);
    setRows(await listActivity({ limit: 500 }));
    setLoading(false);
  };
  useEffect(() => { void reload(); }, []);

  const types = useMemo(
    () => Array.from(new Set(rows.map((r) => r.entity_type))).sort(),
    [rows],
  );
  const filtered = useMemo(() => rows.filter((r) => {
    if (type !== "all" && r.entity_type !== type) return false;
    if (!q) return true;
    const needle = q.toLowerCase();
    return (
      (r.actor_name || "").toLowerCase().includes(needle) ||
      (r.entity_label || "").toLowerCase().includes(needle) ||
      r.action.toLowerCase().includes(needle) ||
      r.entity_type.toLowerCase().includes(needle)
    );
  }), [rows, q, type]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-display flex items-center gap-2">
          <Activity className="w-7 h-7" /> Activity Log
        </h1>
        <p className="text-muted-foreground text-sm">Every create / update / delete / restore across the admin.</p>
      </header>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 opacity-50" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search actor, label, action…" className="pl-8 w-72" />
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All entity types</SelectItem>
            {types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button variant="outline" onClick={reload} disabled={loading}>
          <RefreshCw className="w-4 h-4 mr-1" /> Refresh
        </Button>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <p className="p-8 text-sm text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-sm text-muted-foreground text-center">No activity recorded yet.</p>
        ) : (
          <ul className="divide-y">
            {filtered.map((r) => (
              <li key={r.id} className="p-3 flex items-start gap-3 text-sm">
                <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wider ${ACTION_TONE[r.action] || "bg-muted text-foreground"}`}>
                  {r.action}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate">
                    <span className="font-medium">{r.actor_name || "Unknown"}</span>
                    {" "}
                    {r.action === "delete" ? "deleted" : r.action === "create" ? "created" : r.action === "restore" ? "restored" : r.action === "assign" ? "assigned" : r.action + "d"}
                    {" "}
                    <Badge variant="outline" className="ml-1">{r.entity_type}</Badge>
                    {r.entity_label && <span className="ml-2 text-muted-foreground truncate">— {r.entity_label}</span>}
                  </p>
                  {Object.keys(r.details || {}).length > 0 && (
                    <p className="text-[11px] text-muted-foreground truncate">
                      {Object.entries(r.details).slice(0, 4).map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`).join(" · ")}
                    </p>
                  )}
                </div>
                <time className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(r.created_at).toLocaleString()}
                </time>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
