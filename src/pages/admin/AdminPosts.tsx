import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/parent";
import { supabase as cloud } from "@/integrations/supabase/client";
import { useSiteConfig } from "@/providers/SiteProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Eye, Pencil, Wand2, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { SeoScoreDot } from "@/components/admin/seo/SeoScoreBadge";
import { loadPostSeoMany } from "@/lib/postSeo";
import ScreenOptions, { useScreenPrefs, type ColumnDef } from "@/components/admin/ScreenOptions";

type Post = {
  id: string;
  title: string;
  slug: string;
  status: string;
  type: string | null;
  publish_date: string | null;
  updated_at: string;
  source?: "parent" | "imported";
  author?: string | null;
  categories?: { slug: string; name: string }[];
  tags?: { slug: string; name: string }[];
  comments?: number;
};

const STATUSES = ["all", "published", "draft", "scheduled", "pending", "private", "trash"];

const titleCase = (s: string) =>
  s.split(/[_-]/).map((w) => w[0]?.toUpperCase() + w.slice(1)).join(" ");

const COLUMNS: ColumnDef[] = [
  { key: "title", label: "Title", alwaysOn: true, defaultVisible: true },
  { key: "author", label: "Author", defaultVisible: true },
  { key: "categories", label: "Categories", defaultVisible: true },
  { key: "tags", label: "Tags", defaultVisible: false },
  { key: "comments", label: "Comments", defaultVisible: false },
  { key: "slug", label: "Slug", defaultVisible: true },
  { key: "type", label: "Type", defaultVisible: false },
  { key: "status", label: "Status", defaultVisible: true },
  { key: "date", label: "Date", defaultVisible: true },
  { key: "seo", label: "SEO score", defaultVisible: true },
];

