import { useEffect, useMemo, useState } from "react";
import { listInstallations, forceUpgrade, getLatestRelease, type ChildInstallation, type Release } from "@/lib/distribution";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Server, RefreshCcw, Zap } from "lucide-react";
import { toast } from "sonner";

const STATE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  up_to_date: "default",
  pending: "secondary",
  upgrading: "secondary",
  failed: "destructive",
  rolled_back: "outline",
  awaiting_release: "outline",
  unknown: "outline",
};

type Filter = "all" | "up_to_date" | "drift" | "failed" | "awaiting";



export default function AdminInstallations() {
  const [items, setItems] = useState<ChildInstallation[]>([]);
  const [latest, setLatest] = useState<Release | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  const load = async () => {
    setLoading(true);
    const [a, b] = await Promise.all([listInstallations(), getLatestRelease()]);
    setItems(a); setLatest(b); setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const stats = useMemo(() => {
    let upToDate = 0, drift = 0, failed = 0, awaiting = 0;
    for (const i of items) {
      if (i.upgrade_state === "failed") failed++;
      else if ((i.upgrade_state as string) === "awaiting_release" || (!i.current_version && latest)) awaiting++;
      else if (latest && i.current_version && i.current_version !== latest.version) drift++;
      else if (latest && i.current_version === latest.version) upToDate++;
    }
    return { upToDate, drift, failed, awaiting };
  }, [items, latest]);

  const filtered = useMemo(() => items.filter((i) => {
    if (filter === "all") return true;
    if (filter === "failed") return (i.upgrade_state as string) === "failed";
    if (filter === "awaiting") return (i.upgrade_state as string) === "awaiting_release" || (!i.current_version && !!latest);
    if (filter === "up_to_date") return !!latest && i.current_version === latest.version;
    if (filter === "drift") return !!latest && !!i.current_version && i.current_version !== latest.version;
    return true;
  }), [items, filter, latest]);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl flex items-center gap-2"><Server className="w-7 h-7" /> Installations</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Every child site that has reported in. Latest engine version: <strong>{latest ? `v${latest.version}` : "—"}</strong>
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {([
          ["all",        "Total",        items.length],
          ["up_to_date", "Up to date",   stats.upToDate],
          ["drift",      "Drift",        stats.drift],
          ["awaiting",   "Awaiting first release", stats.awaiting],
        ] as Array<[Filter, string, number]>).map(([f, label, n]) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`p-3 border rounded-xl text-left transition ${filter === f ? "border-primary bg-primary/5" : "bg-background hover:bg-muted/30"}`}>
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="font-display text-2xl">{n}</div>
          </button>
        ))}
      </div>

      <div className="bg-background border rounded-2xl divide-y">
        {loading && <div className="p-6 text-sm text-muted-foreground">Loading…</div>}
        {!loading && filtered.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {items.length === 0
              ? "No child sites have checked in yet. Once a child runs the bootstrap loader, it will appear here."
              : "No installations match this filter."}
          </div>
        )}

        {filtered.map((i) => {
          const stale = latest && i.current_version && i.current_version !== latest.version;
          return (
            <div key={i.id} className="p-4 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-display text-lg">{i.site_name || i.site_id}</span>
                  <Badge variant={STATE_VARIANT[i.upgrade_state] || "outline"}>{i.upgrade_state}</Badge>
                  {stale && <Badge variant="secondary">Update available</Badge>}
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex gap-3 flex-wrap">
                  <span>Version: <strong>{i.current_version || "—"}</strong></span>
                  <span>Shim: {i.child_shim_version || "—"}</span>
                  {i.site_url && <a href={i.site_url} target="_blank" rel="noreferrer" className="underline truncate">{i.site_url}</a>}
                  <span>Last seen: {i.last_seen_at ? new Date(i.last_seen_at).toLocaleString() : "never"}</span>
                </div>
                {i.last_error && <p className="text-xs text-destructive mt-1">{i.last_error}</p>}
              </div>
              <div className="shrink-0">
                {latest && stale && (
                  <Button size="sm" onClick={async () => {
                    await forceUpgrade(i.site_id, latest.version);
                    toast.success(`Queued upgrade to v${latest.version}`);
                    void load();
                  }}>
                    <Zap className="w-3.5 h-3.5 mr-1" /> Force upgrade
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
