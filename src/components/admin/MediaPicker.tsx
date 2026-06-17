// Reusable media picker dialog. Opens a browseable grid of media items
// from BOTH the cloud `post-images` bucket (this site) and the parent
// CMS `media_library` table (cross-site). Lets you search, upload, and
// pick a single asset URL. Used by Authors, Settings, Post Editor.

import { useEffect, useRef, useState } from "react";
import { supabase as cloud } from "@/integrations/supabase/client";
import { supabase as parent } from "@/lib/parent";
import { useSiteConfig } from "@/providers/SiteProvider";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Upload, Search, ExternalLink, Loader2 } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */
const cloudT = (t: string) => (cloud.from(t as any) as any);
const parentT = (t: string) => (parent.from(t as any) as any);

export type MediaItem = {
  id: string;
  url: string;
  name: string;
  mime?: string | null;
  size?: number | null;
  source: "cloud" | "parent";
};

type Props = {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  onPick: (item: MediaItem) => void;
  accept?: string;          // mime prefix filter ('image/' to restrict)
  title?: string;
};

export default function MediaPicker({ open, onOpenChange, onPick, accept = "image/", title = "Select Media" }: Props) {
  const { config } = useSiteConfig();
  const siteId = config?.site?.id;
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const next: MediaItem[] = [];

    // 1) Parent CMS media_library (cross-site)
    try {
      const { data } = await parentT("media_library")
        .select("id,file_url,file_name,file_size,mime_type")
        .order("created_at", { ascending: false })
        .limit(200);
      for (const r of (data as any[]) || []) {
        if (accept && r.mime_type && !String(r.mime_type).startsWith(accept)) continue;
        next.push({ id: `p:${r.id}`, url: r.file_url, name: r.file_name, mime: r.mime_type, size: r.file_size, source: "parent" });
      }
    } catch { /* ignore */ }

    // 2) Cloud media_meta (this site, includes alt etc.)
    try {
      let qb = cloudT("media_meta").select("id,media_url,file_name,mime_type,size_bytes").order("created_at", { ascending: false }).limit(200);
      if (siteId) qb = qb.eq("site_id", siteId);
      const { data } = await qb;
      for (const r of (data as any[]) || []) {
        if (accept && r.mime_type && !String(r.mime_type).startsWith(accept)) continue;
        next.push({ id: `c:${r.id}`, url: r.media_url, name: r.file_name || r.media_url.split("/").pop() || "media", mime: r.mime_type, size: r.size_bytes, source: "cloud" });
      }
    } catch { /* ignore */ }

    // 3) Featured/body images discovered inside imported_posts — surfaces
    // media that was imported with content but never catalogued in media_meta.
    try {
      const { data } = await cloudT("imported_posts")
        .select("id,title,featured_image_url,body")
        .order("updated_at", { ascending: false })
        .limit(500);
      const urlRe = /https?:\/\/[^\s"'<>()]+\.(?:png|jpe?g|gif|webp|svg|avif)(?:\?[^\s"'<>()]*)?/gi;
      for (const r of (data as any[]) || []) {
        const urls = new Set<string>();
        if (r.featured_image_url) urls.add(r.featured_image_url);
        if (typeof r.body === "string") {
          for (const m of r.body.matchAll(urlRe)) urls.add(m[0]);
        }
        for (const u of urls) {
          const name = u.split("/").pop()?.split("?")[0] || "image";
          next.push({ id: `i:${r.id}:${u}`, url: u, name, mime: "image/*", source: "cloud" });
        }
      }
    } catch { /* ignore */ }

    // 4) Anything sitting in the post-images bucket that nobody catalogued.
    try {
      const { data: entries } = await cloud.storage.from("post-images")
        .list("", { limit: 200, sortBy: { column: "created_at", order: "desc" } });
      for (const e of entries || []) {
        if (!(e as any).id) continue; // skip folders
        const { data: pub } = cloud.storage.from("post-images").getPublicUrl(e.name);
        next.push({ id: `s:${e.name}`, url: pub.publicUrl, name: e.name, mime: (e as any).metadata?.mimetype || "image/*", source: "cloud" });
      }
    } catch { /* ignore */ }

    // De-dupe by URL
    const seen = new Set<string>();
    setItems(next.filter((i) => (seen.has(i.url) ? false : (seen.add(i.url), true))));
    setLoading(false);
  };

  useEffect(() => { if (open) void load(); /* eslint-disable-next-line */ }, [open, siteId]);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const path = `picker/${siteId || "unknown"}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
      const { error } = await cloud.storage.from("post-images").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = cloud.storage.from("post-images").getPublicUrl(path);
      const url = data.publicUrl;
      await cloudT("media_meta").insert({
        site_id: siteId,
        media_url: url,
        file_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        source: "cloud",
      });
      // Mirror to parent for cross-site discovery (best-effort)
      try {
        await parentT("media_library").insert({
          site_id: siteId,
          file_url: url,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
        });
      } catch { /* ignore — parent may have stricter perms */ }
      toast.success("Uploaded");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const filtered = items.filter((i) =>
    !q || (i.name || "").toLowerCase().includes(q.toLowerCase()) || i.url.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search media…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
          </div>
          <input ref={fileRef} type="file" accept={accept ? `${accept}*` : undefined} className="hidden"
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          <Button variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />} Upload
          </Button>
        </div>

        <Tabs defaultValue="all" className="flex-1 overflow-hidden flex flex-col">
          <TabsList>
            <TabsTrigger value="all">All ({filtered.length})</TabsTrigger>
            <TabsTrigger value="cloud">This site</TabsTrigger>
            <TabsTrigger value="parent">Shared</TabsTrigger>
          </TabsList>
          {(["all", "cloud", "parent"] as const).map((scope) => (
            <TabsContent key={scope} value={scope} className="flex-1 overflow-auto">
              {loading ? (
                <div className="text-sm text-muted-foreground p-6">Loading…</div>
              ) : (
                <div className="grid grid-cols-3 md:grid-cols-5 gap-2 p-1">
                  {filtered.filter((i) => scope === "all" || i.source === scope).map((it) => (
                    <button
                      key={it.id}
                      onClick={() => { onPick(it); onOpenChange(false); }}
                      className="group relative border rounded-lg overflow-hidden hover:ring-2 hover:ring-primary text-left"
                    >
                      {it.mime?.startsWith("image/") || !it.mime ? (
                        <img src={it.url} alt={it.name} className="w-full h-24 object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-24 bg-muted flex items-center justify-center text-xs text-muted-foreground p-2 text-center">
                          {it.mime}
                        </div>
                      )}
                      <div className="p-1.5 text-[10px] truncate bg-background">{it.name}</div>
                      <span className="absolute top-1 right-1 text-[9px] px-1.5 rounded bg-black/60 text-white">{it.source}</span>
                    </button>
                  ))}
                  {filtered.length === 0 && (
                    <div className="col-span-full text-sm text-muted-foreground p-6 text-center">No media. Upload some above.</div>
                  )}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        <DialogFooter>
          <Button variant="ghost" asChild>
            <a href="/admin/media" target="_blank" rel="noopener noreferrer"><ExternalLink className="w-4 h-4 mr-1" /> Open library</a>
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
