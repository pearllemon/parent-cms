import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/parent";
import { supabase as cloud } from "@/integrations/supabase/client";
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
import { Eye, Pencil, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { SeoScoreDot } from "@/components/admin/seo/SeoScoreBadge";
import { loadPostSeoMany } from "@/lib/postSeo";

type Post = {
  id: string;
  title: string;
  slug: string;
  status: string;
  type: string | null;
  publish_date: string | null;
  updated_at: string;
  source?: "parent" | "imported";
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
  const [seoMap, setSeoMap] = useState<Record<string, { score: number }>>({});
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!config?.site?.id) return;
    setLoading(true);

    // 1) Posts from the parent CMS
    const parentReq = supabase
      .from("posts")
      .select("id,title,slug,status,type,publish_date,updated_at")
      .eq("site_id", config.site.id)
      .order("updated_at", { ascending: false })
      .limit(500);

    // 2) Posts imported into Lovable Cloud (WP XML) — shared across all users
    //    (WordPress-style), so we don't filter by site_id here.
    const cloudReq = cloud
      .from("imported_posts")
      .select("id,title,slug,status,type,publish_date,updated_at")
      .order("updated_at", { ascending: false })
      .limit(1000);

    const [parentRes, cloudRes] = await Promise.all([parentReq, cloudReq]);

    if (parentRes.error) toast.error(parentRes.error.message);
    if (cloudRes.error) console.error(cloudRes.error.message);

    const parentRows: Post[] = (parentRes.data || []).map((p: any) => ({
      ...p,
      source: "parent" as const,
    }));
    const cloudRows: Post[] = (cloudRes.data || []).map((p: any) => ({
      ...p,
      source: "imported" as const,
    }));

    // Merge & dedupe by slug+type, preferring parent rows when present
    const seen = new Set<string>();
    const merged: Post[] = [];
    for (const row of [...parentRows, ...cloudRows]) {
      const key = `${row.type || "post"}::${row.slug}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(row);
    }
    merged.sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );

    setPosts(merged);
    setLoading(false);

    // Fetch SEO scores in the background for overlay dots
    const refs = merged.map((p) => ({ scope: (p.source === "imported" ? "imported" : "parent") as any, post_id: p.id }));
    loadPostSeoMany(refs).then((map) => {
      const out: Record<string, { score: number }> = {};
      Object.entries(map).forEach(([k, v]: any) => { if (typeof v.last_score === "number") out[k] = { score: v.last_score }; });
      setSeoMap(out);
    }).catch(() => {});
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
            {filtered.map((p) => {
              const editHref = `/admin/posts/${p.id}${p.source === "imported" ? "?scope=imported" : ""}`;
              const seoKey = `${p.source === "imported" ? "imported" : "parent"}::${p.id}`;
              const seoEntry = seoMap[seoKey];
              return (
              <tr key={p.id} className="border-t">
                <td className="p-3 font-medium">
                  <div className="flex items-center gap-2">
                    {seoEntry ? <SeoScoreDot score={seoEntry.score} /> : <span className="inline-block w-2.5 h-2.5 rounded-full bg-muted ring-2 ring-background" title="No SEO data" />}
                    <Link to={editHref} className="hover:underline">
                      {p.title || "(untitled)"}
                    </Link>
                    {p.source === "imported" && (
                      <Badge variant="secondary" className="text-[10px]">
                        Imported
                      </Badge>
                    )}
                  </div>
                </td>
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
                    {p.source === "imported" && (
                      <Button asChild size="sm" variant="outline" title="Inline visual editor">
                        <Link to={`/admin/edit/${p.id}`}>
                          <Wand2 className="w-4 h-4 mr-1" /> Edit visually
                        </Link>
                      </Button>
                    )}
                    {p.source !== "imported" && (
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/admin/posts/${p.id}`}>
                          <Pencil className="w-4 h-4 mr-1" /> Edit
                        </Link>
                      </Button>
                    )}
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
