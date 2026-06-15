import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSiteConfig } from "@/providers/SiteProvider";
import { supabase as parent, fetchPosts } from "@/lib/parent";
import { supabase as cloud } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Activity } from "lucide-react";

const AdminDashboard = () => {
  const { config, refresh } = useSiteConfig();

  const [parentPostCount, setParentPostCount] = useState<number | null>(null);
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [cptCount, setCptCount] = useState<number | null>(null);
  const [leadCount, setLeadCount] = useState<number | null>(null);
  const [childViews24h, setChildViews24h] = useState<number | null>(null);
  const [childViewsTotal, setChildViewsTotal] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setBusy(true);
    const siteId = config?.site?.id;
    const tasks: Promise<unknown>[] = [];

    if (siteId) {
      tasks.push(Promise.resolve(parent.from("posts").select("id", { count: "exact", head: true }).eq("site_id", siteId)).then(({ count }: any) => setParentPostCount(count ?? 0)));
      tasks.push(Promise.resolve(parent.from("leads").select("id", { count: "exact", head: true }).eq("source_site_id", siteId)).then(({ count }: any) => setLeadCount(count ?? 0)));
    } else {
      setParentPostCount(0); setLeadCount(0);
    }

    tasks.push(Promise.resolve(cloud.from("imported_posts").select("id", { count: "exact", head: true })).then(({ count }: any) => setImportedCount(count ?? 0)));
    tasks.push(Promise.resolve(cloud.from("cpt_entries").select("id", { count: "exact", head: true })).then(({ count }: any) => setCptCount(count ?? 0)));

    tasks.push(Promise.resolve((cloud.from("page_view_events" as any) as any).select("id", { count: "exact", head: true })).then(({ count }: any) => setChildViewsTotal(count ?? 0)));
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    tasks.push(Promise.resolve((cloud.from("page_view_events" as any) as any).select("id", { count: "exact", head: true }).gte("created_at", since)).then(({ count }: any) => setChildViews24h(count ?? 0)));

    await Promise.allSettled(tasks);
    setBusy(false);
  };

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [config?.site?.id]);

  // Realtime — cloud tables only (parent is on a different project)
  useEffect(() => {
    const channel = cloud.channel("admin-dashboard-live");
    ["imported_posts", "cpt_entries", "page_view_events"].forEach((t) => {
      (channel as any).on("postgres_changes", { event: "*", schema: "public", table: t }, () => void load());
    });
    channel.subscribe();
    // Poll parent counts every 30s
    const id = setInterval(() => void load(), 30000);
    return () => { cloud.removeChannel(channel); clearInterval(id); };
    // eslint-disable-next-line
  }, [config?.site?.id]);

  // Refresh on tab focus
  useEffect(() => {
    const on = () => void load();
    window.addEventListener("focus", on);
    return () => window.removeEventListener("focus", on);
    // eslint-disable-next-line
  }, []);

  const totalPosts = (parentPostCount ?? 0) + (importedCount ?? 0);
  const servicesCount = (config?.services as unknown[] | undefined)?.length ?? 0;
  const parentPageViews = (config as any)?.totalPageViews ?? 0;

  const Stat = ({ label, value, sub }: { label: string; value: string | number | null; sub?: string }) => (
    <div className="bg-background border rounded-2xl p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-display text-3xl mt-1">{value ?? "—"}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl">Welcome back</h1>
          <p className="text-muted-foreground text-sm">
            {config?.site?.name?.toString()} • {config?.site?.domain?.toString()} •{" "}
            <span className="capitalize">{config?.site?.status?.toString()}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Activity className="w-3 h-3 text-green-500 animate-pulse" /> Live
          </span>
          <Button size="sm" variant="outline" onClick={() => { void refresh(); void load(); }} disabled={busy}>
            <RefreshCcw className={`w-4 h-4 mr-2 ${busy ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Page views (parent)" value={parentPageViews} sub="All-time across CMS" />
        <Stat label="Page views (this site)" value={childViewsTotal ?? 0} sub={`${childViews24h ?? 0} in last 24h`} />
        <Stat label="Posts" value={totalPosts} sub={`${parentPostCount ?? 0} CMS + ${importedCount ?? 0} imported`} />
        <Stat label="Leads" value={leadCount} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Services" value={servicesCount} />
        <Stat label="CPT entries" value={cptCount} />
        <Stat label="Site status" value={config?.site?.status?.toString() ?? "—"} />
        <Stat label="Domain" value={config?.site?.domain?.toString() ?? "—"} />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild><Link to="/admin/posts/new">New post</Link></Button>
        <Button asChild variant="outline"><Link to="/admin/posts">Manage posts</Link></Button>
        <Button asChild variant="outline"><Link to="/admin/seo-workspace">SEO Workspace</Link></Button>
        <Button asChild variant="outline"><Link to="/admin/sync-control">Sync Control</Link></Button>
        <Button asChild variant="outline"><Link to="/admin/settings">Site settings</Link></Button>
      </div>

      <div className="bg-background border rounded-2xl p-6">
        <h2 className="font-display text-xl mb-2">How sync works</h2>
        <p className="text-sm text-muted-foreground">
          Header, footer, theme, popups, SEO, and dynamic sections stream from the parent CMS in realtime.
          The dashboard polls parent counts every 30 seconds and subscribes live to local tables
          (imported posts, CPTs, page views) so numbers stay accurate automatically.
        </p>
      </div>
    </div>
  );
};

export default AdminDashboard;
// expose fetchPosts so accidental tree-shake won't drop it (used elsewhere)
void fetchPosts;
