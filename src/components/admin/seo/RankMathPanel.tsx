// Rank Math-style SEO side panel with tabs: General, Advanced, Schema, Social.
// Active tab shows icon + label, inactive tabs show icon only.
// General tab includes Edit Snippet (opens modal), Focus Keyword,
// Pillar toggle, Basic SEO / Additional / Title Readability /
// Content Readability accordions powered by the SEO scoring engine.

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Settings, ShieldCheck, Database, Share2, CheckCircle2, XCircle, Sparkles, Pencil, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import SnippetEditorModal from "./SnippetEditorModal";
import type { PostSeo } from "@/lib/postSeo";
import { scoreSeo, type Check } from "@/lib/seoScoring";

type Tab = "general" | "advanced" | "schema" | "social";
const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "general", label: "General", icon: Settings },
  { id: "advanced", label: "Advanced", icon: ShieldCheck },
  { id: "schema", label: "Schema", icon: Database },
  { id: "social", label: "Social", icon: Share2 },
];

const SCHEMA_TYPES = ["Article", "BlogPosting", "NewsArticle", "Product", "FAQPage", "HowTo", "Event", "LocalBusiness", "Recipe", "Course"];

export type RankMathContext = {
  title: string;
  slug: string;
  excerpt: string;
  html: string;
  featured_image?: string | null;
  url: string; // absolute or path
};

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  seo: PostSeo;
  onChange: (next: PostSeo) => void;
  ctx: RankMathContext;
  siteUrl?: string;
};

