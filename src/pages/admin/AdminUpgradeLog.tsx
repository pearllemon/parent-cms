import { useEffect, useState } from "react";
import { listUpgradeLog, type UpgradeLog } from "@/lib/distribution";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { History, RefreshCcw } from "lucide-react";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  success: "default", started: "secondary", failed: "destructive", rolled_back: "outline",
};

export default function AdminUpgradeLog() {
  const [items, setItems] = useState<UpgradeLog[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setItems(await listUpgradeLog(filter || undefined));
    setLoading(false);
  };

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, []);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl flex items-center gap-2"><History className="w-7 h-7" /> Upgrade log</h1>
          <p className="text-muted-foreground text-sm mt-1">Per-child upgrade history with snapshots.</p>
        </div>
        <div className="flex items-center gap-2">
          <Input placeholder="Filter by site_id…" value={filter} onChange={(e) => setFilter(e.target.value)} className="w-56" />
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </header>

      <div className="bg-background border rounded-2xl divide-y">
        {loading && <div className="p-6 text-sm text-muted-foreground">Loading…</div>}
        {!loading && items.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">No upgrade events yet.</div>
        )}
        {items.map((l) => (
          <div key={l.id} className="p-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={STATUS_VARIANT[l.status] || "outline"}>{l.status}</Badge>
              <span className="font-mono text-xs">{l.site_id}</span>
              <span className="text-sm">
                {l.from_version || "—"} → <strong>v{l.to_version}</strong>
              </span>
              <span className="text-xs text-muted-foreground ml-auto">
                {new Date(l.created_at).toLocaleString()}
                {l.duration_ms != null && ` · ${l.duration_ms}ms`}
              </span>
            </div>
            {l.error && <p className="text-xs text-destructive mt-2">{l.error}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
