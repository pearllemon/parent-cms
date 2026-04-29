import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/parent";
import { useSiteConfig } from "@/providers/SiteProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, Pencil } from "lucide-react";
import { toast } from "sonner";

type Post = {
  id: string;
  title: string;
  slug: string;
  status: string;
  type: string | null;
  publish_date: string | null;
  updated_at: string;
};

const STATUSES = ["all", "published", "draft", "scheduled", "pending", "private", "trash"];

const titleCase = (s: string) =>
  s
    .split(/[_-]/)
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");

const AdminPosts = () => {
  const { config } = useSiteConfig();
  const [searchParams, setSearchParams] = useSearchParams();
  const typeFilter = searchParams.get("type") || "post";

  const [posts, setPosts] = useState<Post[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!config?.site?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("posts")
      .select("id,title,slug,status,type,publish_date,updated_at")
      .eq("site_id", config.site.id)
      .order("updated_at", { ascending: false })
      .limit(500);
    if (error) toast.error(error.message);
    setPosts((data as Post[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [config?.site?.id]);

  const filtered = useMemo(() => {
    return posts.filter((p) => {
      const matchesType =
        typeFilter === "all" ? true : (p.type || "post") === typeFilter;
      const matchesStatus = status === "all" ? true : p.status === status;
      const matchesQ = p.title?.toLowerCase().includes(q.toLowerCase());
      return matchesType && matchesStatus && matchesQ;
    });
  }, [posts, typeFilter, status, q]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: 0 };
    posts.forEach((p) => {
      if (typeFilter !== "all" && (p.type || "post") !== typeFilter) return;
      c.all++;
      c[p.status] = (c[p.status] || 0) + 1;
    });
    return c;
  }, [posts, typeFilter]);

  const viewUrl = (p: Post) => {
    const t = p.type || "post";
    if (t === "page") return `/p/${p.slug}`;
    if (t === "post") return `/blog/${p.slug}`;
    return `/p/${p.slug}`;
  };

  const label = typeFilter === "all" ? "All content" : titleCase(typeFilter) + (typeFilter.endsWith("s") ? "" : "s");

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">{label}</h1>
          <p className="text-xs text-muted-foreground">
            {filtered.length} of {posts.length} items
          </p>
        </div>
        <Button asChild>
          <Link to={`/admin/posts/new?type=${typeFilter === "all" ? "post" : typeFilter}`}>
            New {typeFilter === "all" ? "post" : titleCase(typeFilter)}
          </Link>
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by title…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-sm"
        />

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {titleCase(s)} {counts[s] ? `(${counts[s]})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={typeFilter}
          onValueChange={(v) => {
            const next = new URLSearchParams(searchParams);
            next.set("type", v);
            setSearchParams(next);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {Array.from(new Set(posts.map((p) => p.type || "post"))).map((t) => (
              <SelectItem key={t} value={t}>
                {titleCase(t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Quick status pills */}
        <div className="flex gap-1 flex-wrap">
          {STATUSES.filter((s) => s !== "all" && counts[s]).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`text-xs px-2 py-1 rounded-full border ${
                status === s ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
              }`}
            >
              {titleCase(s)} ({counts[s]})
            </button>
          ))}
          {status !== "all" && (
            <button
              onClick={() => setStatus("all")}
              className="text-xs px-2 py-1 rounded-full border hover:bg-muted"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="bg-background border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">Title</th>
              <th className="p-3">Slug</th>
              <th className="p-3">Type</th>
              <th className="p-3">Status</th>
              <th className="p-3">Updated</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  No items match your filters.
                </td>
              </tr>
            )}
            {filtered.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3 font-medium">{p.title || "(untitled)"}</td>
                <td className="p-3 text-muted-foreground">{p.slug}</td>
                <td className="p-3">
                  <Badge variant="outline">{p.type || "post"}</Badge>
                </td>
                <td className="p-3">
                  <Badge variant={p.status === "published" ? "default" : "outline"}>
                    {p.status}
                  </Badge>
                </td>
                <td className="p-3 text-muted-foreground">
                  {new Date(p.updated_at).toLocaleDateString()}
                </td>
                <td className="p-3">
                  <div className="flex items-center justify-end gap-2">
                    <Button asChild size="sm" variant="ghost" title="View on site">
                      <a href={viewUrl(p)} target="_blank" rel="noopener noreferrer">
                        <Eye className="w-4 h-4" />
                      </a>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/admin/posts/${p.id}`}>
                        <Pencil className="w-4 h-4 mr-1" /> Edit
                      </Link>
                    </Button>
                  </div>
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
