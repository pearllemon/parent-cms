import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/parent";
import { useSiteConfig } from "@/providers/SiteProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Post = {
  id: string;
  title: string;
  slug: string;
  status: string;
  publish_date: string | null;
  updated_at: string;
};

const AdminPosts = () => {
  const { config } = useSiteConfig();
  const [posts, setPosts] = useState<Post[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!config?.site?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("posts")
      .select("id,title,slug,status,publish_date,updated_at")
      .eq("site_id", config.site.id)
      .order("updated_at", { ascending: false })
      .limit(200);
    if (error) toast.error(error.message);
    setPosts((data as Post[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [config?.site?.id]);

  const filtered = posts.filter((p) => p.title?.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="font-display text-3xl">Posts</h1>
        <Button asChild>
          <Link to="/admin/posts/new">New post</Link>
        </Button>
      </header>

      <Input placeholder="Search posts…" value={q} onChange={(e) => setQ(e.target.value)} />

      <div className="bg-background border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">Title</th>
              <th className="p-3">Slug</th>
              <th className="p-3">Status</th>
              <th className="p-3">Updated</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  No posts yet.
                </td>
              </tr>
            )}
            {filtered.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3 font-medium">{p.title || "(untitled)"}</td>
                <td className="p-3 text-muted-foreground">{p.slug}</td>
                <td className="p-3">
                  <Badge variant={p.status === "published" ? "default" : "outline"}>{p.status}</Badge>
                </td>
                <td className="p-3 text-muted-foreground">
                  {new Date(p.updated_at).toLocaleDateString()}
                </td>
                <td className="p-3 text-right">
                  <Button asChild size="sm" variant="outline">
                    <Link to={`/admin/posts/${p.id}`}>Edit</Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminPosts;
