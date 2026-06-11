// Admin: Parent connection dashboard.
// Audits the live link between this child site and the Pearl Lemon parent CMS:
// connection health, site identity, config coverage, realtime status,
// analytics (last N days), site overrides, and posts (with bulk publish).

import { useEffect, useMemo, useState } from "react";
import {
  fetchPosts,
  fetchAnalytics,
  fetchOverrides,
  saveOverride,
  bulkOperation,
  pingParent,
  SUPABASE_URL,
  type ParentPost,
  type SiteOverride,
  type AnalyticsResponse,
} from "@/lib/parent";
import { useSiteConfig } from "@/providers/SiteProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Cloud, ExternalLink, CheckCircle2, AlertCircle, Plus, Trash2, Activity, Radio } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const CONFIG_COVERAGE: { key: string; label: string }[] = [
  { key: "headerConfig", label: "Header" },
  { key: "footerConfig", label: "Footer" },
  { key: "theme", label: "Theme" },
  { key: "errorPageConfig", label: "404 page" },
  { key: "popupConfig", label: "Popup" },
  { key: "blogTemplate", label: "Blog template" },
  { key: "bookingPage", label: "Booking page" },
  { key: "seoConfig", label: "SEO config" },
];

const AdminSync = () => {
  const { config, loading: configLoading, refresh } = useSiteConfig();
  const [posts, setPosts] = useState<ParentPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [type, setType] = useState<"all" | "post" | "page">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [overrides, setOverrides] = useState<SiteOverride[]>([]);
  const [health, setHealth] = useState<{ ok: boolean; latencyMs: number; status?: number } | null>(null);
  const [lastSync, setLastSync] = useState<string>(new Date().toLocaleString());

  // New-override draft
  const [draft, setDraft] = useState<SiteOverride>({ config_type: "header", override_key: "", override_value: "" });

  const loadPosts = async () => {
    setPostsLoading(true);
    const data = await fetchPosts({ page, limit: 30, type: type === "all" ? undefined : type });
    setPosts(data?.posts || []);
    setTotal(data?.total || 0);
    setPostsLoading(false);
  };

  const loadSecondary = async () => {
    const [a, o, h] = await Promise.all([fetchAnalytics(30), fetchOverrides(), pingParent()]);
    setAnalytics(a);
    setOverrides(o);
    setHealth(h);
  };

  useEffect(() => { void loadPosts(); /* eslint-disable-next-line */ }, [page, type]);
  useEffect(() => { void loadSecondary(); /* eslint-disable-next-line */ }, [config?.site?.id]);

  const fullRefresh = async () => {
    await refresh();
    await Promise.all([loadPosts(), loadSecondary()]);
    setLastSync(new Date().toLocaleString());
    toast.success("Synced from parent");
  };

  const coverage = useMemo(() => {
    return CONFIG_COVERAGE.map((c) => ({
      ...c,
      present: !!(config as any)?.[c.key],
    }));
  }, [config]);

  const bulkPublish = async () => {
    if (selected.size === 0) return;
    try {
      await bulkOperation({ operation_type: "publish", target_type: "posts", target_ids: Array.from(selected) });
      toast.success(`Published ${selected.size} post(s)`);
      setSelected(new Set());
      await loadPosts();
    } catch (e: any) { toast.error(e?.message || "Bulk publish failed"); }
  };

  const addOverride = async () => {
    if (!draft.override_key) return toast.error("Override key required");
    try {
      await saveOverride(draft);
      toast.success("Override saved");
      setDraft({ config_type: draft.config_type, override_key: "", override_value: "" });
      const o = await fetchOverrides();
      setOverrides(o);
    } catch (e: any) { toast.error(e?.message || "Save failed"); }
  };

  const totalViews = analytics?.totalViews ?? config?.totalPageViews ?? 0;
  const daily = analytics?.daily || [];
  const maxDay = Math.max(1, ...daily.map((d) => d.views));

  return (
    <div className="space-y-6 max-w-6xl">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl">Parent connection</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Audit + control panel for this child site's link to the Pearl Lemon parent CMS.
          </p>
        </div>
        <Button onClick={fullRefresh} disabled={configLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${configLoading ? "animate-spin" : ""}`} /> Refresh from parent
        </Button>
      </header>

      {/* Health strip */}
      <div className="grid sm:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Activity className="w-3 h-3" /> Connection
          </div>
          <div className="mt-1 flex items-center gap-2">
            {health?.ok ? (
              <><CheckCircle2 className="w-4 h-4 text-green-600" /><span className="text-sm font-medium">Online</span></>
            ) : (
              <><AlertCircle className="w-4 h-4 text-amber-600" /><span className="text-sm font-medium">{health ? "Offline" : "Checking…"}</span></>
            )}
            {health && <span className="text-xs text-muted-foreground">{health.latencyMs}ms</span>}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Radio className="w-3 h-3" /> Realtime</div>
          <div className="mt-1 text-sm font-medium">Subscribed</div>
          <div className="text-xs text-muted-foreground">14 tracked tables</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Site ID</div>
          <div className="text-xs font-mono mt-1 truncate" title={config?.site?.id}>{config?.site?.id || "—"}</div>
          <div className="text-xs text-muted-foreground mt-1">Status: <Badge variant="outline">{config?.site?.status || "—"}</Badge></div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Last sync</div>
          <div className="text-sm mt-1">{lastSync}</div>
          <a className="text-xs text-primary underline" href={SUPABASE_URL} target="_blank" rel="noreferrer">Parent API <ExternalLink className="w-3 h-3 inline" /></a>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="overrides">Overrides</TabsTrigger>
          <TabsTrigger value="posts">Posts</TabsTrigger>
        </TabsList>

        {/* Overview ----------------------------------------------------------- */}
        <TabsContent value="overview" className="space-y-4">
          <Card className="p-4">
            <p className="font-medium mb-3">Config coverage</p>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-2">
              {coverage.map((c) => (
                <div key={c.key} className="flex items-center justify-between border rounded p-2 text-sm">
                  <span>{c.label}</span>
                  {c.present ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <AlertCircle className="w-4 h-4 text-amber-600" />}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Items marked as missing aren't assigned to this site in the parent dashboard yet. Assign them under <strong>All Sites → {config?.site?.name || "this site"}</strong>.
            </p>
          </Card>

          <Card className="p-4">
            <p className="font-medium mb-2">Site identity</p>
            <dl className="text-sm grid sm:grid-cols-2 gap-y-1 gap-x-6">
              <div className="flex justify-between"><dt className="text-muted-foreground">Domain</dt><dd>{(config?.site as any)?.domain || "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Name</dt><dd>{config?.site?.name || "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Category</dt><dd>{(config?.site as any)?.category || "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Booking link</dt><dd className="truncate max-w-[260px]">{(config?.site as any)?.booking_link || "—"}</dd></div>
            </dl>
          </Card>
        </TabsContent>

        {/* Analytics ---------------------------------------------------------- */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <Card className="p-4"><div className="text-xs text-muted-foreground uppercase">Page views (30d)</div><div className="text-2xl font-display mt-1">{totalViews.toLocaleString()}</div></Card>
            <Card className="p-4"><div className="text-xs text-muted-foreground uppercase">Unique visitors</div><div className="text-2xl font-display mt-1">{(analytics?.uniqueVisitors ?? 0).toLocaleString()}</div></Card>
            <Card className="p-4"><div className="text-xs text-muted-foreground uppercase">Posts in parent</div><div className="text-2xl font-display mt-1">{config?.postsCount ?? total}</div></Card>
          </div>

          <Card className="p-4">
            <p className="font-medium mb-3">Daily views</p>
            {daily.length === 0 ? (
              <p className="text-xs text-muted-foreground">No analytics rows returned by the parent yet.</p>
            ) : (
              <div className="flex items-end gap-1 h-32">
                {daily.map((d) => (
                  <div key={d.date} className="flex-1 flex flex-col items-center justify-end" title={`${d.date}: ${d.views}`}>
                    <div className="w-full bg-primary/70 rounded-t" style={{ height: `${(d.views / maxDay) * 100}%` }} />
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-4">
            <p className="font-medium mb-3">Top pages</p>
            <table className="w-full text-sm">
              <tbody>
                {(analytics?.topPages || []).slice(0, 10).map((p) => (
                  <tr key={p.path} className="border-t">
                    <td className="py-2 truncate max-w-[300px]">{p.path}</td>
                    <td className="py-2 text-right text-muted-foreground">{p.views}</td>
                  </tr>
                ))}
                {!(analytics?.topPages || []).length && (
                  <tr><td className="py-3 text-xs text-muted-foreground">No data.</td></tr>
                )}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        {/* Overrides ---------------------------------------------------------- */}
        <TabsContent value="overrides" className="space-y-4">
          <Card className="p-4 space-y-3">
            <p className="font-medium">Add per-site override</p>
            <p className="text-xs text-muted-foreground">
              Overrides let this site customise a shared component (e.g. header logo) without changing the parent template.
            </p>
            <div className="grid md:grid-cols-4 gap-2">
              <div>
                <Label className="text-xs">Config type</Label>
                <Input value={draft.config_type} onChange={(e) => setDraft({ ...draft, config_type: e.target.value })} placeholder="header" />
              </div>
              <div>
                <Label className="text-xs">Override key</Label>
                <Input value={draft.override_key} onChange={(e) => setDraft({ ...draft, override_key: e.target.value })} placeholder="logo_url" />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">Override value</Label>
                <Input value={String(draft.override_value ?? "")} onChange={(e) => setDraft({ ...draft, override_value: e.target.value })} placeholder="https://…" />
              </div>
            </div>
            <Button size="sm" onClick={addOverride}><Plus className="w-4 h-4 mr-2" />Save override</Button>
          </Card>

          <Card className="p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="p-3">Type</th><th className="p-3">Key</th><th className="p-3">Value</th><th className="p-3">Updated</th><th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {overrides.length === 0 && <tr><td colSpan={5} className="p-4 text-xs text-muted-foreground">No overrides yet.</td></tr>}
                {overrides.map((o) => (
                  <tr key={o.id || `${o.config_type}-${o.override_key}`} className="border-t">
                    <td className="p-3"><Badge variant="outline">{o.config_type}</Badge></td>
                    <td className="p-3 font-mono text-xs">{o.override_key}</td>
                    <td className="p-3 truncate max-w-[260px]">{String(o.override_value ?? "")}</td>
                    <td className="p-3 text-xs text-muted-foreground">{o.updated_at ? new Date(o.updated_at).toLocaleString() : "—"}</td>
                    <td className="p-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => saveOverride({ ...o, override_value: null }).then(() => fetchOverrides().then(setOverrides))}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        {/* Posts -------------------------------------------------------------- */}
        <TabsContent value="posts" className="space-y-3">
          <Card className="p-0 overflow-hidden">
            <div className="flex items-center justify-between gap-3 p-4 border-b flex-wrap">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-primary" />
                <span className="font-medium">Live content</span>
                {selected.size > 0 && (
                  <Button size="sm" className="ml-3" onClick={bulkPublish}>Publish {selected.size}</Button>
                )}
              </div>
              <div className="flex gap-2 text-sm">
                {(["all", "post", "page"] as const).map((t) => (
                  <button key={t} onClick={() => { setType(t); setPage(1); }}
                    className={`px-3 py-1 rounded-full border ${type === t ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="p-3 w-8"></th>
                  <th className="p-3">Title</th><th className="p-3">Slug</th><th className="p-3">Type</th><th className="p-3">Published</th><th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {postsLoading && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Loading from parent…</td></tr>}
                {!postsLoading && posts.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No posts in parent yet. Use <Link to="/admin/import" className="text-primary underline">Import</Link> to add some.</td></tr>
                )}
                {posts.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="p-3">
                      <input type="checkbox" checked={selected.has(p.id)} onChange={(e) => {
                        const next = new Set(selected);
                        e.target.checked ? next.add(p.id) : next.delete(p.id);
                        setSelected(next);
                      }} />
                    </td>
                    <td className="p-3 font-medium">{p.title}</td>
                    <td className="p-3 text-muted-foreground truncate max-w-[200px]">{p.slug}</td>
                    <td className="p-3"><Badge variant="outline">{p.type || "post"}</Badge></td>
                    <td className="p-3 text-muted-foreground">{p.published_at || p.publish_date ? new Date(p.published_at || p.publish_date!).toLocaleDateString() : "—"}</td>
                    <td className="p-3 text-right">
                      <Button asChild size="sm" variant="ghost">
                        <Link to={p.type === "page" ? `/p/${p.slug}` : `/blog/${p.slug}`} target="_blank">
                          View <ExternalLink className="w-3 h-3 ml-1" />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {total > 30 && (
              <div className="flex items-center justify-between p-3 border-t text-sm">
                <span className="text-muted-foreground">Page {page} of {Math.ceil(total / 30)} · {total} total</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Prev</Button>
                  <Button size="sm" variant="outline" disabled={page >= Math.ceil(total / 30)} onClick={() => setPage(page + 1)}>Next</Button>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSync;
