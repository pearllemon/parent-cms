// Rank Math-style "Edit Snippet" popup. Live Google preview, character
// counters, mobile/desktop toggle, Generate-With-AI hook (stub callback).

import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Monitor, Smartphone, Sparkles, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  siteUrl: string;
  slug: string;
  fallbackTitle: string;
  fallbackDescription: string;
  title: string;
  description: string;
  onChangeTitle: (v: string) => void;
  onChangeSlug: (v: string) => void;
  onChangeDescription: (v: string) => void;
  social?: any;
  onChangeSocial?: (s: any) => void;
  onGenerateAI?: () => void;
};

const meter = (len: number, min: number, max: number) => {
  if (!len) return { color: "bg-gray-300", pct: 0 };
  if (len < min) return { color: "bg-orange-500", pct: Math.min(100, (len / max) * 100) };
  if (len > max) return { color: "bg-red-500", pct: 100 };
  return { color: "bg-green-500", pct: Math.min(100, (len / max) * 100) };
};

const Meter = ({ len, min, max }: { len: number; min: number; max: number }) => {
  const m = meter(len, min, max);
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="tabular-nums">{len} / {max}</span>
      <div className="w-32 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full transition-all", m.color)} style={{ width: `${m.pct}%` }} />
      </div>
    </div>
  );
};

export default function SnippetEditorModal(p: Props) {
  const [tab, setTab] = useState<"general" | "social">("general");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  const effTitle = (p.title || p.fallbackTitle || "").trim();
  const effDesc = (p.description || p.fallbackDescription || "").trim();
  const fullUrl = useMemo(() => `${p.siteUrl.replace(/\/+$/, "")}/${(p.slug || "").replace(/^\/+/, "")}`, [p.siteUrl, p.slug]);

  return (
    <Dialog open={p.open} onOpenChange={p.onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preview Snippet Editor</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mt-2">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="social">
              <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5 text-red-500" /> Social</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">{device === "desktop" ? "Desktop" : "Mobile"} Preview</div>
              <div className="flex items-center gap-2">
                {p.onGenerateAI && (
                  <Button size="sm" onClick={p.onGenerateAI} className="bg-blue-500 hover:bg-blue-600">
                    <Sparkles className="w-3.5 h-3.5 mr-1" /> Generate With AI
                  </Button>
                )}
                <div className="flex border rounded-md overflow-hidden">
                  <button type="button" onClick={() => setDevice("desktop")}
                    className={cn("p-1.5", device === "desktop" ? "bg-muted" : "")}>
                    <Monitor className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => setDevice("mobile")}
                    className={cn("p-1.5", device === "mobile" ? "bg-muted" : "")}>
                    <Smartphone className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Google SERP preview */}
            <div className={cn("border rounded-lg p-4 bg-white", device === "mobile" && "max-w-sm")}>
              <div className="text-xs text-gray-600 break-all">{fullUrl}</div>
              <div className="text-[#1a0dab] text-lg leading-tight mt-0.5 hover:underline cursor-pointer">
                {effTitle || "Your SEO title appears here"}
              </div>
              <div className="text-sm text-[#4d5156] mt-1 leading-snug">
                {effDesc || "Your meta description preview appears here. Aim for 70–160 characters."}
              </div>
            </div>

            <div className="space-y-3 bg-muted/30 rounded-lg p-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Title</label>
                  <Meter len={effTitle.length} min={30} max={60} />
                </div>
                <Input value={p.title} onChange={(e) => p.onChangeTitle(e.target.value)} placeholder={p.fallbackTitle} />
                <p className="text-xs text-muted-foreground">First line shown in search results.</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Permalink</label>
                  <Meter len={(p.slug || "").length} min={1} max={75} />
                </div>
                <Input value={p.slug} onChange={(e) => p.onChangeSlug(e.target.value)} />
                <p className="text-xs text-muted-foreground">Unique URL of the page.</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Description</label>
                  <Meter len={effDesc.length} min={70} max={160} />
                </div>
                <Textarea rows={3} value={p.description} onChange={(e) => p.onChangeDescription(e.target.value)} placeholder={p.fallbackDescription} />
                <p className="text-xs text-muted-foreground">Appears below the title in search results.</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="social" className="space-y-4 pt-4">
            <SocialEditor social={p.social} onChange={p.onChangeSocial} fallbackTitle={effTitle} fallbackDescription={effDesc} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function SocialEditor({
  social, onChange, fallbackTitle, fallbackDescription,
}: { social: any; onChange?: (s: any) => void; fallbackTitle: string; fallbackDescription: string }) {
  const s = social || {};
  const set = (k: string, v: any) => onChange?.({ ...s, [k]: v });
  const ogT = s.og_title || fallbackTitle;
  const ogD = s.og_description || fallbackDescription;
  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden bg-white">
        {s.og_image ? <img src={s.og_image} alt="" className="w-full h-48 object-cover" /> :
          <div className="w-full h-48 bg-gradient-to-br from-blue-100 to-indigo-100 grid place-items-center text-blue-400 text-sm">No social image set</div>}
        <div className="p-3">
          <div className="text-xs text-gray-500 uppercase">facebook.com</div>
          <div className="text-base font-medium">{ogT}</div>
          <div className="text-sm text-gray-600">{ogD}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs">Facebook title</label><Input value={s.og_title || ""} onChange={(e) => set("og_title", e.target.value)} placeholder={fallbackTitle} /></div>
        <div><label className="text-xs">Image URL</label><Input value={s.og_image || ""} onChange={(e) => set("og_image", e.target.value)} placeholder="https://…" /></div>
      </div>
      <div><label className="text-xs">Facebook description</label><Textarea rows={2} value={s.og_description || ""} onChange={(e) => set("og_description", e.target.value)} placeholder={fallbackDescription} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs">Twitter title</label><Input value={s.twitter_title || ""} onChange={(e) => set("twitter_title", e.target.value)} placeholder={fallbackTitle} /></div>
        <div><label className="text-xs">Twitter image</label><Input value={s.twitter_image || ""} onChange={(e) => set("twitter_image", e.target.value)} placeholder="https://…" /></div>
      </div>
      <div><label className="text-xs">Twitter description</label><Textarea rows={2} value={s.twitter_description || ""} onChange={(e) => set("twitter_description", e.target.value)} placeholder={fallbackDescription} /></div>
    </div>
  );
}
