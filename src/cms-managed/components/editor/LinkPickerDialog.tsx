// Inline link picker for the TipTap editor.
// Search across imported_posts (title/slug) and offer a custom URL.
// Returns { href, target } to be applied as a link mark.

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Search, Link as LinkIcon, ExternalLink, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Hit = { id: string; title: string; slug: string; type: string | null };

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialHref?: string;
  initialTarget?: string;
  onApply: (href: string, target: string | null) => void;
  onRemove?: () => void;
};

export default function LinkPickerDialog({ open, onOpenChange, initialHref = "", initialTarget = "", onApply, onRemove }: Props) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [href, setHref] = useState(initialHref);
  const [newTab, setNewTab] = useState(initialTarget === "_blank");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (open) { setHref(initialHref); setNewTab(initialTarget === "_blank"); setQ(""); setHits([]); } }, [open, initialHref, initialTarget]);

  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (term.length < 2) { setHits([]); return; }
    let cancel = false;
    setLoading(true);
    const t = setTimeout(async () => {
      const { data } = await (supabase.from("imported_posts") as any)
        .select("id,title,slug,type")
        .or(`title.ilike.%${term}%,slug.ilike.%${term}%`)
        .limit(12);
      if (!cancel) { setHits((data as Hit[]) || []); setLoading(false); }
    }, 220);
    return () => { cancel = true; clearTimeout(t); };
  }, [q, open]);

  const apply = () => {
    if (!href.trim()) return;
    onApply(href.trim(), newTab ? "_blank" : null);
    onOpenChange(false);
  };

  const hrefForSlug = (h: Hit) => (h.type === "page" ? `/${h.slug}` : `/blog/${h.slug}`);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><LinkIcon className="w-4 h-4" /> Insert link</DialogTitle></DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">URL or path</Label>
            <Input value={href} onChange={(e) => setHref(e.target.value)} placeholder="https://… or /about" autoFocus />
          </div>

          <div className="flex items-center justify-between border rounded p-2 text-sm">
            <span className="flex items-center gap-2"><ExternalLink className="w-4 h-4" /> Open in a new tab</span>
            <Switch checked={newTab} onCheckedChange={setNewTab} />
          </div>

          <div>
            <Label className="text-xs">Search internal content</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type to search posts and pages…" className="pl-8" />
            </div>
            <div className="mt-2 max-h-56 overflow-auto rounded border divide-y">
              {loading && <div className="p-3 text-xs text-muted-foreground">Searching…</div>}
              {!loading && q.length >= 2 && hits.length === 0 && <div className="p-3 text-xs text-muted-foreground">No matches.</div>}
              {hits.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  className="w-full text-left p-2 hover:bg-muted transition-colors flex items-center justify-between gap-2"
                  onClick={() => setHref(hrefForSlug(h))}
                >
                  <div className="min-w-0">
                    <div className="text-sm truncate">{h.title || h.slug}</div>
                    <div className="text-xs text-muted-foreground truncate">{hrefForSlug(h)}</div>
                  </div>
                  <span className="text-[10px] uppercase text-muted-foreground px-1.5 py-0.5 border rounded">{h.type || "post"}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          {onRemove && initialHref && (
            <Button type="button" variant="ghost" onClick={() => { onRemove(); onOpenChange(false); }} className="mr-auto text-destructive">
              <Trash2 className="w-4 h-4 mr-1" /> Remove link
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={apply} disabled={!href.trim()}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
