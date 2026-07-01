// Admin: SEO / GEO / AEO audit dashboard.
//
// Lists all known content (CMS posts + imported posts + static routes
// + services + pages) and computes 3 scores per item plus a combined
// score. Clicking an item opens a per-page panel with:
//   - Full audit breakdown (SEO, GEO, AEO checks)
//   - Live editable title/description/og:image overrides
//   - Social previews (Google, Facebook, X, LinkedIn)
//   - JSON-LD inspector
//
// All computation runs client-side using src/lib/seoScoring.ts.

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { supabase as parent } from "@/lib/parent";
import { useSiteConfig } from "@/providers/SiteProvider";
import { services } from "@/data/services";
import { scoreAll, type PageInput, type ScoreResult, type Check } from "@/lib/seoScoring";
import { GooglePreview, FacebookPreview, TwitterPreview, LinkedInPreview } from "@/components/admin/SocialPreviews";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, CheckCircle2, RefreshCcw, XCircle } from "lucide-react";

type Item = {
  key: string;
  url: string;
  source: "static" | "service" | "cms" | "imported";
  type: string;
  title: string;
  description: string;
  slug: string;
  html: string;
  ogImage?: string | null;
  canonical?: string | null;
  schema?: any;
  updated_at?: string | null;
};

const STATIC_ROUTES = [
  { path: "/", title: "Home", type: "static" },
  { path: "/about", title: "About", type: "static" },
  { path: "/blog", title: "Blog", type: "static" },
  { path: "/contact", title: "Contact", type: "static" },
  { path: "/book-a-call", title: "Book a Call", type: "static" },
  { path: "/press-and-media", title: "Press", type: "static" },
  { path: "/books", title: "Books", type: "static" },
  { path: "/privacy", title: "Privacy", type: "static" },
  { path: "/terms", title: "Terms", type: "static" },
];

const baseUrlDefault = typeof window !== "undefined" ? window.location.origin : "";

const combined = (s: { seo: ScoreResult; geo: ScoreResult; aeo: ScoreResult }) =>
  Math.round((s.seo.score + s.geo.score + s.aeo.score) / 3);

const gradeColor = (g: ScoreResult["grade"]) =>
  g === "A" ? "bg-green-500/15 text-green-600" :
  g === "B" ? "bg-emerald-500/15 text-emerald-600" :
  g === "C" ? "bg-yellow-500/15 text-yellow-700" :
  g === "D" ? "bg-orange-500/15 text-orange-600" :
  "bg-red-500/15 text-red-600";

