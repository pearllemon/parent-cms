import { useEffect, useState } from "react";
import { fetchPosts, type ParentPost } from "@/lib/parent";
import { useSiteConfig } from "@/providers/SiteProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Cloud, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const AdminSync = () => {
  const { config, refresh } = useSiteConfig();
  const [posts, setPosts] = useState<ParentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [type, setType] = useState<"all" | "post" | "page">("all");

  const load = async () => {
    setLoading(true);
    const data = await fetchPosts({
      page,
      limit: 30,
      type: type === "all" ? undefined : type,
    });
    setPosts(data?.posts || []);
    setTotal(data?.total || 0);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, type]);

  const fullRefresh = async () => {
    await refresh();
    await load();
    toast.success("Synced from parent");
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl">Parent sync</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Live view of posts &amp; pages served from the Pearl Lemon parent CMS.{" "}
            <strong>The parent is the single source of truth</strong> — content here is fetched on demand,
            never duplicated locally.
          </p>
        </div>
        <Button onClick={fullRefresh} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh from parent
        </Button>
      </header>

      <div className="grid sm:grid-cols-3 gap-3">
        <div className="bg-background border rounded-2xl p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Site ID</div>
          <div className="text-sm font-mono mt-1 truncate">{config?.site?.id || "—"}</div>
        </div>
        <div className="bg-background border rounded-2xl p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Posts in parent</div>
          <div className="text-2xl font-display mt-1">{config?.postsCount ?? total}</div>
        </div>
        <div className="bg-background border rounded-2xl p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Page views</div>
          <div className="text-2xl font-display mt-1">{config?.totalPageViews ?? "—"}</div>
        </div>
      </div>

      <div className="bg-background border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-3 p-4 border-b flex-wrap">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-primary" />
            <span className="font-medium">Live content</span>
          </div>
          <div className="flex gap-2 text-sm">
            {(["all", "post", "page"] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setType(t);
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-full border ${
                  type === t ? "bg-primary text-primary-foreground border-primary" : "border-border"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="p-3">Title</th>
              <th className="p-3">Slug</th>
              <th className="p-3">Type</th>
              <th className="p-3">Published</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  Loading from parent…
                </td>
              </tr>
            )}
            {!loading && posts.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  No posts in parent yet. Use{" "}
                  <Link to="/admin/import" className="text-primary underline">
                    Import
                  </Link>{" "}
                  to add some.
                </td>
              </tr>
            )}
            {posts.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3 font-medium">{p.title}</td>
                <td className="p-3 text-muted-foreground truncate max-w-[200px]">{p.slug}</td>
                <td className="p-3">
                  <Badge variant="outline">{p.type || "post"}</Badge>
                </td>
                <td className="p-3 text-muted-foreground">
                  {p.published_at || p.publish_date
                    ? new Date(p.published_at || p.publish_date!).toLocaleDateString()
                    : "—"}
                </td>
                <td className="p-3 text-right">
                  <Button asChild size="sm" variant="ghost">
                    <Link
                      to={p.type === "page" ? `/p/${p.slug}` : `/blog/${p.slug}`}
                      target="_blank"
                    >
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
            <span className="text-muted-foreground">
              Page {page} of {Math.ceil(total / 30)} · {total} total
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
                Prev
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= Math.ceil(total / 30)}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSync;
