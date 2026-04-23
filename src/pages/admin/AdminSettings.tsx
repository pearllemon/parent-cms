import { useEffect, useState } from "react";
import { supabase } from "@/lib/parent";
import { useSiteConfig } from "@/providers/SiteProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const AdminSettings = () => {
  const { config, refresh } = useSiteConfig();
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
