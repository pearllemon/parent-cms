// Media Library — comprehensive admin page.
//
// Grid + list view, search, mime filter, folder filter, upload, bulk
// select & delete, alt/title/caption/description editing, copy URL.
// Uploads go to cloud `post-images` bucket and mirror to parent
// `media_library` for cross-site visibility. Metadata (alt, caption,
// etc.) lives in `media_meta`.

import { useMemo, useRef, useState } from "react";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { supabase as cloud } from "@/integrations/supabase/client";
import { supabase as parent } from "@/lib/parent";
import { useSiteConfig } from "@/providers/SiteProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Upload, Grid3x3, List, Search, Trash2, Copy, Folder, FolderPlus, X, Loader2, ExternalLink,
} from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */
const cloudT = (t: string) => (cloud.from(t as any) as any);
const parentT = (t: string) => (parent.from(t as any) as any);

type MediaRow = {
  id: string;
  source: "cloud" | "parent";
  url: string;
  file_name: string;
  mime_type?: string | null;
  size_bytes?: number | null;
  alt_text?: string | null;
  title?: string | null;
  caption?: string | null;
  description?: string | null;
  folder?: string | null;
  tags?: string[] | null;
  width?: number | null;
  height?: number | null;
  created_at?: string;
};

type Folder = { id: string; name: string };

const fmtSize = (n?: number | null) => {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
};

const guessMime = (n: string) => {
  const ext = n.split(".").pop()?.toLowerCase();
  if (!ext) return null;
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "avif"].includes(ext)) return `image/${ext === "jpg" ? "jpeg" : ext}`;
  if (["mp4", "webm", "mov"].includes(ext)) return `video/${ext}`;
  if (["mp3", "wav", "ogg", "m4a"].includes(ext)) return `audio/${ext}`;
  if (["pdf"].includes(ext)) return "application/pdf";
  return null;
};

