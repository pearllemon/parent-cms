// SEO Workspace Overview: aggregate scores from cached seo_scores table.
// "Rescan all" runs a fresh score sweep and stores results. Per-row click
// jumps into the SEO Audit detail view.

import { useEffect, useState } from "react";
import { useSiteConfig } from "@/providers/SiteProvider";
import { loadStoredScores, aggregate, rescanAll, type StoredScore } from "@/lib/seoScoresStore";
import { getSeoSettings, saveSeoSettings, resolvedBaseUrl, type SeoSettings } from "@/lib/seoSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCcw, Save } from "lucide-react";
import { toast } from "sonner";

const grade = (s: number) => s >= 90 ? "A" : s >= 75 ? "B" : s >= 60 ? "C" : s >= 40 ? "D" : "F";
const color = (s: number) => s >= 75 ? "bg-green-500/15 text-green-700"
  : s >= 60 ? "bg-emerald-500/15 text-emerald-700"
  : s >= 40 ? "bg-yellow-500/15 text-yellow-700"
  : "bg-red-500/15 text-red-700";

export default function AdminSeoOverview() {
  const { config } = useSiteConfig();
  const [settings, setSettings] = useState<SeoSettings | null>(null);
  const [rows, setRows] = useState<StoredScore[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ n: number; total: number } | null>(null);

  const reload = async () => setRows(await loadStoredScores());

  useEffect(() => {
    getSeoSettings().then(setSettings);
    void reload();
  }, []);

  const onRescan = async () => {
    if (!settings) return;
    setBusy(true);
    setProgress({ n: 0, total: 0 });
    try {
      const r = await rescanAll({
        baseUrl: resolvedBaseUrl(settings),
        siteId: (config?.site?.id as string) || null,
        onProgress: (n, total) => setProgress({ n, total }),
      });
      toast.success(`Rescanned ${r.scanned} pages`);
      await reload();
    } catch (e: any) { toast.error(e.message); }
    setBusy(false);
    setProgress(null);
  };

  const onSaveBase = async () => {
    if (!settings) return;
    await saveSeoSettings({ base_url: settings.base_url });
    toast.success("Base URL saved");
  };

  const agg = aggregate(rows);
  const orphaned = rows.filter((r) => r.total_score < 40);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-display">Overview</h2>
          <p className="text-sm text-muted-foreground">
            {agg.count > 0
              ? `Scores cached for ${agg.count} pages — click Rescan to refresh.`
              : "No cached scores yet — click Rescan all to compute scores for every page."}
          </p>
        </div>
        <Button onClick={onRescan} disabled={busy}>
          <RefreshCcw className={`w-4 h-4 mr-2 ${busy ? "animate-spin" : ""}`} />
          {busy ? (progress ? `Scanning ${progress.n}/${progress.total}` : "Scanning…") : "Rescan all"}
        </Button>
      </div>

      {settings && (
        <div className="border rounded-lg p-4 grid md:grid-cols-3 gap-3 items-end">
          <div className="md:col-span-2">
            <Label className="text-xs">Base URL (used for canonicals & sitemap)</Label>
            <Input value={settings.base_url || ""} onChange={(e) => setSettings({ ...settings, base_url: e.target.value })} />
          </div>
          <Button variant="outline" onClick={onSaveBase}><Save className="w-4 h-4 mr-2" /> Save Base URL</Button>
        </div>
      )}

      <div className="grid md:grid-cols-4 gap-3">
        <Score label="Overall" value={agg.total} />
        <Score label="SEO" value={agg.seo} />
        <Score label="GEO" value={agg.geo} />
        <Score label="AEO" value={agg.aeo} />
      </div>

      <div className="border rounded-lg">
        <div className="p-3 border-b flex items-center justify-between">
          <p className="text-sm font-medium">{agg.count} pages scored</p>
          {orphaned.length > 0 && <Badge variant="outline" className="text-orange-700">{orphaned.length} pages need attention (score &lt; 40)</Badge>}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Page</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead className="text-center">SEO</TableHead>
              <TableHead className="text-center">GEO</TableHead>
              <TableHead className="text-center">AEO</TableHead>
              <TableHead className="text-center">Total</TableHead>
              <TableHead className="text-right">Scanned</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No scores yet — click "Rescan all" above.</TableCell></TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="max-w-md">
                  <div className="font-medium truncate">{r.title || r.key}</div>
                  <a href={r.url} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:underline truncate block">{r.url}</a>
                </TableCell>
                <TableCell><Badge variant="outline">{r.scope}</Badge></TableCell>
                <TableCell className="text-center"><Badge className={color(r.seo_score)}>{r.seo_score}</Badge></TableCell>
                <TableCell className="text-center"><Badge className={color(r.geo_score)}>{r.geo_score}</Badge></TableCell>
                <TableCell className="text-center"><Badge className={color(r.aeo_score)}>{r.aeo_score}</Badge></TableCell>
                <TableCell className="text-center font-semibold">{r.total_score}</TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">{new Date(r.last_scanned_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="border rounded-lg p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="flex items-baseline gap-2 mt-1">
        <div className="text-3xl font-display">{value}</div>
        <Badge className={color(value)}>{grade(value)}</Badge>
      </div>
    </div>
  );
}
