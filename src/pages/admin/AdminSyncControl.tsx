// Sync Control Center — production-grade sync hardening UI for the child site.
// Tabs: Overview, Selective sync, Inbound queue, Event log, Conflicts.
import { useEffect, useState, useCallback } from "react";
import { supabase as cloud } from "@/integrations/supabase/client";
import {
  listSettings, updateSetting, listEvents, listQueue, decideQueue,
  applyQueueItem, listConflicts, resolveConflict, listHealth,
  pullParentPosts, runHeartbeat,
  type SyncSetting, type SyncEvent, type QueueItem, type ConflictRow, type HealthRow,
} from "@/lib/syncControl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Activity, CheckCircle2, XCircle, Inbox, GitMerge, AlertTriangle, Heart, Zap } from "lucide-react";
import { toast } from "sonner";

const statusColor: Record<string, string> = {
  healthy: "bg-green-500/15 text-green-700 dark:text-green-300",
  degraded: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  down: "bg-red-500/15 text-red-700 dark:text-red-300",
  unknown: "bg-muted text-muted-foreground",
};

const AdminSyncControl = () => {
  const [settings, setSettings] = useState<SyncSetting[]>([]);
  const [events, setEvents] = useState<SyncEvent[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [conflicts, setConflicts] = useState<ConflictRow[]>([]);
  const [health, setHealth] = useState<HealthRow[]>([]);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const [s, e, q, c, h] = await Promise.all([
      listSettings(), listEvents(100), listQueue(), listConflicts(), listHealth(),
    ]);
    setSettings(s); setEvents(e); setQueue(q); setConflicts(c); setHealth(h);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // Realtime: refresh whenever sync state changes
  useEffect(() => {
    const ch = cloud.channel("admin-sync-control-live");
    ["sync_events", "sync_queue", "sync_health", "sync_conflicts", "sync_settings"].forEach((t) => {
      (ch as any).on("postgres_changes", { event: "*", schema: "public", table: t }, () => void reload());
    });
    ch.subscribe();
    return () => { cloud.removeChannel(ch); };
  }, [reload]);

  const onToggle = async (s: SyncSetting, field: "enabled" | "auto_accept", v: boolean) => {
    await updateSetting(s.id, { [field]: v } as any);
    setSettings((arr) => arr.map((x) => x.id === s.id ? { ...x, [field]: v } : x));
  };

  const onDirection = async (s: SyncSetting, direction: SyncSetting["direction"]) => {
    await updateSetting(s.id, { direction });
    setSettings((arr) => arr.map((x) => x.id === s.id ? { ...x, direction } : x));
  };

  const onPull = async () => {
    setBusy(true);
    try {
      const r = await pullParentPosts();
      toast.success(`Pulled — ${r.queued} new/updated of ${r.checked} parent posts queued`);
      await reload();
    } catch (e: any) {
      toast.error(`Pull failed: ${e?.message || e}`);
    } finally { setBusy(false); }
  };

  const onHeartbeat = async () => {
    setBusy(true);
    const p = await runHeartbeat();
    toast.success(`Parent ${p.ok ? "reachable" : "unreachable"} — ${p.latencyMs}ms`);
    await reload();
    setBusy(false);
  };

  const onDecide = async (q: QueueItem, decision: "accepted" | "rejected") => {
    await decideQueue(q.id, decision);
    if (decision === "accepted") await applyQueueItem(q.id);
    toast.success(`${decision} — ${q.resource_type}`);
    await reload();
  };

  const onResolve = async (c: ConflictRow, r: ConflictRow["resolution"]) => {
    await resolveConflict(c.id, r);
    toast.success(`Resolved with ${r} version`);
    await reload();
  };

  const pendingCount = queue.filter((q) => q.status === "pending").length;
  const overallHealth = health.length
    ? (health.every((h) => h.status === "healthy") ? "healthy"
      : health.some((h) => h.status === "down") ? "down" : "degraded")
    : "unknown";

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display">Sync Control Center</h1>
          <p className="text-sm text-muted-foreground">
            Real-time parent ↔ child sync with selective controls, conflict resolution and full audit log.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onHeartbeat} disabled={busy}>
            <Heart className="w-4 h-4 mr-2" /> Heartbeat
          </Button>
          <Button size="sm" onClick={onPull} disabled={busy}>
            <RefreshCw className={`w-4 h-4 mr-2 ${busy ? "animate-spin" : ""}`} /> Pull from parent
          </Button>
        </div>
      </header>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Overall health</div>
          <div className="mt-2 flex items-center gap-2">
            <Badge className={statusColor[overallHealth]}>{overallHealth}</Badge>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Pending in queue</div>
          <div className="mt-2 text-2xl font-semibold">{pendingCount}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Open conflicts</div>
          <div className="mt-2 text-2xl font-semibold">{conflicts.filter((c) => c.resolution === "pending").length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Events (last 100)</div>
          <div className="mt-2 text-2xl font-semibold">{events.length}</div>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview"><Activity className="w-4 h-4 mr-1" /> Overview</TabsTrigger>
          <TabsTrigger value="settings"><Zap className="w-4 h-4 mr-1" /> Selective sync</TabsTrigger>
          <TabsTrigger value="queue"><Inbox className="w-4 h-4 mr-1" /> Queue {pendingCount > 0 && <span className="ml-1 text-xs bg-primary text-primary-foreground rounded px-1.5">{pendingCount}</span>}</TabsTrigger>
          <TabsTrigger value="events"><Activity className="w-4 h-4 mr-1" /> Events</TabsTrigger>
          <TabsTrigger value="conflicts"><GitMerge className="w-4 h-4 mr-1" /> Conflicts</TabsTrigger>
        </TabsList>

        {/* OVERVIEW (health per resource) */}
        <TabsContent value="overview">
          <Card className="p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase">
                <tr>
                  <th className="p-3">Resource</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Last success</th>
                  <th className="p-3">Last failure</th>
                  <th className="p-3">Consec. fails</th>
                  <th className="p-3">Avg latency</th>
                </tr>
              </thead>
              <tbody>
                {settings.map((s) => {
                  const h = health.find((x) => x.resource_type === s.resource_type);
                  return (
                    <tr key={s.resource_type} className="border-t">
                      <td className="p-3 font-medium">{s.resource_type}</td>
                      <td className="p-3"><Badge className={statusColor[h?.status || "unknown"]}>{h?.status || "unknown"}</Badge></td>
                      <td className="p-3 text-muted-foreground">{h?.last_success_at ? new Date(h.last_success_at).toLocaleString() : "—"}</td>
                      <td className="p-3 text-muted-foreground">{h?.last_failure_at ? new Date(h.last_failure_at).toLocaleString() : "—"}</td>
                      <td className="p-3">{h?.consecutive_failures ?? 0}</td>
                      <td className="p-3">{h?.avg_latency_ms ? `${h.avg_latency_ms} ms` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        {/* SELECTIVE SYNC */}
        <TabsContent value="settings">
          <Card className="p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase">
                <tr>
                  <th className="p-3">Resource</th>
                  <th className="p-3">Enabled</th>
                  <th className="p-3">Direction</th>
                  <th className="p-3">Auto-accept</th>
                </tr>
              </thead>
              <tbody>
                {settings.map((s) => (
                  <tr key={s.id} className="border-t">
                    <td className="p-3 font-medium">{s.resource_type}</td>
                    <td className="p-3">
                      <Switch checked={s.enabled} onCheckedChange={(v) => onToggle(s, "enabled", v)} />
                    </td>
                    <td className="p-3">
                      <Select value={s.direction} onValueChange={(v) => onDirection(s, v as SyncSetting["direction"])}>
                        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pull">Pull only</SelectItem>
                          <SelectItem value="push">Push only</SelectItem>
                          <SelectItem value="two-way">Two-way</SelectItem>
                          <SelectItem value="disabled">Disabled</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-3">
                      <Switch checked={s.auto_accept} onCheckedChange={(v) => onToggle(s, "auto_accept", v)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        {/* QUEUE */}
        <TabsContent value="queue">
          <Card className="p-0 overflow-hidden">
            {queue.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No incoming updates. Hit "Pull from parent" to fetch.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase">
                  <tr>
                    <th className="p-3">Resource</th>
                    <th className="p-3">ID</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Received</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((q) => (
                    <tr key={q.id} className="border-t">
                      <td className="p-3 font-medium">{q.resource_type}</td>
                      <td className="p-3 text-muted-foreground truncate max-w-xs">{q.resource_id}</td>
                      <td className="p-3"><Badge variant={q.status === "pending" ? "default" : "secondary"}>{q.status}</Badge></td>
                      <td className="p-3 text-muted-foreground">{new Date(q.created_at).toLocaleString()}</td>
                      <td className="p-3 text-right space-x-2">
                        {q.status === "pending" && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => onDecide(q, "rejected")}>
                              <XCircle className="w-3 h-3 mr-1" /> Reject
                            </Button>
                            <Button size="sm" onClick={() => onDecide(q, "accepted")}>
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Accept & apply
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </TabsContent>

        {/* EVENTS */}
        <TabsContent value="events">
          <Card className="p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase">
                <tr>
                  <th className="p-3">When</th>
                  <th className="p-3">Resource</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Direction</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Latency</th>
                  <th className="p-3">Error</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} className="border-t">
                    <td className="p-3 text-muted-foreground whitespace-nowrap">{new Date(e.created_at).toLocaleString()}</td>
                    <td className="p-3">{e.resource_type}</td>
                    <td className="p-3"><Badge variant="outline">{e.action}</Badge></td>
                    <td className="p-3">{e.direction}</td>
                    <td className="p-3">
                      <Badge className={e.status === "success" ? statusColor.healthy : statusColor.down}>{e.status}</Badge>
                    </td>
                    <td className="p-3">{e.latency_ms ? `${e.latency_ms} ms` : "—"}</td>
                    <td className="p-3 text-red-600 truncate max-w-xs">{e.error_message || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        {/* CONFLICTS */}
        <TabsContent value="conflicts">
          <Card className="p-0 overflow-hidden">
            {conflicts.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                No conflicts. Local and parent are in sync.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase">
                  <tr>
                    <th className="p-3">Resource</th>
                    <th className="p-3">ID</th>
                    <th className="p-3">Resolution</th>
                    <th className="p-3 text-right">Resolve as</th>
                  </tr>
                </thead>
                <tbody>
                  {conflicts.map((c) => (
                    <tr key={c.id} className="border-t">
                      <td className="p-3 font-medium">{c.resource_type}</td>
                      <td className="p-3 text-muted-foreground">{c.resource_id}</td>
                      <td className="p-3"><Badge>{c.resolution}</Badge></td>
                      <td className="p-3 text-right space-x-2">
                        {c.resolution === "pending" && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => onResolve(c, "local")}>Keep local</Button>
                            <Button size="sm" onClick={() => onResolve(c, "parent")}>Use parent</Button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSyncControl;
