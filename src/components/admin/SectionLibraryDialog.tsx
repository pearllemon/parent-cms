// Section Library — browse pre-built sections from the parent management
// project + this site's local library, then drop them into the page.

import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Search, Upload, CheckCircle2, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";
import { listSections, submitSectionToParent, type SectionTemplate } from "@/lib/sectionLibrary";

type Props = {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  onInsert: (blocks: any[]) => void;
  siteId?: string | null;
};

const CATEGORIES = ["all", "hero", "testimonials", "cta", "faq", "pricing", "gallery", "blog", "footer", "general"];

export default function SectionLibraryDialog({ open, onOpenChange, onInsert, siteId }: Props) {
  const [items, setItems] = useState<SectionTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    try { setItems(await listSections(siteId || null)); }
    catch (e: any) { toast.error(e?.message || "Failed to load sections"); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (open) void load(); /* eslint-disable-next-line */ }, [open, siteId]);

  const filtered = useMemo(() => items.filter((s) =>
    (cat === "all" || s.category === cat) &&
    (!q || s.name.toLowerCase().includes(q.toLowerCase()) || (s.description || "").toLowerCase().includes(q.toLowerCase())),
  ), [items, q, cat]);

  const submit = async (s: SectionTemplate) => {
    try { await submitSectionToParent(s); toast.success("Submitted for approval"); load(); }
    catch (e: any) { toast.error(e?.message || "Submit failed"); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Section library</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search sections…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refresh"}
          </Button>
        </div>

        <Tabs value={cat} onValueChange={setCat} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="flex-wrap h-auto">
            {CATEGORIES.map((c) => <TabsTrigger key={c} value={c} className="text-xs capitalize">{c}</TabsTrigger>)}
          </TabsList>

          <TabsContent value={cat} className="flex-1 overflow-auto mt-2">
            {loading ? (
              <div className="text-sm text-muted-foreground p-6">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="text-sm text-muted-foreground p-12 text-center">
                No sections yet. Use <strong>Save as section</strong> from the editor toolbar to add the first one.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-1">
                {filtered.map((s) => (
                  <div key={s.id} className="border rounded-lg overflow-hidden hover:ring-2 hover:ring-primary group bg-card">
                    <button
                      type="button"
                      onClick={() => onInsert(s.blocks || [])}
                      className="w-full text-left"
                      title="Insert into page"
                    >
                      <div className="aspect-video bg-muted relative">
                        {s.thumbnail_url ? (
                          <img src={s.thumbnail_url} alt={s.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                            {Array.isArray(s.blocks) ? s.blocks.length : 0} block{(s.blocks?.length ?? 0) === 1 ? "" : "s"}
                          </div>
                        )}
                        <Badge variant="secondary" className="absolute top-2 right-2 text-[10px]">{s.source}</Badge>
                      </div>
                      <div className="p-2">
                        <div className="text-sm font-medium truncate">{s.name}</div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <span className="capitalize">{s.category}</span>
                          <span>·</span>
                          {s.status === "approved" && <><CheckCircle2 className="w-3 h-3 text-green-600" /> approved</>}
                          {s.status === "pending" && <><Clock className="w-3 h-3 text-amber-600" /> pending</>}
                          {s.status === "rejected" && <><XCircle className="w-3 h-3 text-red-600" /> rejected</>}
                          {s.status === "draft" && <span>draft</span>}
                        </div>
                      </div>
                    </button>
                    {s.source === "local" && s.status === "draft" && (
                      <div className="px-2 pb-2">
                        <Button size="sm" variant="outline" className="w-full h-7 text-xs"
                          onClick={(e) => { e.stopPropagation(); submit(s); }}>
                          <Upload className="w-3 h-3 mr-1" /> Submit to parent
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}