const CheckRow = ({ c }: { c: Check }) => (
  <div className="flex items-start gap-2 py-1.5">
    {c.passed ? <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" /> : <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />}
    <div className="flex-1 text-sm">
      <div className={cn(!c.passed && "text-foreground")}>{c.label}</div>
      {c.detail && <div className="text-xs text-muted-foreground">{c.detail}</div>}
    </div>
  </div>
);

const focusInTitle = (kw: string, title: string) => !!kw && title.toLowerCase().includes(kw.toLowerCase());
const focusInDesc = (kw: string, d: string) => !!kw && d.toLowerCase().includes(kw.toLowerCase());
const focusInUrl = (kw: string, slug: string) => !!kw && slug.toLowerCase().includes(kw.toLowerCase().replace(/\s+/g, "-"));
const focusInHeadings = (kw: string, html: string) => !!kw && new RegExp(`<h[1-6][^>]*>[^<]*${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^<]*</h[1-6]>`, "i").test(html);
const focusInFirst10 = (kw: string, text: string) => {
  if (!kw) return false;
  const slice = text.slice(0, Math.max(120, Math.floor(text.length * 0.1)));
  return slice.toLowerCase().includes(kw.toLowerCase());
};

export default function RankMathPanel({ open, onOpenChange, seo, onChange, ctx, siteUrl }: Props) {
  const [tab, setTab] = useState<Tab>("general");
  const [snippetOpen, setSnippetOpen] = useState(false);

  const set = <K extends keyof PostSeo>(k: K, v: PostSeo[K]) => onChange({ ...seo, [k]: v });

  const effTitle = (seo.seo_title || ctx.title || "").trim();
  const effDesc = (seo.seo_description || ctx.excerpt || "").trim();
  const kw = (seo.focus_keyword || "").trim();
  const text = (ctx.html || "").replace(/<[^>]+>/g, " ");

  const seoResult = scoreSeo({
    url: ctx.url, title: effTitle, description: effDesc, slug: ctx.slug,
    html: ctx.html, canonical: seo.canonical_url || ctx.url, ogImage: ctx.featured_image || seo.social.og_image,
  });

  // Rank Math-style focused checks
  const basic: Check[] = [
    { id: "kw-title", label: "Focus keyword in SEO title", weight: 5, passed: focusInTitle(kw, effTitle) },
    { id: "kw-desc", label: "Focus keyword in meta description", weight: 5, passed: focusInDesc(kw, effDesc) },
    { id: "kw-url", label: "Focus keyword in URL", weight: 3, passed: focusInUrl(kw, ctx.slug) },
    { id: "kw-first", label: "Focus keyword in first 10% of content", weight: 3, passed: focusInFirst10(kw, text) },
    { id: "kw-length", label: "Content length is sufficient", weight: 3, passed: text.trim().split(/\s+/).filter(Boolean).length >= 600 },
  ];
  const additional: Check[] = [
    { id: "kw-h", label: "Focus keyword in subheading(s)", weight: 3, passed: focusInHeadings(kw, ctx.html) },
    { id: "kw-img", label: "An image alt contains focus keyword", weight: 3, passed: !!kw && new RegExp(`alt=["'][^"']*${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^"']*["']`, "i").test(ctx.html) },
    { id: "density", label: "Keyword density 0.5–2.5%", weight: 3, passed: (() => {
      if (!kw) return false;
      const wc = text.split(/\s+/).filter(Boolean).length || 1;
      const m = text.toLowerCase().match(new RegExp(kw.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"));
      const d = ((m?.length || 0) / wc) * 100;
      return d >= 0.5 && d <= 2.5;
    })() },
    { id: "url-len", label: "URL is short and clean", weight: 2, passed: ctx.slug.length > 0 && ctx.slug.length <= 75 && /^[a-z0-9-]+$/.test(ctx.slug) },
    { id: "external", label: "Linking to external resources", weight: 2, passed: /<a\b[^>]*\shref=["']https?:/i.test(ctx.html) },
    { id: "internal", label: "Linking to internal resources", weight: 2, passed: /<a\b[^>]*\shref=["']\//i.test(ctx.html) },
    { id: "unique-kw", label: "Focus keyword not used before", weight: 1, passed: true },
  ];
  const titleRead: Check[] = [
    { id: "t-num", label: "Title contains a number (e.g. \"10 best\")", weight: 2, passed: /\d/.test(effTitle) },
    { id: "t-power", label: "Title uses a power word", weight: 2, passed: /(best|ultimate|essential|guide|complete|proven|easy|quick)/i.test(effTitle) },
    { id: "t-sentiment", label: "Title has a positive or negative sentiment", weight: 2, passed: /(great|amazing|worst|best|love|hate|terrible|perfect)/i.test(effTitle) },
  ];
  const sentences = (text.match(/[^.!?]+[.!?]/g) || []).filter((s) => s.trim().length > 0);
  const avg = sentences.length ? Math.round(sentences.reduce((a, s) => a + s.split(/\s+/).length, 0) / sentences.length) : 0;
  const contentRead: Check[] = [
    { id: "r-sent", label: "Average sentence length is reasonable", weight: 3, passed: avg > 0 && avg <= 22, detail: `${avg} words/sentence` },
    { id: "r-para", label: "Paragraphs short enough (<150 words)", weight: 2, passed: !(ctx.html.match(/<p[^>]*>([\s\S]{900,}?)<\/p>/gi) || []).length },
    { id: "r-tldr", label: "Has a TL;DR / short answer block", weight: 1, passed: /(tl;dr|tldr|in short|quick answer)/i.test(text) },
  ];

  const tabBtn = (t: typeof TABS[number]) => {
    const Icon = t.icon;
    const active = tab === t.id;
    return (
      <button
        key={t.id}
        type="button"
        onClick={() => setTab(t.id)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-2 text-sm border-b-2 transition-colors",
          active ? "border-blue-500 text-blue-600" : "border-transparent text-muted-foreground hover:text-foreground",
        )}
      >
        <Icon className="w-4 h-4" />
        {active && <span>{t.label}</span>}
      </button>
    );
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0">
          <SheetHeader className="px-4 py-3 border-b flex flex-row items-center justify-between space-y-0">
            <SheetTitle className="text-base flex items-center gap-2">
              Rank Math
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            </SheetTitle>
          </SheetHeader>

          <div className="border-b flex items-center gap-1 px-2">{TABS.map(tabBtn)}</div>

          <div className="p-4 space-y-4">
            {tab === "general" && (
              <>
                {/* Preview */}
                <div>
                  <div className="text-xs font-medium mb-2">Preview</div>
                  <div className="border rounded-md p-3 bg-white text-sm">
                    <div className="text-xs text-gray-600 truncate">{(siteUrl || "").replace(/\/+$/, "")}/{ctx.slug}</div>
                    <div className="text-[#1a0dab] text-base truncate">{effTitle || ctx.title || "Title"}</div>
                    <div className="text-xs text-[#4d5156] line-clamp-2 mt-1">{effDesc || "Description preview…"}</div>
                  </div>
                  <Button size="sm" className="mt-2 bg-blue-500 hover:bg-blue-600" onClick={() => setSnippetOpen(true)}>
                    <Pencil className="w-3.5 h-3.5 mr-1" /> Edit Snippet
                  </Button>
                </div>

                {/* Focus keyword */}
                <div>
                  <label className="text-xs font-medium flex items-center gap-1">
                    Focus Keyword
                    <Button size="sm" variant="outline" className="h-6 text-[10px] ml-auto" disabled>
                      <Sparkles className="w-3 h-3 mr-1" /> Content AI
                    </Button>
                  </label>
                  <div className="bg-orange-100 border border-orange-300 rounded-md mt-1 px-3 py-2 flex items-center gap-2">
                    <Star className="w-3.5 h-3.5 text-orange-500" />
                    <input
                      className="flex-1 bg-transparent text-sm outline-none placeholder:text-orange-400"
                      value={kw}
                      onChange={(e) => set("focus_keyword", e.target.value)}
                      placeholder="Example: rank math seo"
                    />
                  </div>
                </div>

                {/* Pillar */}
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={!!seo.pillar} onCheckedChange={(v) => set("pillar", !!v)} />
                  This post is Pillar Content
                </label>

                {/* Basic SEO accordion */}
                <Accordion type="multiple" defaultValue={["basic"]} className="border rounded-md">
                  <AccordionItem value="basic">
                    <AccordionTrigger className="px-3 py-2 text-sm">
                      Basic SEO <span className="ml-2 text-xs text-red-500">{basic.filter((c) => !c.passed).length} Errors</span>
                    </AccordionTrigger>
                    <AccordionContent className="px-3 pb-2">{basic.map((c) => <CheckRow key={c.id} c={c} />)}</AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="add">
                    <AccordionTrigger className="px-3 py-2 text-sm">
                      Additional <span className="ml-2 text-xs text-red-500">{additional.filter((c) => !c.passed).length} Errors</span>
                    </AccordionTrigger>
                    <AccordionContent className="px-3 pb-2">{additional.map((c) => <CheckRow key={c.id} c={c} />)}</AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="title">
                    <AccordionTrigger className="px-3 py-2 text-sm">
                      Title Readability <span className="ml-2 text-xs text-red-500">{titleRead.filter((c) => !c.passed).length} Errors</span>
                    </AccordionTrigger>
                    <AccordionContent className="px-3 pb-2">{titleRead.map((c) => <CheckRow key={c.id} c={c} />)}</AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="content">
                    <AccordionTrigger className="px-3 py-2 text-sm">
                      Content Readability <span className="ml-2 text-xs text-green-600">All Good</span>
                    </AccordionTrigger>
                    <AccordionContent className="px-3 pb-2">{contentRead.map((c) => <CheckRow key={c.id} c={c} />)}</AccordionContent>
                  </AccordionItem>
                </Accordion>

                <div className="text-xs text-muted-foreground border-t pt-2">Overall SEO score: <b>{seoResult.score} / 100</b></div>
              </>
            )}

            {tab === "advanced" && (
              <>
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Robots Meta</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {([
                      ["index", "Index"],
                      ["follow", "Follow"],
                      ["archive", "Archive"],
                      ["imageindex", "Image Index"],
                      ["snippet", "Snippet"],
                    ] as const).map(([k, lbl]) => (
                      <label key={k} className="flex items-center gap-2">
                        <Switch checked={(seo.robots as any)[k]} onCheckedChange={(v) => set("robots", { ...seo.robots, [k]: v })} />
                        {lbl}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium">Canonical URL</label>
                  <Input value={seo.canonical_url || ""} onChange={(e) => set("canonical_url", e.target.value)} placeholder="Leave empty to use default" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs">Max Snippet</label>
                    <Input type="number" value={seo.robots.max_snippet} onChange={(e) => set("robots", { ...seo.robots, max_snippet: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="text-xs">Max Image</label>
                    <Select value={seo.robots.max_image_preview} onValueChange={(v: any) => set("robots", { ...seo.robots, max_image_preview: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">none</SelectItem>
                        <SelectItem value="standard">standard</SelectItem>
                        <SelectItem value="large">large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs">Max Video</label>
                    <Input type="number" value={seo.robots.max_video_preview} onChange={(e) => set("robots", { ...seo.robots, max_video_preview: Number(e.target.value) })} />
                  </div>
                </div>
              </>
            )}

            {tab === "schema" && (
              <SchemaTab seo={seo} ctx={ctx} onChange={(next) => onChange({ ...seo, schema_json: next })} />
            )}

            {tab === "social" && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Facebook</h3>
                <Input placeholder="Custom title" value={seo.social.og_title || ""} onChange={(e) => set("social", { ...seo.social, og_title: e.target.value })} />
                <Textarea rows={2} placeholder="Custom description" value={seo.social.og_description || ""} onChange={(e) => set("social", { ...seo.social, og_description: e.target.value })} />
                <Input placeholder="Image URL" value={seo.social.og_image || ""} onChange={(e) => set("social", { ...seo.social, og_image: e.target.value })} />
                <h3 className="text-sm font-semibold pt-2">Twitter / X</h3>
                <Input placeholder="Custom title" value={seo.social.twitter_title || ""} onChange={(e) => set("social", { ...seo.social, twitter_title: e.target.value })} />
                <Textarea rows={2} placeholder="Custom description" value={seo.social.twitter_description || ""} onChange={(e) => set("social", { ...seo.social, twitter_description: e.target.value })} />
                <Input placeholder="Image URL" value={seo.social.twitter_image || ""} onChange={(e) => set("social", { ...seo.social, twitter_image: e.target.value })} />
                <Select value={seo.social.twitter_card} onValueChange={(v: any) => set("social", { ...seo.social, twitter_card: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="summary">summary</SelectItem>
                    <SelectItem value="summary_large_image">summary_large_image</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <SnippetEditorModal
        open={snippetOpen}
        onOpenChange={setSnippetOpen}
        siteUrl={siteUrl || (typeof window !== "undefined" ? window.location.origin : "")}
        slug={ctx.slug}
        fallbackTitle={ctx.title}
        fallbackDescription={ctx.excerpt}
        title={seo.seo_title || ""}
        description={seo.seo_description || ""}
        onChangeTitle={(v) => set("seo_title", v)}
        onChangeSlug={() => {/* slug edited in main form */}}
        onChangeDescription={(v) => set("seo_description", v)}
        social={seo.social}
        onChangeSocial={(s) => set("social", s)}
      />
    </>
  );
}

function SchemaTab({ seo, ctx, onChange }: { seo: PostSeo; ctx: RankMathContext; onChange: (s: any[]) => void }) {
  const items = seo.schema_json || [];
  const add = (type: string) => {
    const base: any = {
      "@context": "https://schema.org",
      "@type": type,
      headline: ctx.title,
      url: ctx.url,
    };
    if (type === "FAQPage") base.mainEntity = [{ "@type": "Question", name: "Sample question?", acceptedAnswer: { "@type": "Answer", text: "Sample answer." } }];
    onChange([...items, base]);
  };
  const remove = (i: number) => onChange(items.filter((_, x) => x !== i));
  const update = (i: number, v: string) => {
    try { const parsed = JSON.parse(v); onChange(items.map((it, x) => (x === i ? parsed : it))); } catch { /* ignore */ }
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Select onValueChange={add}>
          <SelectTrigger><SelectValue placeholder="Add schema type…" /></SelectTrigger>
          <SelectContent>{SCHEMA_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {!items.length && <p className="text-xs text-muted-foreground">No schema attached. Pick a type above to add structured data.</p>}
      {items.map((it: any, i: number) => (
        <div key={i} className="border rounded-md">
          <div className="flex items-center justify-between px-3 py-2 bg-muted/30">
            <span className="text-sm font-medium">{it?.["@type"] || "Schema"}</span>
            <Button size="sm" variant="ghost" onClick={() => remove(i)}>Remove</Button>
          </div>
          <Textarea rows={8} className="font-mono text-xs border-0 rounded-none" defaultValue={JSON.stringify(it, null, 2)} onBlur={(e) => update(i, e.target.value)} />
        </div>
      ))}
    </div>
  );
}