export default function AdminSeoAudit() {
  const { config } = useSiteConfig();
  const [baseUrl, setBaseUrl] = useState(baseUrlDefault);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [overrides, setOverrides] = useState<Record<string, { title?: string; description?: string; ogImage?: string }>>({});

  const load = async () => {
    setLoading(true);
    const next: Item[] = [];
    for (const r of STATIC_ROUTES) {
      next.push({
        key: `static:${r.path}`, url: r.path, source: "static", type: "static",
        title: r.title, description: "", slug: r.path.slice(1) || "home", html: "",
      });
    }
    for (const s of services) {
      next.push({
        key: `service:${s.slug}`, url: `/services/${s.slug}`, source: "service", type: "service",
        title: s.title, description: (s as any).description || (s as any).excerpt || "", slug: s.slug, html: "",
      });
    }
    if (config?.site?.id) {
      const { data } = await parent
        .from("posts")
        .select("slug,title,excerpt,seo_title,seo_description,og_image,body,type,updated_at,status,schema_json,canonical")
        .eq("site_id", config.site.id)
        .eq("status", "published")
        .limit(2000);
      for (const r of (data || []) as any[]) {
        const path = r.type === "page" ? `/p/${r.slug}` : `/blog/${r.slug}`;
        next.push({
          key: `cms:${r.slug}`, url: path, source: "cms", type: r.type || "post",
          title: r.seo_title || r.title || "", description: r.seo_description || r.excerpt || "",
          slug: r.slug, html: r.body || "", ogImage: r.og_image, canonical: r.canonical,
          schema: r.schema_json, updated_at: r.updated_at,
        });
      }
    }
    const { data: imp } = await supabase
      .from("imported_posts")
      .select("slug,title,excerpt,body,type,featured_image_url,updated_at")
      .limit(5000);
    for (const r of (imp || []) as any[]) {
      const path = r.type === "page" ? `/p/${r.slug}` : `/blog/${r.slug}`;
      next.push({
        key: `imp:${r.slug}`, url: path, source: "imported", type: r.type || "post",
        title: r.title || "", description: r.excerpt || "", slug: r.slug,
        html: r.body || "", ogImage: r.featured_image_url, updated_at: r.updated_at,
      });
    }
    setItems(next);
    setLoading(false);
  };

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [config?.site?.id]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("seoAuditOverrides");
      if (raw) setOverrides(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  const setOverride = (key: string, patch: { title?: string; description?: string; ogImage?: string }) => {
    setOverrides((cur) => {
      const next = { ...cur, [key]: { ...(cur[key] || {}), ...patch } };
      localStorage.setItem("seoAuditOverrides", JSON.stringify(next));
      return next;
    });
  };

  const enriched = useMemo(() => {
    return items.map((it) => {
      const o = overrides[it.key] || {};
      const merged: Item = {
        ...it,
        title: o.title ?? it.title,
        description: o.description ?? it.description,
        ogImage: o.ogImage ?? it.ogImage,
      };
      const input: PageInput = {
        url: `${baseUrl.replace(/\/+$/, "")}${merged.url}`,
        title: merged.title,
        description: merged.description,
        slug: merged.slug,
        html: merged.html,
        canonical: merged.canonical || `${baseUrl.replace(/\/+$/, "")}${merged.url}`,
        ogImage: merged.ogImage || null,
        schemaJson: merged.schema,
      };
      const scores = scoreAll(input);
      return { item: merged, input, scores, total: combined(scores) };
    });
  }, [items, overrides, baseUrl]);

  const filtered = useMemo(() => {
    const q = filter.toLowerCase();
    if (!q) return enriched;
    return enriched.filter(({ item }) => item.title.toLowerCase().includes(q) || item.url.toLowerCase().includes(q));
  }, [enriched, filter]);

  const summary = useMemo(() => {
    const n = enriched.length || 1;
    const seo = Math.round(enriched.reduce((a, e) => a + e.scores.seo.score, 0) / n);
    const geo = Math.round(enriched.reduce((a, e) => a + e.scores.geo.score, 0) / n);
    const aeo = Math.round(enriched.reduce((a, e) => a + e.scores.aeo.score, 0) / n);
    return { seo, geo, aeo, total: Math.round((seo + geo + aeo) / 3), count: enriched.length };
  }, [enriched]);

  const selected = selectedKey ? enriched.find((e) => e.item.key === selectedKey) : null;

  if (selected) return (
    <DetailView
      data={selected}
      baseUrl={baseUrl}
      onBack={() => setSelectedKey(null)}
      onOverride={(patch) => setOverride(selected.item.key, patch)}
    />
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display">SEO · GEO · AEO Audit</h1>
        <p className="text-sm text-muted-foreground">
          Per-page scoring for search engines, generative AI engines, and answer engines, with live social previews.
        </p>
      </div>

      <div className="grid md:grid-cols-4 gap-3">
        <SummaryCard label="Overall" value={summary.total} />
        <SummaryCard label="SEO (search engines)" value={summary.seo} />
        <SummaryCard label="GEO (AI engines)" value={summary.geo} />
        <SummaryCard label="AEO (answer engines)" value={summary.aeo} />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-64 space-y-1.5">
          <Label className="text-xs">Base URL</Label>
          <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
        </div>
        <div className="flex-1 min-w-64 space-y-1.5">
          <Label className="text-xs">Filter</Label>
          <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="title or url…" />
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Reload
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Page</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="text-center">SEO</TableHead>
              <TableHead className="text-center">GEO</TableHead>
              <TableHead className="text-center">AEO</TableHead>
              <TableHead className="text-center">Total</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(({ item, scores, total }) => (
              <TableRow key={item.key} className="cursor-pointer" onClick={() => setSelectedKey(item.key)}>
                <TableCell className="max-w-md">
                  <div className="font-medium truncate">{item.title || item.slug}</div>
                  <div className="text-xs text-muted-foreground truncate">{item.url}</div>
                </TableCell>
                <TableCell><Badge variant="outline">{item.source}</Badge></TableCell>
                <TableCell className="text-center"><ScoreBadge s={scores.seo} /></TableCell>
                <TableCell className="text-center"><ScoreBadge s={scores.geo} /></TableCell>
                <TableCell className="text-center"><ScoreBadge s={scores.aeo} /></TableCell>
                <TableCell className="text-center font-semibold">{total}</TableCell>
                <TableCell><Button variant="ghost" size="sm">Audit →</Button></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No content found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  const grade = value >= 90 ? "A" : value >= 75 ? "B" : value >= 60 ? "C" : value >= 40 ? "D" : "F";
  return (
    <div className="border rounded-lg p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="flex items-baseline gap-2 mt-1">
        <div className="text-3xl font-display">{value}</div>
        <Badge className={gradeColor(grade as any)}>{grade}</Badge>
      </div>
    </div>
  );
}

function ScoreBadge({ s }: { s: ScoreResult }) {
  return <Badge className={gradeColor(s.grade)}>{s.score} · {s.grade}</Badge>;
}

function DetailView({
  data, baseUrl, onBack, onOverride,
}: {
  data: { item: Item; input: PageInput; scores: { seo: ScoreResult; geo: ScoreResult; aeo: ScoreResult }; total: number };
  baseUrl: string;
  onBack: () => void;
  onOverride: (patch: { title?: string; description?: string; ogImage?: string }) => void;
}) {
  const { item, input, scores } = data;
  const fullUrl = `${baseUrl.replace(/\/+$/, "")}${item.url}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-2" /> All pages</Button>
        <Badge variant="outline">{item.source}</Badge>
      </div>

      <div>
        <h1 className="text-2xl font-display">{item.title || item.slug}</h1>
        <a href={fullUrl} target="_blank" rel="noreferrer" className="text-sm text-muted-foreground hover:underline">{fullUrl}</a>
      </div>

      <div className="grid md:grid-cols-4 gap-3">
        <SummaryCard label="Overall" value={Math.round((scores.seo.score + scores.geo.score + scores.aeo.score) / 3)} />
        <SummaryCard label="SEO" value={scores.seo.score} />
        <SummaryCard label="GEO" value={scores.geo.score} />
        <SummaryCard label="AEO" value={scores.aeo.score} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-3 border rounded-lg p-4">
          <h3 className="font-medium">Overrides (preview only)</h3>
          <div className="space-y-1.5">
            <Label className="text-xs">Title</Label>
            <Input defaultValue={item.title} onChange={(e) => onOverride({ title: e.target.value })} />
            <div className="text-xs text-muted-foreground">{(item.title || "").length} chars (target 30–60)</div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Meta description</Label>
            <Textarea defaultValue={item.description} onChange={(e) => onOverride({ description: e.target.value })} rows={3} />
            <div className="text-xs text-muted-foreground">{(item.description || "").length} chars (target 70–160)</div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">OG image URL</Label>
            <Input defaultValue={item.ogImage || ""} onChange={(e) => onOverride({ ogImage: e.target.value })} placeholder="https://…" />
          </div>
        </div>

        <Tabs defaultValue="google" className="border rounded-lg p-4">
          <h3 className="font-medium mb-3">Social previews</h3>
          <TabsList>
            <TabsTrigger value="google">Google</TabsTrigger>
            <TabsTrigger value="facebook">Facebook</TabsTrigger>
            <TabsTrigger value="twitter">X / Twitter</TabsTrigger>
            <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>
          </TabsList>
          <TabsContent value="google"><GooglePreview title={item.title} description={item.description} url={fullUrl} /></TabsContent>
          <TabsContent value="facebook"><FacebookPreview title={item.title} description={item.description} url={fullUrl} image={item.ogImage || undefined} /></TabsContent>
          <TabsContent value="twitter"><TwitterPreview title={item.title} description={item.description} url={fullUrl} image={item.ogImage || undefined} /></TabsContent>
          <TabsContent value="linkedin"><LinkedInPreview title={item.title} description={item.description} url={fullUrl} image={item.ogImage || undefined} /></TabsContent>
        </Tabs>
      </div>

      <Tabs defaultValue="seo">
        <TabsList>
          <TabsTrigger value="seo">SEO ({scores.seo.score})</TabsTrigger>
          <TabsTrigger value="geo">GEO ({scores.geo.score})</TabsTrigger>
          <TabsTrigger value="aeo">AEO ({scores.aeo.score})</TabsTrigger>
          <TabsTrigger value="schema">Schema</TabsTrigger>
        </TabsList>
        <TabsContent value="seo"><ChecksList checks={scores.seo.checks} /></TabsContent>
        <TabsContent value="geo"><ChecksList checks={scores.geo.checks} /></TabsContent>
        <TabsContent value="aeo"><ChecksList checks={scores.aeo.checks} /></TabsContent>
        <TabsContent value="schema">
          <pre className="text-xs bg-muted/40 rounded p-4 overflow-auto max-h-96">
            {input.schemaJson ? JSON.stringify(input.schemaJson, null, 2) : "No JSON-LD schema found for this page."}
          </pre>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ChecksList({ checks }: { checks: Check[] }) {
  return (
    <div className="space-y-2 mt-2">
      {checks.map((c) => (
        <div key={c.id} className="flex items-start gap-3 border rounded-md p-3">
          {c.passed ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />}
          <div className="flex-1">
            <div className="font-medium text-sm">{c.label}</div>
            {c.detail && <div className="text-xs text-muted-foreground">{c.detail}</div>}
          </div>
          <Badge variant="outline" className="text-xs">w{c.weight}</Badge>
        </div>
      ))}
    </div>
  );
}
