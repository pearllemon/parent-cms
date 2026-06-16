// BuildReleaseDialog — guided "Build release" modal that replaces the old
// bare-bones "Cut release" form. Lets admins pick what to snapshot, choose an
// SDK source (latest / stub / custom URL), preview the manifest, and publish
// + sign in a single click.

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, PackageCheck, ShieldCheck, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import {
  buildAndCutRelease, findLatestSdkUrl, STUB_SDK_URL, type SdkSourceMode,
} from "@/lib/releaseBuilder";
import { buildManifest, DEFAULT_SELECTION, type SnapshotSelection } from "@/lib/manifestBuilder";
import { loadLocalSigner } from "@/lib/releaseSigning";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
};

const ENTITY_LABELS: Array<{ key: keyof SnapshotSelection; label: string; hint: string }> = [
  { key: "pages",      label: "Pages",                 hint: "Published CPT entries with slug=page" },
  { key: "posts",      label: "Posts",                 hint: "Published CPT entries with slug=post" },
  { key: "cpts",       label: "Custom post types",     hint: "Types + their published entries" },
  { key: "templates",  label: "Templates",             hint: "theme_templates" },
  { key: "sections",   label: "Sections",              hint: "theme_sections" },
  { key: "tokens",     label: "Theme tokens",          hint: "Colors / typography / spacing" },
  { key: "taxonomies", label: "Taxonomies + terms",    hint: "All taxonomies and terms" },
  { key: "components", label: "Cloud components",      hint: "Latest version per (kind, slug)" },
  { key: "redirects",  label: "Redirects",             hint: "Source → destination rules" },
  { key: "settings",   label: "Site settings",         hint: "Global site_settings row" },
  { key: "seo",        label: "SEO settings + files",  hint: "Workspace defaults + robots/sitemap" },
  { key: "menus",      label: "Menus",                 hint: "Stored within settings — included for forward compat" },
  { key: "mediaMeta",  label: "Media metadata",        hint: "URLs only; binaries stay in storage" },
];

