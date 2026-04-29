import { useEffect, useState } from "react";
import { supabase } from "@/lib/parent";
import { useSiteConfig } from "@/providers/SiteProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { clearAllCache, getCacheStats, type CacheStats } from "@/lib/cache";
import { Trash2, RefreshCw } from "lucide-react";

const AdminSettings = () => {
  const { config, refresh } = useSiteConfig();
  const siteId = config?.site?.id;
  const [seo, setSeo] = useState({ meta_title: "", meta_description: "", canonical_url: "" });
  const [permalink, setPermalink] = useState("/%postname%/");
  const [cacheTtl, setCacheTtl] = useState(3600);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [clearing, setClearing] = useState(false);

  const loadStats = () => getCacheStats().then(setStats);
  useEffect(() => {
    loadStats();
  }, []);

  const handleClear = async () => {
    setClearing(true);
    try {
      await clearAllCache();
      await refresh(); // re-fetch parent config from network
      await loadStats();
      toast.success("Cache cleared. Fresh data loaded from parent.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to clear cache");
    } finally {
      setClearing(false);
    }
  };

  const siteId = config?.site?.id;
  const [seo, setSeo] = useState({ meta_title: "", meta_description: "", canonical_url: "" });
  const [permalink, setPermalink] = useState("/%postname%/");
  const [cacheTtl, setCacheTtl] = useState(3600);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!siteId) return;
    supabase
      .from("seo_configs")
      .select("meta_title,meta_description,canonical_url")
      .eq("site_id", siteId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setSeo(data);
      });
    supabase
      .from("permalink_settings")
      .select("pattern")
      .eq("site_id", siteId)
      .maybeSingle()
      .then(({ data }) => data?.pattern && setPermalink(data.pattern));
    supabase
      .from("site_cache_settings")
      .select("cache_ttl_seconds")
      .eq("site_id", siteId)
      .maybeSingle()
      .then(({ data }) => data?.cache_ttl_seconds && setCacheTtl(data.cache_ttl_seconds));
  }, [siteId]);

  const save = async () => {
    if (!siteId) return;
    setSaving(true);
    try {
      await supabase.from("seo_configs").upsert({ site_id: siteId, ...seo }, { onConflict: "site_id" });
      await supabase
        .from("permalink_settings")
        .upsert({ site_id: siteId, pattern: permalink }, { onConflict: "site_id" });
      await supabase
        .from("site_cache_settings")
        .upsert({ site_id: siteId, cache_ttl_seconds: cacheTtl }, { onConflict: "site_id" });
      toast.success("Settings saved");
      refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="font-display text-3xl">Settings</h1>

      <section className="bg-background border rounded-2xl p-5 space-y-3">
        <h2 className="font-display text-xl">SEO</h2>
        <Input
          placeholder="Meta title"
          value={seo.meta_title}
          onChange={(e) => setSeo({ ...seo, meta_title: e.target.value })}
        />
        <Textarea
          rows={3}
          placeholder="Meta description"
          value={seo.meta_description}
          onChange={(e) => setSeo({ ...seo, meta_description: e.target.value })}
        />
        <Input
          placeholder="Canonical URL"
          value={seo.canonical_url}
          onChange={(e) => setSeo({ ...seo, canonical_url: e.target.value })}
        />
      </section>

      <section className="bg-background border rounded-2xl p-5 space-y-3">
        <h2 className="font-display text-xl">Permalinks & cache</h2>
        <Input
          placeholder="/%postname%/"
          value={permalink}
          onChange={(e) => setPermalink(e.target.value)}
        />
        <Input
          type="number"
          min={60}
          placeholder="Cache TTL (seconds)"
          value={cacheTtl}
          onChange={(e) => setCacheTtl(Number(e.target.value))}
        />
      </section>

      <Button disabled={saving} onClick={save}>
        {saving ? "Saving…" : "Save settings"}
      </Button>

      <section className="bg-background border rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-display text-xl">Cache</h2>
            <p className="text-xs text-muted-foreground">
              Posts, taxonomies, parent config, and images are cached locally for speed.
              Clear if content looks stale.
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={loadStats}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="bg-muted/40 rounded-lg p-3">
            <div className="text-xs text-muted-foreground">JSON entries</div>
            <div className="font-display text-2xl">{stats?.jsonEntries ?? "—"}</div>
          </div>
          <div className="bg-muted/40 rounded-lg p-3">
            <div className="text-xs text-muted-foreground">JSON size</div>
            <div className="font-display text-2xl">
              {stats ? `${(stats.jsonBytes / 1024).toFixed(1)} KB` : "—"}
            </div>
          </div>
          <div className="bg-muted/40 rounded-lg p-3">
            <div className="text-xs text-muted-foreground">Cached images</div>
            <div className="font-display text-2xl">{stats?.imageEntries ?? "—"}</div>
          </div>
        </div>

        <Button variant="destructive" disabled={clearing} onClick={handleClear}>
          <Trash2 className="w-4 h-4 mr-1" />
          {clearing ? "Clearing…" : "Clear all cache"}
        </Button>
      </section>

      <section className="text-xs text-muted-foreground">
        Site ID: <code className="font-mono">{siteId}</code>
        <br />
        Status: <code>{config?.site?.status?.toString()}</code> • Domain:{" "}
        <code>{config?.site?.domain?.toString()}</code>
      </section>
    </div>
  );
};

export default AdminSettings;
