// Admin: SEO files manager (sitemap.xml, robots.txt, llms.txt).
// Each file has its own tab. Settings + manual content stored in `seo_files`.
// Version snapshots are saved to `seo_file_versions` on every regenerate/save.

import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteConfig } from "@/providers/SiteProvider";
import {
  buildSitemap,
  buildRobots,
  buildLlms,
  loadContent,
  loadVersions,
  snapshotVersion,
  type ContentRow,
  type SitemapSettings,
  type RobotsSettings,
  type LlmsSettings,
  type RobotsRule,
} from "@/lib/seoFiles";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { RefreshCcw, Save, Download, Copy, History, RotateCcw, Plus, Trash2, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type FileType = "sitemap" | "robots" | "llms";

type SeoFileRow = {
  file_type: FileType;
  auto_enabled: boolean;
  settings: any;
  manual_content: string | null;
  last_generated_at: string | null;
  updated_at: string;
};

const FILE_META: Record<FileType, { title: string; publicPath: string; mime: string; download: string }> = {
  sitemap: { title: "sitemap.xml", publicPath: "/sitemap.xml", mime: "application/xml", download: "sitemap.xml" },
  robots:  { title: "robots.txt",  publicPath: "/robots.txt",  mime: "text/plain",      download: "robots.txt"  },
  llms:    { title: "llms.txt",    publicPath: "/llms.txt",    mime: "text/plain",      download: "llms.txt"    },
};

function downloadFile(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

export default function AdminSeoFiles() {
  const { config } = useSiteConfig();
  const [baseUrl, setBaseUrl] = useState<string>(typeof window !== "undefined" ? window.location.origin : "");
  const [content, setContent] = useState<{ parent: ContentRow[]; imported: ContentRow[] }>({ parent: [], imported: [] });
  const [rows, setRows] = useState<Record<FileType, SeoFileRow | null>>({ sitemap: null, robots: null, llms: null });
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    const [c, files] = await Promise.all([
      loadContent(config?.site?.id || null),
      supabase.from("seo_files" as any).select("*"),
    ]);
    setContent(c);
    const map: Record<FileType, SeoFileRow | null> = { sitemap: null, robots: null, llms: null };
    ((files.data as any[]) || []).forEach((r) => { map[r.file_type as FileType] = r as SeoFileRow; });
    setRows(map);
    setLoading(false);
  }, [config?.site?.id]);

  useEffect(() => { void reload(); }, [reload]);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-display">SEO Files</h1>
        <p className="text-sm text-muted-foreground">Centralised management for sitemap.xml, robots.txt and llms.txt with auto-generation, version history and rollback.</p>
      </div>

      <div className="flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-64 space-y-1.5">
          <Label className="text-xs">Base URL</Label>
          <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://yourdomain.com" />
        </div>
        <Button variant="outline" onClick={reload} disabled={loading}>
          <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Reload content
        </Button>
      </div>

      <Tabs defaultValue="sitemap">
        <TabsList>
          <TabsTrigger value="sitemap">Sitemap</TabsTrigger>
          <TabsTrigger value="robots">Robots</TabsTrigger>
          <TabsTrigger value="llms">LLMs</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
        </TabsList>

        <TabsContent value="sitemap">
          <SitemapTab baseUrl={baseUrl} row={rows.sitemap} content={content} onChanged={reload} />
        </TabsContent>
        <TabsContent value="robots">
          <RobotsTab baseUrl={baseUrl} row={rows.robots} onChanged={reload} />
        </TabsContent>
        <TabsContent value="llms">
          <LlmsTab baseUrl={baseUrl} row={rows.llms} content={content} siteName={config?.site?.name as string | undefined} onChanged={reload} />
        </TabsContent>
        <TabsContent value="automation">
          <SeoAutomationPanel baseUrl={baseUrl} siteName={config?.site?.name as string | undefined} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shared building blocks                                             */
/* ------------------------------------------------------------------ */

function FileHeader({ type, autoEnabled, onToggleAuto, onSaveSettings, onRegenerate, onDownload, onCopy, lastGenerated, baseUrl, generatedContent }: {
  type: FileType;
  autoEnabled: boolean;
  onToggleAuto: (v: boolean) => void;
  onSaveSettings: () => void;
  onRegenerate: () => void;
  onDownload: () => void;
  onCopy: () => void;
  lastGenerated: string | null;
  baseUrl: string;
  generatedContent: string;
}) {
  const meta = FILE_META[type];
  const valid = generatedContent.length > 0 && !generatedContent.includes("undefined");
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">{meta.title}</p>
            {valid ? (
              <span className="inline-flex items-center text-xs text-green-700 dark:text-green-400"><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Valid</span>
            ) : (
              <span className="inline-flex items-center text-xs text-amber-700"><AlertCircle className="w-3.5 h-3.5 mr-1" /> Check output</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Public URL: <a className="underline" href={`${baseUrl.replace(/\/+$/, "")}${meta.publicPath}`} target="_blank" rel="noreferrer">{meta.publicPath} <ExternalLink className="w-3 h-3 inline" /></a>
            {lastGenerated ? ` · last generated ${new Date(lastGenerated).toLocaleString()}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch checked={autoEnabled} onCheckedChange={onToggleAuto} id={`${type}-auto`} />
            <Label htmlFor={`${type}-auto`} className="text-xs">Auto-generate</Label>
          </div>
          <Button size="sm" variant="outline" onClick={onCopy}><Copy className="w-4 h-4 mr-2" />Copy</Button>
          <Button size="sm" variant="outline" onClick={onDownload}><Download className="w-4 h-4 mr-2" />Download</Button>
          <Button size="sm" variant="outline" onClick={onRegenerate}><RefreshCcw className="w-4 h-4 mr-2" />Regenerate</Button>
          <Button size="sm" onClick={onSaveSettings}><Save className="w-4 h-4 mr-2" />Save</Button>
        </div>
      </div>
    </div>
  );
}

function VersionHistory({ type, onRollback }: { type: FileType; onRollback: (v: any) => void }) {
  const [versions, setVersions] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => setVersions(await loadVersions(type));
  useEffect(() => { if (open) void load(); }, [open, type]);

  return (
    <div className="border rounded-lg">
      <button className="w-full flex items-center justify-between p-3 text-sm" onClick={() => setOpen((v) => !v)}>
        <span className="flex items-center gap-2"><History className="w-4 h-4" /> Version history</span>
        <span className="text-xs text-muted-foreground">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="border-t divide-y">
          {versions.length === 0 && <p className="p-3 text-xs text-muted-foreground">No versions saved yet.</p>}
          {versions.map((v) => (
            <div key={v.id} className="p-3 flex items-center justify-between gap-3 text-xs">
              <div>
                <p className="font-medium">{new Date(v.created_at).toLocaleString()}</p>
                {v.note && <p className="text-muted-foreground">{v.note}</p>}
              </div>
              <Button size="sm" variant="outline" onClick={() => onRollback(v)}>
                <RotateCcw className="w-3 h-3 mr-1" /> Rollback
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

async function persistRow(type: FileType, patch: Partial<SeoFileRow>, generated?: string) {
  // Always cache `generated` into manual_content so the public edge endpoint
  // can serve the latest output without re-running the build pipeline.
  // When auto_enabled is true, manual_content acts as a cache; when false,
  // it's the admin's authoritative override.
  const update: any = { ...patch, updated_at: new Date().toISOString() };
  if (generated !== undefined) {
    update.last_generated_at = new Date().toISOString();
    if (patch.manual_content === undefined || patch.manual_content === null) {
      update.manual_content = generated;
    }
  }
  const { error } = await supabase.from("seo_files" as any).update(update).eq("file_type", type);
  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/* Sitemap tab                                                        */
/* ------------------------------------------------------------------ */

function SitemapTab({ baseUrl, row, content, onChanged }: { baseUrl: string; row: SeoFileRow | null; content: { parent: ContentRow[]; imported: ContentRow[] }; onChanged: () => void }) {
  const [auto, setAuto] = useState(row?.auto_enabled ?? true);
  const [s, setS] = useState<SitemapSettings>(row?.settings || {});
  const [manual, setManual] = useState<string>(row?.manual_content || "");
  useEffect(() => { setAuto(row?.auto_enabled ?? true); setS(row?.settings || {}); setManual(row?.manual_content || ""); }, [row]);

  const generated = useMemo(() => buildSitemap(baseUrl, s, content), [baseUrl, s, content]);
  const output = auto ? generated : (manual || generated);
  const urls = (output.match(/<url>/g) || []).length;

  const save = async (note?: string) => {
    await persistRow("sitemap", { auto_enabled: auto, settings: s, manual_content: auto ? null : manual }, output);
    await snapshotVersion("sitemap", output, s, note || (auto ? "Auto-generated" : "Manual save"));
    toast.success("Sitemap saved");
    onChanged();
  };

  return (
    <Card className="p-4 space-y-4 mt-4">
      <FileHeader
        type="sitemap"
        autoEnabled={auto}
        onToggleAuto={setAuto}
        onSaveSettings={() => save()}
        onRegenerate={() => save("Manual regenerate")}
        onDownload={() => downloadFile("sitemap.xml", output, "application/xml")}
        onCopy={() => { void navigator.clipboard.writeText(output); toast.success("Copied"); }}
        lastGenerated={row?.last_generated_at || null}
        baseUrl={baseUrl}
        generatedContent={output}
      />

      <div className="grid md:grid-cols-2 gap-3 text-sm">
        {[
          ["include_static", "Static routes"],
          ["include_services", "Service pages"],
          ["include_posts", "Blog posts"],
          ["include_pages", "Pages"],
          ["include_imported", "Imported content"],
        ].map(([k, label]) => (
          <label key={k} className="flex items-center justify-between border rounded p-2">
            <span>{label}</span>
            <Switch checked={(s as any)[k] !== false} onCheckedChange={(v) => setS({ ...s, [k]: v })} />
          </label>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Exclude slugs (comma-separated)</Label>
          <Input
            value={(s.exclude_slugs || []).join(", ")}
            onChange={(e) => setS({ ...s, exclude_slugs: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })}
            placeholder="draft-post, old-page"
          />
        </div>
        <div>
          <Label className="text-xs">Exclude types (comma-separated)</Label>
          <Input
            value={(s.exclude_types || []).join(", ")}
            onChange={(e) => setS({ ...s, exclude_types: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })}
            placeholder="draft, internal"
          />
        </div>
      </div>

      <div>
        <Label className="text-xs">Preview · {urls} URLs {!auto && "(manual override active)"}</Label>
        <Textarea
          readOnly={auto}
          value={output}
          onChange={(e) => setManual(e.target.value)}
          className="font-mono text-xs h-72"
        />
      </div>

      <VersionHistory type="sitemap" onRollback={(v) => { setManual(v.content); setAuto(false); toast.info("Loaded version — click Save to apply"); }} />
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Robots tab                                                         */
/* ------------------------------------------------------------------ */

function RobotsTab({ baseUrl, row, onChanged }: { baseUrl: string; row: SeoFileRow | null; onChanged: () => void }) {
  const [auto, setAuto] = useState(row?.auto_enabled ?? true);
  const [s, setS] = useState<RobotsSettings>(row?.settings || { rules: [{ user_agent: "*", allow: ["/"], disallow: ["/admin"] }], include_sitemap: true });
  const [manual, setManual] = useState<string>(row?.manual_content || "");
  useEffect(() => {
    setAuto(row?.auto_enabled ?? true);
    setS(row?.settings || { rules: [{ user_agent: "*", allow: ["/"], disallow: ["/admin"] }], include_sitemap: true });
    setManual(row?.manual_content || "");
  }, [row]);

  const generated = useMemo(() => buildRobots(baseUrl, s), [baseUrl, s]);
  const output = auto ? generated : (manual || generated);

  const updateRule = (idx: number, patch: Partial<RobotsRule>) => {
    const rules = [...(s.rules || [])];
    rules[idx] = { ...rules[idx], ...patch };
    setS({ ...s, rules });
  };
  const removeRule = (idx: number) => setS({ ...s, rules: (s.rules || []).filter((_, i) => i !== idx) });
  const addRule = () => setS({ ...s, rules: [...(s.rules || []), { user_agent: "*", allow: [], disallow: [] }] });

  const save = async (note?: string) => {
    if (!auto && manual.length > 0 && !/User-agent:/i.test(manual)) {
      toast.error("Invalid robots.txt: must contain at least one User-agent line");
      return;
    }
    await persistRow("robots", { auto_enabled: auto, settings: s, manual_content: auto ? null : manual }, output);
    await snapshotVersion("robots", output, s, note || (auto ? "Auto-generated" : "Manual save"));
    toast.success("Robots saved");
    onChanged();
  };

  return (
    <Card className="p-4 space-y-4 mt-4">
      <FileHeader
        type="robots"
        autoEnabled={auto}
        onToggleAuto={setAuto}
        onSaveSettings={() => save()}
        onRegenerate={() => save("Manual regenerate")}
        onDownload={() => downloadFile("robots.txt", output, "text/plain")}
        onCopy={() => { void navigator.clipboard.writeText(output); toast.success("Copied"); }}
        lastGenerated={row?.last_generated_at || null}
        baseUrl={baseUrl}
        generatedContent={output}
      />

      <div className="space-y-3">
        {(s.rules || []).map((r, i) => (
          <div key={i} className="border rounded p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Input value={r.user_agent} onChange={(e) => updateRule(i, { user_agent: e.target.value })} placeholder="User-agent (e.g. * or Googlebot)" className="flex-1" />
              <Button size="sm" variant="ghost" onClick={() => removeRule(i)}><Trash2 className="w-4 h-4" /></Button>
            </div>
            <div className="grid md:grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Allow paths</Label>
                <Textarea value={(r.allow || []).join("\n")} onChange={(e) => updateRule(i, { allow: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean) })} className="font-mono text-xs h-24" />
              </div>
              <div>
                <Label className="text-xs">Disallow paths</Label>
                <Textarea value={(r.disallow || []).join("\n")} onChange={(e) => updateRule(i, { disallow: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean) })} className="font-mono text-xs h-24" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Crawl-delay (optional)</Label>
              <Input type="number" value={r.crawl_delay ?? ""} onChange={(e) => updateRule(i, { crawl_delay: e.target.value === "" ? undefined : Number(e.target.value) })} className="w-32" />
            </div>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={addRule}><Plus className="w-4 h-4 mr-2" />Add rule</Button>
      </div>

      <label className="flex items-center justify-between border rounded p-2 text-sm">
        <span>Include Sitemap: URL automatically</span>
        <Switch checked={s.include_sitemap !== false} onCheckedChange={(v) => setS({ ...s, include_sitemap: v })} />
      </label>

      <div>
        <Label className="text-xs">Extra directives (raw)</Label>
        <Textarea value={s.extra || ""} onChange={(e) => setS({ ...s, extra: e.target.value })} className="font-mono text-xs h-20" placeholder="# Anything custom appended verbatim" />
      </div>

      <div>
        <Label className="text-xs">Preview {!auto && "(manual override active)"}</Label>
        <Textarea readOnly={auto} value={output} onChange={(e) => setManual(e.target.value)} className="font-mono text-xs h-48" />
      </div>

      <VersionHistory type="robots" onRollback={(v) => { setManual(v.content); setAuto(false); toast.info("Loaded version — click Save to apply"); }} />
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* LLMs.txt tab                                                       */
/* ------------------------------------------------------------------ */

function LlmsTab({ baseUrl, row, content, siteName, onChanged }: { baseUrl: string; row: SeoFileRow | null; content: { parent: ContentRow[]; imported: ContentRow[] }; siteName?: string; onChanged: () => void }) {
  const [auto, setAuto] = useState(row?.auto_enabled ?? true);
  const [s, setS] = useState<LlmsSettings>(row?.settings || {});
  const [manual, setManual] = useState<string>(row?.manual_content || "");
  useEffect(() => { setAuto(row?.auto_enabled ?? true); setS(row?.settings || {}); setManual(row?.manual_content || ""); }, [row]);

  const generated = useMemo(() => buildLlms(baseUrl, s, content, siteName), [baseUrl, s, content, siteName]);
  const output = auto ? generated : (manual || generated);

  const save = async (note?: string) => {
    if (!auto && manual.length > 0 && !manual.trim().startsWith("#")) {
      toast.error("Invalid llms.txt: must start with an H1 (# Site name)");
      return;
    }
    await persistRow("llms", { auto_enabled: auto, settings: s, manual_content: auto ? null : manual }, output);
    await snapshotVersion("llms", output, s, note || (auto ? "Auto-generated" : "Manual save"));
    toast.success("llms.txt saved");
    onChanged();
  };

  const sections = s.sections || { pages: true, blog: true, services: true };

  return (
    <Card className="p-4 space-y-4 mt-4">
      <FileHeader
        type="llms"
        autoEnabled={auto}
        onToggleAuto={setAuto}
        onSaveSettings={() => save()}
        onRegenerate={() => save("Manual regenerate")}
        onDownload={() => downloadFile("llms.txt", output, "text/plain")}
        onCopy={() => { void navigator.clipboard.writeText(output); toast.success("Copied"); }}
        lastGenerated={row?.last_generated_at || null}
        baseUrl={baseUrl}
        generatedContent={output}
      />

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Site name (H1)</Label>
          <Input value={s.site_name || ""} onChange={(e) => setS({ ...s, site_name: e.target.value })} placeholder={siteName || "My Site"} />
        </div>
        <div>
          <Label className="text-xs">One-line summary (blockquote)</Label>
          <Input value={s.summary || ""} onChange={(e) => setS({ ...s, summary: e.target.value })} placeholder="What this site is about" />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3 text-sm">
        {[
          ["services", "Services"],
          ["pages", "Pages"],
          ["blog", "Blog"],
        ].map(([k, label]) => (
          <label key={k} className="flex items-center justify-between border rounded p-2">
            <span>{label}</span>
            <Switch checked={(sections as any)[k] !== false} onCheckedChange={(v) => setS({ ...s, sections: { ...sections, [k]: v } })} />
          </label>
        ))}
      </div>

      <div>
        <Label className="text-xs">Exclude paths (one per line)</Label>
        <Textarea
          value={(s.exclude_paths || []).join("\n")}
          onChange={(e) => setS({ ...s, exclude_paths: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean) })}
          className="font-mono text-xs h-20"
        />
      </div>

      <div>
        <Label className="text-xs">AI-specific directives (## Optional section)</Label>
        <Textarea value={s.directives || ""} onChange={(e) => setS({ ...s, directives: e.target.value })} className="font-mono text-xs h-20" placeholder="- [API reference](https://...): for AI agents only" />
      </div>

      <div>
        <Label className="text-xs">Preview {!auto && "(manual override active)"}</Label>
        <Textarea readOnly={auto} value={output} onChange={(e) => setManual(e.target.value)} className="font-mono text-xs h-72" />
      </div>

      <VersionHistory type="llms" onRollback={(v) => { setManual(v.content); setAuto(false); toast.info("Loaded version — click Save to apply"); }} />
    </Card>
  );
}