const AdminMedia = () => {
  const { config } = useSiteConfig();
  const siteId = config?.site?.id;

  const PAGE_SIZE = 500;
  const [view, setView] = useState<"grid" | "list">("grid");
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "image" | "video" | "audio" | "document" | "other">("all");
  const [folderFilter, setFolderFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<MediaRow | null>(null);
  const [uploading, setUploading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const fileRef = useRef<HTMLInputElement>(null);

  // Cached query — shows the library instantly from cache, refreshes in
  // background. Sources merged in priority order: media_meta (rich metadata)
  // → imported_posts featured images (real content) → cloud storage bucket
  // (anything uploaded outside the admin) → parent media_library.
  const { data, loading, refresh } = useCachedQuery<{ items: MediaRow[]; folders: Folder[] }>(
    `media:v3:${siteId || "any"}`,
    async () => {
      const next: MediaRow[] = [];
      const seenUrl = new Set<string>();
      const push = (row: MediaRow) => {
        if (!row.url || seenUrl.has(row.url)) return;
        seenUrl.add(row.url);
        next.push(row);
      };

      // 1) media_meta (canonical, has alt/title/etc.)
      try {
        let qb = cloudT("media_meta").select("*").order("created_at", { ascending: false }).limit(1000);
        if (siteId) qb = qb.eq("site_id", siteId);
        const { data: rows } = await qb;
        for (const r of (rows as any[]) || []) {
          push({
            id: `c:${r.id}`,
            source: "cloud",
            url: r.media_url,
            file_name: r.file_name || r.media_url.split("/").pop() || "media",
            mime_type: r.mime_type, size_bytes: r.size_bytes,
            alt_text: r.alt_text, title: r.title, caption: r.caption, description: r.description,
            folder: r.folder, tags: r.tags, width: r.width, height: r.height,
            created_at: r.created_at,
          });
        }
      } catch { /* ignore */ }

      // 2) Featured images discovered in imported_posts — surfaces media
      // that was imported with WP content but never catalogued in media_meta.
      try {
        const { data: rows } = await cloudT("imported_posts")
          .select("id,title,featured_image_url,featured_image_alt,updated_at")
          .not("featured_image_url", "is", null)
          .order("updated_at", { ascending: false })
          .limit(2000);
        for (const r of (rows as any[]) || []) {
          if (!r.featured_image_url) continue;
          const name = (r.featured_image_url as string).split("/").pop()?.split("?")[0] || "image";
          push({
            id: `i:${r.id}`,
            source: "cloud",
            url: r.featured_image_url,
            file_name: name,
            mime_type: guessMime(name),
            alt_text: r.featured_image_alt || r.title || null,
            title: r.title || null,
            folder: "imported",
            created_at: r.updated_at,
          });
        }
      } catch { /* ignore */ }

      // 3) Anything sitting in the post-images bucket that nobody catalogued
      // yet (uploaded via SDK, scripts, etc.).
      try {
        const walkBucket = async (prefix: string, depth = 0) => {
          if (depth > 3) return;
          const { data: entries } = await cloud.storage.from("post-images")
            .list(prefix, { limit: 1000, sortBy: { column: "created_at", order: "desc" } });
          for (const e of entries || []) {
            const path = prefix ? `${prefix}/${e.name}` : e.name;
            const isFolder = !(e as any).id;
            if (isFolder) { await walkBucket(path, depth + 1); continue; }
            const { data: pub } = cloud.storage.from("post-images").getPublicUrl(path);
            const size = (e as any).metadata?.size ?? null;
            const mime = (e as any).metadata?.mimetype ?? guessMime(e.name);
            push({
              id: `s:${path}`,
              source: "cloud",
              url: pub.publicUrl,
              file_name: e.name,
              mime_type: mime,
              size_bytes: size,
              folder: prefix.split("/")[0] || "uncategorized",
              created_at: (e as any).created_at,
            });
          }
        };
        await walkBucket("");
      } catch { /* ignore — bucket access may be restricted */ }

      // 4) Parent media_library (cross-site shared assets).
      try {
        const { data: rows } = await parentT("media_library")
          .select("id,file_url,file_name,file_size,mime_type,created_at")
          .order("created_at", { ascending: false }).limit(500);
        for (const r of (rows as any[]) || []) {
          push({
            id: `p:${r.id}`,
            source: "parent",
            url: r.file_url,
            file_name: r.file_name,
            mime_type: r.mime_type || guessMime(r.file_name),
            size_bytes: r.file_size,
            created_at: r.created_at,
          });
        }
      } catch { /* ignore */ }

      let folderRows: Folder[] = [];
      try {
        let qb = cloudT("media_folders").select("id,name").order("name");
        if (siteId) qb = qb.eq("site_id", siteId);
        const { data: rows } = await qb;
        folderRows = (rows as Folder[]) || [];
      } catch { /* ignore */ }

      return { items: next, folders: folderRows };
    },
  );
  const items = useMemo(() => data?.items || [], [data]);
  const folders = useMemo(() => data?.folders || [], [data]);
  const load = refresh;

  const upload = async (files: FileList) => {
    if (!siteId) return toast.error("Site not loaded");
    setUploading(true);
    let okCount = 0;
    for (const file of Array.from(files)) {
      try {
        const path = `library/${siteId}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
        const { error } = await cloud.storage.from("post-images").upload(path, file);
        if (error) throw error;
        const { data } = cloud.storage.from("post-images").getPublicUrl(path);
        await cloudT("media_meta").insert({
          site_id: siteId,
          media_url: data.publicUrl,
          file_name: file.name,
          mime_type: file.type,
          size_bytes: file.size,
          source: "cloud",
          folder: folderFilter !== "all" ? folderFilter : "uncategorized",
        });
        try {
          await parentT("media_library").insert({
            site_id: siteId, file_url: data.publicUrl, file_name: file.name,
            file_size: file.size, mime_type: file.type,
          });
        } catch { /* ignore */ }
        okCount++;
      } catch (e) {
        toast.error(`${file.name}: ${e instanceof Error ? e.message : "upload failed"}`);
      }
    }
    if (okCount) toast.success(`${okCount} file${okCount > 1 ? "s" : ""} uploaded`);
    setUploading(false);
    await load();
  };

  const del = async (rows: MediaRow[]) => {
    if (!confirm(`Delete ${rows.length} item(s)? Files in cloud storage will also be removed.`)) return;
    for (const r of rows) {
      try {
        if (r.source === "cloud") {
          await cloudT("media_meta").delete().eq("id", r.id.slice(2));
          const m = r.url.match(/\/object\/public\/post-images\/(.+)$/);
          if (m) await cloud.storage.from("post-images").remove([decodeURIComponent(m[1])]);
        } else {
          await parentT("media_library").delete().eq("id", r.id.slice(2));
        }
      } catch (e) {
        toast.error(`${r.file_name}: ${e instanceof Error ? e.message : "failed"}`);
      }
    }
    toast.success("Deleted");
    setSelected(new Set());
    await load();
  };

  const saveMeta = async (m: MediaRow) => {
    try {
      if (m.source === "cloud") {
        await cloudT("media_meta").update({
          alt_text: m.alt_text, title: m.title, caption: m.caption, description: m.description,
          folder: m.folder, tags: m.tags,
        }).eq("id", m.id.slice(2));
      } else {
        // Parent items don't have metadata cols — upsert a media_meta row instead.
        await cloudT("media_meta").upsert({
          site_id: siteId,
          media_url: m.url, file_name: m.file_name, mime_type: m.mime_type, size_bytes: m.size_bytes,
          alt_text: m.alt_text, title: m.title, caption: m.caption, description: m.description,
          folder: m.folder, tags: m.tags, source: "parent",
        }, { onConflict: "site_id,media_url" });
      }
      toast.success("Saved");
      setEditing(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const createFolder = async () => {
    const name = window.prompt("Folder name:");
    if (!name) return;
    try {
      await cloudT("media_folders").insert({ site_id: siteId, name });
      toast.success("Folder created");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const filtered = useMemo(() => items.filter((i) => {
    if (q) {
      const s = q.toLowerCase();
      if (!(i.file_name?.toLowerCase().includes(s) || i.alt_text?.toLowerCase().includes(s) || i.url.toLowerCase().includes(s))) return false;
    }
    if (folderFilter !== "all" && (i.folder || "uncategorized") !== folderFilter) return false;
    if (typeFilter !== "all") {
      const m = (i.mime_type || guessMime(i.file_name) || "").toLowerCase();
      if (typeFilter === "image" && !m.startsWith("image/")) return false;
      if (typeFilter === "video" && !m.startsWith("video/")) return false;
      if (typeFilter === "audio" && !m.startsWith("audio/")) return false;
      if (typeFilter === "document" && !(m.startsWith("application/") || m.startsWith("text/"))) return false;
      if (typeFilter === "other" && (m.startsWith("image/") || m.startsWith("video/") || m.startsWith("audio/") || m.startsWith("application/") || m.startsWith("text/"))) return false;
    }
    return true;
  }), [items, q, typeFilter, folderFilter]);

  // Reset pagination when filters change
  useMemo(() => { setVisibleCount(PAGE_SIZE); }, [q, typeFilter, folderFilter]);
  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const hasMore = visible.length < filtered.length;

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="font-display text-3xl">Media Library</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} of {items.length} items</p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => e.target.files && upload(e.target.files)} />
          <Button variant="outline" onClick={createFolder}><FolderPlus className="w-4 h-4 mr-1" /> New folder</Button>
          <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />} Upload
          </Button>
        </div>
      </header>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search by name, alt text, URL…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="image">Images</SelectItem>
            <SelectItem value="video">Videos</SelectItem>
            <SelectItem value="audio">Audio</SelectItem>
            <SelectItem value="document">Documents</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        <Select value={folderFilter} onValueChange={setFolderFilter}>
          <SelectTrigger className="w-40"><Folder className="w-3 h-3 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All folders</SelectItem>
            <SelectItem value="uncategorized">Uncategorized</SelectItem>
            {folders.map((f) => <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Tabs value={view} onValueChange={(v) => setView(v as "grid" | "list")}>
          <TabsList>
            <TabsTrigger value="grid"><Grid3x3 className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="list"><List className="w-4 h-4" /></TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center justify-between bg-muted/40 border rounded-lg p-2 text-sm">
          <span>{selected.size} selected</span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}><X className="w-3 h-3 mr-1" /> Clear</Button>
            <Button size="sm" variant="destructive" onClick={() => del(filtered.filter((i) => selected.has(i.id)))}>
              <Trash2 className="w-3 h-3 mr-1" /> Delete
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground p-8 text-center">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="border-2 border-dashed rounded-xl p-12 text-center text-muted-foreground">
          <Upload className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">No media. Drop files or click <b>Upload</b>.</p>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filtered.map((it) => (
            <div key={it.id} className="group relative border rounded-xl overflow-hidden bg-background">
              <Checkbox
                checked={selected.has(it.id)}
                onCheckedChange={() => toggle(it.id)}
                className="absolute top-2 left-2 z-10 bg-background/90"
              />
              <button onClick={() => setEditing(it)} className="block w-full text-left">
                {(it.mime_type || guessMime(it.file_name) || "").startsWith("image/") ? (
                  <img src={it.url} alt={it.alt_text || it.file_name} className="w-full h-32 object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-32 bg-muted flex items-center justify-center text-xs text-muted-foreground text-center p-2">
                    {it.mime_type || it.file_name.split(".").pop()?.toUpperCase()}
                  </div>
                )}
                <div className="p-2">
                  <div className="text-xs truncate">{it.file_name}</div>
                  <div className="text-[10px] text-muted-foreground flex justify-between">
                    <span>{fmtSize(it.size_bytes)}</span><span>{it.source}</span>
                  </div>
                </div>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs">
              <tr><th className="p-2 w-8"></th><th className="p-2 text-left">Name</th><th className="p-2 text-left">Type</th><th className="p-2 text-left">Size</th><th className="p-2 text-left">Folder</th><th className="p-2 text-left">Alt text</th><th className="p-2"></th></tr>
            </thead>
            <tbody>
              {filtered.map((it) => (
                <tr key={it.id} className="border-t hover:bg-muted/30">
                  <td className="p-2"><Checkbox checked={selected.has(it.id)} onCheckedChange={() => toggle(it.id)} /></td>
                  <td className="p-2 flex items-center gap-2">
                    {(it.mime_type || "").startsWith("image/") ? <img src={it.url} className="w-8 h-8 rounded object-cover" /> : <div className="w-8 h-8 rounded bg-muted" />}
                    <button className="underline truncate max-w-[200px]" onClick={() => setEditing(it)}>{it.file_name}</button>
                  </td>
                  <td className="p-2 text-xs text-muted-foreground">{it.mime_type || "—"}</td>
                  <td className="p-2 text-xs">{fmtSize(it.size_bytes)}</td>
                  <td className="p-2 text-xs">{it.folder || "—"}</td>
                  <td className="p-2 text-xs truncate max-w-[180px]">{it.alt_text || "—"}</td>
                  <td className="p-2 text-right">
                    <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(it.url); toast.success("URL copied"); }}><Copy className="w-3 h-3" /></Button>
                    <Button size="sm" variant="ghost" asChild><a href={it.url} target="_blank" rel="noreferrer"><ExternalLink className="w-3 h-3" /></a></Button>
                    <Button size="sm" variant="ghost" className="text-red-600" onClick={() => del([it])}><Trash2 className="w-3 h-3" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && (
          <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0">
            <DialogHeader className="p-6 pb-3 border-b">
              <DialogTitle className="truncate">{editing.file_name}</DialogTitle>
            </DialogHeader>
            <div className="grid md:grid-cols-2 gap-4 p-6 overflow-y-auto flex-1 min-h-0">
              <div className="min-w-0">
                {(editing.mime_type || "").startsWith("image/") ? (
                  <img src={editing.url} alt={editing.alt_text || ""} className="w-full rounded border" />
                ) : (
                  <div className="aspect-square bg-muted rounded flex items-center justify-center text-muted-foreground">{editing.mime_type}</div>
                )}
                <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
                  <div>Size: {fmtSize(editing.size_bytes)}</div>
                  <div>Type: {editing.mime_type || "—"}</div>
                  <div>Source: {editing.source}</div>
                  <div className="flex items-center gap-1">
                    <span className="truncate flex-1 min-w-0">{editing.url}</span>
                    <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(editing.url); toast.success("Copied"); }}><Copy className="w-3 h-3" /></Button>
                  </div>
                </div>
              </div>
              <div className="space-y-3 min-w-0">
                <div><Label className="text-xs">Alt text</Label><Input value={editing.alt_text || ""} onChange={(e) => setEditing({ ...editing, alt_text: e.target.value })} placeholder="Describe the image for accessibility/SEO" /></div>
                <div><Label className="text-xs">Title</Label><Input value={editing.title || ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
                <div><Label className="text-xs">Caption</Label><Input value={editing.caption || ""} onChange={(e) => setEditing({ ...editing, caption: e.target.value })} /></div>
                <div><Label className="text-xs">Description</Label><Textarea rows={3} value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
                <div><Label className="text-xs">Folder</Label>
                  <Select value={editing.folder || "uncategorized"} onValueChange={(v) => setEditing({ ...editing, folder: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="uncategorized">Uncategorized</SelectItem>
                      {folders.map((f) => <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Tags (comma separated)</Label>
                  <Input value={(editing.tags || []).join(", ")} onChange={(e) => setEditing({ ...editing, tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
                </div>
              </div>
            </div>
            <DialogFooter className="p-4 border-t flex-wrap gap-2">
              <Button variant="destructive" onClick={() => del([editing])}><Trash2 className="w-4 h-4 mr-1" /> Delete</Button>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={() => saveMeta(editing)}>Save</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default AdminMedia;
