import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSiteConfig } from "@/providers/SiteProvider";
import { supabase } from "@/lib/parent";
import { Button } from "@/components/ui/button";

const AdminDashboard = () => {
  const { config } = useSiteConfig();
  const [postCount, setPostCount] = useState<number | null>(null);
  const [leadCount, setLeadCount] = useState<number | null>(null);

  useEffect(() => {
    if (!config?.site?.id) return;
    supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("site_id", config.site.id)
      .then(({ count }) => setPostCount(count ?? 0));
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("source_site_id", config.site.id)
      .then(({ count }) => setLeadCount(count ?? 0));
  }, [config?.site?.id]);

  const Stat = ({ label, value }: { label: string; value: string | number | null }) => (
    <div className="bg-background border rounded-2xl p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-display text-3xl mt-1">{value ?? "—"}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl">Welcome back</h1>
        <p className="text-muted-foreground text-sm">
          {config?.site?.name?.toString()} • {config?.site?.domain?.toString()} •{" "}
          <span className="capitalize">{config?.site?.status?.toString()}</span>
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Page views" value={config?.totalPageViews ?? 0} />
        <Stat label="Posts" value={postCount} />
        <Stat label="Leads" value={leadCount} />
        <Stat label="Services" value={(config?.services as unknown[])?.length ?? 0} />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/admin/posts/new">New post</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/admin/posts">Manage posts</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/admin/settings">Site settings</Link>
        </Button>
      </div>

      <div className="bg-background border rounded-2xl p-6">
        <h2 className="font-display text-xl mb-2">How sync works</h2>
        <p className="text-sm text-muted-foreground">
          Header, footer, theme, popups, SEO, and dynamic sections all stream from the Pearl Lemon
          parent CMS. Edits there appear here instantly via Realtime. Anything you create in this
          admin (posts, media, leads) is stored against this site’s ID and visible across the
          parent dashboard.
        </p>
      </div>
    </div>
  );
};

export default AdminDashboard;