const AdminPosts = () => {
  const { config } = useSiteConfig();
  const [searchParams, setSearchParams] = useSearchParams();
  const typeFilter = searchParams.get("type") || "post";
  const [prefs, setPrefs] = useScreenPrefs(`admin:posts:${typeFilter}`, COLUMNS);
  const siteId = config?.site?.id as string | undefined;

  const [seoMap, setSeoMap] = useState<Record<string, { score: number }>>({});
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [author, setAuthor] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string>("");
  const [quickEditingId, setQuickEditingId] = useState<string | null>(null);
  const [quickEditForm, setQuickEditForm] = useState({
    title: "",
    slug: "",
    status: "draft",
    author: "",
    template: "default",
  });

  const startQuickEdit = (p: Post) => {
    setQuickEditingId(p.id);
    setQuickEditForm({
      title: p.title || "",
      slug: p.slug || "",
      status: p.status || "draft",
      author: p.author || "",
      template: (p as any).template || "default",
    });
  };

  const saveQuickEdit = async (p: Post) => {
    const toastId = toast.loading("Updating post...");
    try {
      const payload: any = {
        title: quickEditForm.title,
        slug: quickEditForm.slug,
        status: quickEditForm.status,
        updated_at: new Date().toISOString(),
      };
      
      if (p.type === "page") {
        payload.template = quickEditForm.template;
      }
      if (p.type === "post" || !p.type) {
        payload.author = quickEditForm.author;
      }

      if (p.source === "imported") {
        const { error } = await cloud
          .from("imported_posts")
          .update(payload)
          .eq("id", p.id);
        if (error) throw error;
        
        // Best effort mirror
        try {
          await supabase
            .from("posts")
            .update({
              title: quickEditForm.title,
              slug: quickEditForm.slug,
              status: quickEditForm.status,
              updated_at: new Date().toISOString(),
            })
            .eq("id", p.id);
        } catch (e) { console.warn("Mirror update failed:", e); }
      } else {
        const { error } = await supabase
          .from("posts")
          .update(payload)
          .eq("id", p.id);
        if (error) throw error;
      }

      toast.success("Post updated", { id: toastId });
      refresh();
      setQuickEditingId(null);
    } catch (err: any) {
      toast.error("Update failed: " + err.message, { id: toastId });
    }
  };

  const handleDeletePost = async (p: Post) => {
    if (!confirm(`Are you sure you want to permanently delete "${p.title}"?`)) return;
    
    const toastId = toast.loading("Deleting post...");
    try {
      if (p.source === "imported") {
        const { error } = await cloud.from("imported_posts").delete().eq("id", p.id);
        if (error) throw error;
        
        // Best effort mirror delete
        try {
          await supabase.from("posts").delete().eq("id", p.id);
        } catch (e) { console.warn("Mirror delete failed:", e); }
      } else {
        const { error } = await supabase.from("posts").delete().eq("id", p.id);
        if (error) throw error;
      }
      
      toast.success("Post deleted", { id: toastId });
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(p.id);
        return next;
      });
      refresh();
    } catch (err: any) {
      toast.error("Delete failed: " + err.message, { id: toastId });
    }
  };

  const handleBulkApply = async () => {
    if (bulkAction !== "delete") return;
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to permanently delete these ${selectedIds.size} items?`)) return;
    
    const toastId = toast.loading(`Deleting ${selectedIds.size} items...`);
    try {
      const idsArray = Array.from(selectedIds);
      
      // Separate ids by source
      const parentIds = idsArray.filter(id => posts.find(p => p.id === id)?.source === "parent");
      const importedIds = idsArray.filter(id => posts.find(p => p.id === id)?.source === "imported");
      
      if (parentIds.length > 0) {
        const { error } = await supabase.from("posts").delete().in("id", parentIds);
        if (error) throw error;
      }
      
      if (importedIds.length > 0) {
        const { error } = await cloud.from("imported_posts").delete().in("id", importedIds);
        if (error) throw error;
        
        // Best effort mirror delete
        try {
          await supabase.from("posts").delete().in("id", importedIds);
        } catch (e) { console.warn("Mirror delete failed:", e); }
      }
      
      toast.success(`Successfully deleted ${selectedIds.size} items`, { id: toastId });
      setSelectedIds(new Set());
      refresh();
    } catch (err: any) {
      toast.error("Bulk delete failed: " + err.message, { id: toastId });
    }
  };

  // Cached query — list renders instantly from cache, refreshes in background.
  const { data, loading, refresh } = useCachedQuery<Post[]>(
    siteId ? `posts:v2:${siteId}` : null,
    async () => {
      // Parent: keep the select to columns we KNOW exist. The parent schema
      // doesn't have categories/tags/comment_count, and selecting them used
      // to fail the whole query, leaving the list empty.
      const parentReq = supabase
        .from("posts")
        .select("id,title,slug,status,type,publish_date,updated_at")
        .eq("site_id", siteId!)
        .order("updated_at", { ascending: false })
        .limit(500);

      const cloudReq = cloud
        .from("imported_posts")
        .select("id,title,slug,status,type,publish_date,updated_at,raw")
        .order("updated_at", { ascending: false })
        .limit(2000);

      const [parentRes, cloudRes] = await Promise.all([parentReq, cloudReq]);

      if (parentRes.error) console.warn("[posts] parent fetch:", parentRes.error.message);
      if (cloudRes.error) console.warn("[posts] cloud fetch:", cloudRes.error.message);

      const parentRows: Post[] = (parentRes.data || []).map((p: any) => ({
        id: p.id, title: p.title, slug: p.slug, status: p.status, type: p.type,
        publish_date: p.publish_date, updated_at: p.updated_at,
        source: "parent" as const,
        author: null,
        categories: [],
        tags: [],
        comments: 0,
      }));
      const cloudRows: Post[] = (cloudRes.data || []).map((p: any) => {
        const raw = p.raw || {};
        return {
          id: p.id, title: p.title, slug: p.slug, status: p.status, type: p.type,
          publish_date: p.publish_date, updated_at: p.updated_at,
          source: "imported" as const,
          author: typeof raw.author === "object" ? raw.author?.name : raw.author,
          categories: Array.isArray(raw.categories) ? raw.categories : [],
          tags: Array.isArray(raw.tags) ? raw.tags : [],
          comments: 0,
        };
      });

      const seen = new Set<string>();
      const merged: Post[] = [];
      for (const row of [...parentRows, ...cloudRows]) {
        const key = `${row.type || "post"}::${row.slug}`;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(row);
      }
      merged.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      return merged;
    },
  );
  const posts = useMemo(() => data || [], [data]);

  // SEO score dots — refresh whenever the post list changes (cached or fresh)
  useEffect(() => {
    if (!posts.length) return;
    const refs = posts.map((p) => ({ scope: (p.source === "imported" ? "imported" : "parent") as any, post_id: p.id }));
    loadPostSeoMany(refs).then((map) => {
      const out: Record<string, { score: number }> = {};
      Object.entries(map).forEach(([k, v]: any) => { if (typeof v.last_score === "number") out[k] = { score: v.last_score }; });
      setSeoMap(out);
    }).catch(() => {});
    // eslint-disable-next-line
  }, [posts]);

  // Realtime — refresh whenever imported_posts changes
  useEffect(() => {
    const ch = cloud.channel("admin-posts-live");
    (ch as any).on("postgres_changes", { event: "*", schema: "public", table: "imported_posts" }, () => void refresh());
    ch.subscribe();
    return () => { cloud.removeChannel(ch); };
  }, [refresh]);

  const allAuthors = useMemo(() => Array.from(new Set(posts.map((p) => p.author).filter(Boolean))) as string[], [posts]);
  const allCategories = useMemo(() => {
    const set = new Set<string>();
    posts.forEach((p) => p.categories?.forEach((c) => c?.name && set.add(c.name)));
    return Array.from(set);
  }, [posts]);

  const filtered = useMemo(() => {
    return posts.filter((p) => {
      const matchesType = typeFilter === "all" ? true : (p.type || "post") === typeFilter;
      const matchesStatus = status === "all" ? true : p.status === status;
      const matchesAuthor = author === "all" ? true : (p.author || "").toLowerCase() === author.toLowerCase();
      const matchesCat = category === "all" ? true : !!p.categories?.some((c) => c?.name === category);
      const matchesQ = !q || p.title?.toLowerCase().includes(q.toLowerCase()) || p.slug?.toLowerCase().includes(q.toLowerCase());
      return matchesType && matchesStatus && matchesAuthor && matchesCat && matchesQ;
    });
  }, [posts, typeFilter, status, author, category, q]);

  useEffect(() => { setPage(1); }, [q, status, author, category, typeFilter, prefs.perPage]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: 0 };
    posts.forEach((p) => {
      if (typeFilter !== "all" && (p.type || "post") !== typeFilter) return;
      c.all++;
      c[p.status] = (c[p.status] || 0) + 1;
    });
    return c;
  }, [posts, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / prefs.perPage));
  const pageRows = filtered.slice((page - 1) * prefs.perPage, page * prefs.perPage);

  const viewUrl = (p: Post) => {
    const t = p.type || "post";
    if (t === "page") return `/p/${p.slug}`;
    if (t === "post") return `/blog/${p.slug}`;
    return `/p/${p.slug}`;
  };

  const label = typeFilter === "all" ? "All content" : titleCase(typeFilter) + (typeFilter.endsWith("s") ? "" : "s");
  const visible = (k: string) => prefs.visible[k] !== false;
  const compact = prefs.view === "compact";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">{label}</h1>
          <p className="text-xs text-muted-foreground">
            {filtered.length} of {posts.length} items · page {page} of {totalPages}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ScreenOptions columns={COLUMNS} prefs={prefs} onChange={setPrefs} />
          <Button asChild>
            <Link to={`/admin/posts/new?type=${typeFilter === "all" ? "post" : typeFilter}`}>
              New {typeFilter === "all" ? "post" : titleCase(typeFilter)}
            </Link>
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <Input placeholder="Search by title or slug…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{titleCase(s)} {counts[s] ? `(${counts[s]})` : ""}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {allAuthors.length > 0 && (
          <Select value={author} onValueChange={setAuthor}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Author" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All authors</SelectItem>
              {allAuthors.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {allCategories.length > 0 && (
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {allCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        <Select
          value={typeFilter}
          onValueChange={(v) => { const next = new URLSearchParams(searchParams); next.set("type", v); setSearchParams(next); }}
        >
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {Array.from(new Set(posts.map((p) => p.type || "post"))).map((t) => (
              <SelectItem key={t} value={t}>{titleCase(t)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Actions Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-muted/20 p-3 border rounded-2xl">
        <div className="flex items-center gap-2">
          <Select value={bulkAction} onValueChange={setBulkAction}>
            <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Bulk Actions" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="delete">Delete permanently</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleBulkApply} disabled={!bulkAction || selectedIds.size === 0} variant="secondary" size="sm" className="h-9">
            Apply
          </Button>
        </div>
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span>{selectedIds.size} items selected</span>
            <Button onClick={() => setSelectedIds(new Set())} variant="ghost" size="sm" className="h-7 px-2">
              Deselect All
            </Button>
          </div>
        )}
      </div>

      <div className="bg-background border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3 w-10">
                <input
                  type="checkbox"
                  checked={pageRows.length > 0 && pageRows.every(r => selectedIds.has(r.id))}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds(prev => {
                        const next = new Set(prev);
                        pageRows.forEach(r => next.add(r.id));
                        return next;
                      });
                    } else {
                      setSelectedIds(prev => {
                        const next = new Set(prev);
                        pageRows.forEach(r => next.delete(r.id));
                        return next;
                      });
                    }
                  }}
                  className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                />
              </th>
              {visible("title") && <th className={compact ? "p-2" : "p-3"}>Title</th>}
              {visible("author") && <th className={compact ? "p-2" : "p-3"}>Author</th>}
              {visible("categories") && <th className={compact ? "p-2" : "p-3"}>Categories</th>}
              {visible("tags") && <th className={compact ? "p-2" : "p-3"}>Tags</th>}
              {visible("comments") && <th className={compact ? "p-2" : "p-3"}>Comments</th>}
              {visible("slug") && <th className={compact ? "p-2" : "p-3"}>Slug</th>}
              {visible("type") && <th className={compact ? "p-2" : "p-3"}>Type</th>}
              {visible("status") && <th className={compact ? "p-2" : "p-3"}>Status</th>}
              {visible("date") && <th className={compact ? "p-2" : "p-3"}>Date</th>}
              <th className={`${compact ? "p-2" : "p-3"} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={12} className="p-6 text-center text-muted-foreground">Loading…</td></tr>}
            {!loading && pageRows.length === 0 && <tr><td colSpan={12} className="p-6 text-center text-muted-foreground">No items match your filters.</td></tr>}
            {pageRows.map((p) => {
              const editHref = `/admin/posts/${p.id}${p.source === "imported" ? "?scope=imported" : ""}`;
              const seoKey = `${p.source === "imported" ? "imported" : "parent"}::${p.id}`;
              const seoEntry = seoMap[seoKey];
              const cell = compact ? "p-2" : "p-3";
              
              if (p.id === quickEditingId) {
                return (
                  <tr key={p.id} className="bg-muted/30 border-t">
                    <td colSpan={12} className="p-4">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b pb-2">
                          <h4 className="font-semibold text-sm text-foreground">Quick Edit</h4>
                          <span className="text-xs text-muted-foreground">Slug: /{p.slug}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium">Title</label>
                            <Input
                              value={quickEditForm.title}
                              onChange={(e) => setQuickEditForm(prev => ({ ...prev, title: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium">Slug</label>
                            <Input
                              value={quickEditForm.slug}
                              onChange={(e) => setQuickEditForm(prev => ({ ...prev, slug: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium">Status</label>
                            <Select
                              value={quickEditForm.status}
                              onValueChange={(v) => setQuickEditForm(prev => ({ ...prev, status: v }))}
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="published">Published</SelectItem>
                                <SelectItem value="private">Private</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {(p.type === "post" || !p.type) && (
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium">Author</label>
                              <Input
                                value={quickEditForm.author}
                                onChange={(e) => setQuickEditForm(prev => ({ ...prev, author: e.target.value }))}
                              />
                            </div>
                          )}
                          {p.type === "page" && (
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium">Template</label>
                              <Select
                                value={quickEditForm.template}
                                onValueChange={(v) => setQuickEditForm(prev => ({ ...prev, template: v }))}
                              >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="default">Default template</SelectItem>
                                  <SelectItem value="full-width">Full width</SelectItem>
                                  <SelectItem value="sidebar-left">Sidebar left</SelectItem>
                                  <SelectItem value="sidebar-right">Sidebar right</SelectItem>
                                  <SelectItem value="landing">Landing page</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                        <div className="flex justify-end gap-2 pt-2 border-t">
                          <Button variant="outline" size="sm" onClick={() => setQuickEditingId(null)}>
                            Cancel
                          </Button>
                          <Button size="sm" onClick={() => saveQuickEdit(p)}>
                            Update
                          </Button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              }
              
              return (
                <tr key={p.id} className="border-t hover:bg-muted/10 transition-colors">
                  <td className="p-3 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(p.id)}
                      onChange={(e) => {
                        setSelectedIds(prev => {
                          const next = new Set(prev);
                          if (e.target.checked) {
                            next.add(p.id);
                          } else {
                            next.delete(p.id);
                          }
                          return next;
                        });
                      }}
                      className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                    />
                  </td>
                  {visible("title") && (
                    <td className={`${cell} font-medium`}>
                      <div className="flex items-center gap-2">
                        {visible("seo") && (seoEntry
                          ? <SeoScoreDot score={seoEntry.score} />
                          : <span className="inline-block w-2.5 h-2.5 rounded-full bg-muted ring-2 ring-background" title="No SEO data" />)}
                        <Link to={editHref} className="hover:underline">{p.title || "(untitled)"}</Link>
                        {p.source === "imported" && <Badge variant="secondary" className="text-[10px]">Imported</Badge>}
                      </div>
                    </td>
                  )}
                  {visible("author") && <td className={`${cell} text-muted-foreground`}>{p.author || "—"}</td>}
                  {visible("categories") && (
                    <td className={cell}>
                      <div className="flex flex-wrap gap-1">{(p.categories || []).slice(0, 3).map((c) => <Badge key={c.slug} variant="outline" className="text-[10px]">{c.name}</Badge>)}</div>
                    </td>
                  )}
                  {visible("tags") && (
                    <td className={cell}>
                      <div className="flex flex-wrap gap-1">{(p.tags || []).slice(0, 3).map((t) => <Badge key={t.slug} variant="outline" className="text-[10px]">{t.name}</Badge>)}</div>
                    </td>
                  )}
                  {visible("comments") && <td className={`${cell} text-center`}>{p.comments || 0}</td>}
                  {visible("slug") && <td className={`${cell} text-muted-foreground`}>{p.slug}</td>}
                  {visible("type") && <td className={cell}><Badge variant="outline">{p.type || "post"}</Badge></td>}
                  {visible("status") && <td className={cell}><Badge variant={p.status === "published" ? "default" : "outline"}>{p.status}</Badge></td>}
                  {visible("date") && <td className={`${cell} text-muted-foreground`}>{new Date(p.updated_at).toLocaleDateString()}</td>}
                  <td className={cell}>
                    <div className="flex items-center justify-end gap-2">
                      <Button asChild size="sm" variant="ghost" title="View on site">
                        <a href={viewUrl(p)} target="_blank" rel="noopener noreferrer"><Eye className="w-4 h-4" /></a>
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => startQuickEdit(p)} title="Quick Edit inline">
                        Quick Edit
                      </Button>
                      <Button asChild size="sm" variant="outline" title="Inline visual editor">
                        <Link to={`/admin/edit/${p.id}`}><Wand2 className="w-4 h-4 mr-1" /> Visual</Link>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link to={editHref}><Pencil className="w-4 h-4 mr-1" /> Edit</Link>
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeletePost(p)} title="Delete post permanently">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="flex items-center justify-between border-t p-3 text-sm">
          <div className="text-muted-foreground">{prefs.perPage} per page · {filtered.length} matches</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
            <span>Page {page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPosts;
