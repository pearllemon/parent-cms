// Runs on the child site: listens for cloud_components updates and re-installs
// any component that the site has marked `auto_sync = true`.

import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteConfig } from "@/providers/SiteProvider";
import { installComponent, listInstalls, type CloudComponent } from "@/lib/componentCloud";

export default function ComponentCloudSync() {
  const { config } = useSiteConfig();
  const siteId = config?.site?.id;

  useEffect(() => {
    if (!siteId) return;
    let cancelled = false;

    const reconcile = async () => {
      try {
        const installs = await listInstalls(siteId);
        const autoOn = installs.filter((i) => i.auto_sync);
        if (!autoOn.length) return;
        // Pull latest published versions for installed slugs in one shot.
        const slugs = autoOn.map((i) => i.slug);
        const { data } = await supabase
          .from("cloud_components")
          .select("*")
          .eq("recalled", false)
          .in("slug", slugs);
        if (cancelled || !data) return;
        // Pick latest per (kind, slug).
        const latestByKey = new Map<string, CloudComponent>();
        for (const row of data as CloudComponent[]) {
          const k = `${row.kind}:${row.slug}`;
          const cur = latestByKey.get(k);
          if (!cur || row.version > cur.version) latestByKey.set(k, row);
        }
        for (const inst of autoOn) {
          const latest = latestByKey.get(`${inst.kind}:${inst.slug}`);
          if (latest && latest.version > inst.installed_version) {
            await installComponent(latest, siteId);
          }
        }
      } catch { /* best effort */ }
    };

    void reconcile();

    const ch = supabase
      .channel(`cloud-sync-${siteId}`)
      .on(
        "postgres_changes" as never,
        { event: "*", schema: "public", table: "cloud_components" },
        () => void reconcile(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(ch);
    };
  }, [siteId]);

  return null;
}