export default function BuildReleaseDialog({ open, onOpenChange, onDone }: Props) {
  const [version, setVersion] = useState("");
  const [changelog, setChangelog] = useState("");
  const [minChild, setMinChild] = useState("");
  const [sdkMode, setSdkMode] = useState<SdkSourceMode>("latest");
  const [sdkUrlOverride, setSdkUrlOverride] = useState("");
  const [latestSdk, setLatestSdk] = useState<string | null>(null);
  const [selection, setSelection] = useState<SnapshotSelection>(DEFAULT_SELECTION);
  const [preview, setPreview] = useState<Record<string, number> | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const hasSigner = useMemo(() => !!loadLocalSigner(), [open]);

  useEffect(() => {
    if (!open) return;
    setVersion(""); setChangelog(""); setMinChild("");
    setSdkMode("latest"); setSdkUrlOverride(""); setPreview(null);
    setSelection(DEFAULT_SELECTION);
    void findLatestSdkUrl().then(setLatestSdk);
  }, [open]);

  const resolvedSdkUrl =
    sdkMode === "url" ? sdkUrlOverride || "(provide URL)"
      : sdkMode === "stub" ? STUB_SDK_URL
      : latestSdk || "(no prior SDK — will fall back to stub)";

  const runPreview = async () => {
    setPreviewing(true);
    try {
      const m = await buildManifest(selection);
      setPreview(m._counts);
    } finally { setPreviewing(false); }
  };

  const submit = async () => {
    if (!version.trim()) return toast.error("Version required (e.g. 1.0.0)");
    setBusy(true);
    try {
      const r = await buildAndCutRelease({
        version: version.trim(),
        changelog: changelog || undefined,
        minCompatibleChild: minChild || undefined,
        selection,
        sdkMode,
        sdkUrlOverride: sdkUrlOverride || undefined,
        autoSign: hasSigner,
      });
      const counts = Object.entries(r.counts).filter(([, v]) => v > 0)
        .map(([k, v]) => `${k}:${v}`).join(", ");
      toast.success(
        `Release v${r.release.version} published${r.signed ? " + signed" : ""}${counts ? ` (${counts})` : ""}`,
      );
      onOpenChange(false);
      onDone();
    } catch (e) {
      toast.error(String((e as Error).message));
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageCheck className="w-5 h-5" /> Build release
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="meta">
          <TabsList>
            <TabsTrigger value="meta">Version</TabsTrigger>
            <TabsTrigger value="content">Content snapshot</TabsTrigger>
            <TabsTrigger value="sdk">Engine SDK</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="meta" className="space-y-3 pt-4">
            <div>
              <Label>Version (semver)</Label>
              <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.0.0" />
            </div>
            <div>
              <Label>Changelog</Label>
              <Textarea rows={4} value={changelog} onChange={(e) => setChangelog(e.target.value)} placeholder="What's new in this release..." />
            </div>
            <div>
              <Label>Min compatible child shim (optional)</Label>
              <Input value={minChild} onChange={(e) => setMinChild(e.target.value)} placeholder="1.0.0" />
            </div>
            <div className="text-xs flex items-center gap-2">
              {hasSigner
                ? <Badge variant="outline" className="gap-1"><ShieldCheck className="w-3 h-3" /> will auto-sign with local key</Badge>
                : <Badge variant="destructive" className="gap-1"><ShieldAlert className="w-3 h-3" /> no local signing key — release will be unsigned (children will refuse it)</Badge>}
            </div>
          </TabsContent>

          <TabsContent value="content" className="pt-4">
            <p className="text-xs text-muted-foreground mb-3">
              Pick what to bake into the manifest. Children apply this on every release without any extra fetching.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ENTITY_LABELS.map((e) => (
                <label key={e.key} className="flex items-start gap-2 p-2 rounded border bg-background hover:bg-muted/30 cursor-pointer">
                  <Checkbox
                    checked={selection[e.key]}
                    onCheckedChange={(v) => setSelection((s) => ({ ...s, [e.key]: !!v }))}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{e.label}</div>
                    <div className="text-xs text-muted-foreground">{e.hint}</div>
                  </div>
                </label>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="sdk" className="pt-4 space-y-4">
            <p className="text-xs text-muted-foreground">
              Children dynamically <code>import()</code> this URL after the manifest is verified. Use the stub if you don't have a built bundle yet — it boots <code>window.ParentCMS</code> so the child is never empty.
            </p>
            <RadioGroup value={sdkMode} onValueChange={(v) => setSdkMode(v as SdkSourceMode)} className="space-y-2">
              <label className="flex items-start gap-2 p-3 rounded border cursor-pointer">
                <RadioGroupItem value="latest" />
                <div>
                  <div className="text-sm font-medium">Reuse latest uploaded SDK</div>
                  <div className="text-xs text-muted-foreground break-all">
                    {latestSdk || "No prior SDK uploaded — will fall back to the stub bundle."}
                  </div>
                </div>
              </label>
              <label className="flex items-start gap-2 p-3 rounded border cursor-pointer">
                <RadioGroupItem value="stub" />
                <div>
                  <div className="text-sm font-medium">Use stub SDK (zero-upload)</div>
                  <div className="text-xs text-muted-foreground break-all">{STUB_SDK_URL}</div>
                </div>
              </label>
              <label className="flex items-start gap-2 p-3 rounded border cursor-pointer">
                <RadioGroupItem value="url" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">Custom URL</div>
                  <Input className="mt-1" value={sdkUrlOverride} onChange={(e) => setSdkUrlOverride(e.target.value)} placeholder="https://.../cms-core.v1.js" />
                </div>
              </label>
            </RadioGroup>
            <div className="text-xs text-muted-foreground break-all">
              Resolved SDK URL: <code>{resolvedSdkUrl}</code>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={previewing} onClick={runPreview}>
                {previewing && <Loader2 className="w-3 h-3 mr-1 animate-spin" />} Recalculate
              </Button>
              <span className="text-xs text-muted-foreground">Snapshot counts (no DB writes yet)</span>
            </div>
            <div className="bg-muted/30 border rounded p-3 text-xs font-mono">
              {preview
                ? Object.entries(preview).map(([k, v]) => (
                    <div key={k}>{k.padEnd(20)} {v}</div>
                  ))
                : <span className="text-muted-foreground">Click Recalculate to preview.</span>}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>
            {busy && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
            Publish release
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
