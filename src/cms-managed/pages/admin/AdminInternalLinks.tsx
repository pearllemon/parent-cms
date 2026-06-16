// Admin: Internal Linking dashboard
// Scans imported + CMS content, builds link graph, exposes orphans + suggestions.

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { supabase as parent } from "@/lib/parent";
import { useSiteConfig } from "@/providers/SiteProvider";
import { services } from "@/data/services";
import { buildGraph, extractLinks, generateSuggestions, persistGraph, persistSuggestions, type ContentRow } from "@/lib/internalLinking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCcw, Link2, ExternalLink, Database, Check, X } from "lucide-react";
import { toast } from "sonner";

export default function AdminInternalLinks() {
  const { config } = useSiteConfig();
  const [rows, setRows] = useState<ContentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [persisting, setPersisting] = useState(false);
  const [filter, setFilter] = useState("");

  const load = async () => {
    setLoading(true);
    const next: ContentRow[] = [];
    for (const s of services) {
      next.push({ url: `/services/${s.slug}`, title: s.title, slug: s.slug, html: "", type: "service", source: "service" });
    }
    if (config?.site?.id) {
      const { data } = await parent
        .from("posts")
        .select("slug,title,body,type,status")
        .eq("site_id", config.site.id)
        .eq("status", "published")
        .limit(2000);
      for (const r of (data || []) as any[]) {
        next.push({
          url: r.type === "page" ? `/p/${r.slug}` : `/blog/${r.slug}`,
          title: r.title || r.slug, slug: r.slug, html: r.body || "", type: r.type || "post", source: "cms",
        });
      }
    }
    const { data: imp } = await supabase
      .from("imported_posts")
      .select("slug,title,body,type")
      .limit(5000);
    for (const r of (imp || []) as any[]) {
      next.push({
        url: r.type === "page" ? `/p/${r.slug}` : `/blog/${r.slug}`,
        title: r.title || r.slug, slug: r.slug, html: r.body || "", type: r.type || "post", source: "imported",
      });
    }
    setRows(next);
    setLoading(false);
  };
  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [config?.site?.id]);

  const graph = useMemo(() => buildGraph(rows), [rows]);
  const suggestions = useMemo(() => generateSuggestions(rows, graph), [rows, graph]);

  const totalEdges = graph.edges.length;
  const internalEdges = graph.edges.filter((e) => !e.is_external).length;
  const externalEdges = totalEdges - internalEdges;

  const persistAll = async () => {
    setPersisting(true);
    try {
      await persistGraph(graph.edges);
      await persistSuggestions(suggestions);
      toast.success("Snapshot saved");
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally { setPersisting(false); }
  };

  const filtered = useMemo(() => {
    const q = filter.toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.title.toLowerCase().includes(q) || r.url.toLowerCase().includes(q));
  }, [rows, filter]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-display">Internal Linking</h1>
          <p className="text-sm text-muted-foreground">Link graph, orphan detection, and keyword-based suggestions.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Rescan
          </Button>
          <Button onClick={persistAll} disabled={persisting || loading}>
            <Database className="w-4 h-4 mr-2" /> {persisting ? "Saving…" : "Save snapshot"}
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-3">
        <Card label="Pages scanned" value={rows.length} />
        <Card label="Internal links" value={internalEdges} />
        <Card label="External links" value={externalEdges} />
        <Card label="Orphan pages" value={graph.orphans.length} accent={graph.orphans.length > 0 ? "warn" : "ok"} />
      </div>

      <Tabs defaultValue="pages">
        <TabsList>
          <TabsTrigger value="pages">Pages ({rows.length})</TabsTrigger>
          <TabsTrigger value="orphans">Orphans ({graph.orphans.length})</TabsTrigger>
          <TabsTrigger value="suggestions">Suggestions ({suggestions.length})</TabsTrigger>
          <TabsTrigger value="edges">All links ({totalEdges})</TabsTrigger>
        </TabsList>

        <TabsContent value="pages" className="space-y-3">
          <Input placeholder="Filter by title or url…" value={filter} onChange={(e) => setFilter(e.target.value)} />
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Page</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-center">Out</TableHead>
                  <TableHead className="text-center">In</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const out = graph.outgoing.get(r.url)?.length || 0;
                  const inc = graph.incoming.get(r.url)?.length || 0;
                  return (
                    <TableRow key={r.url}>
                      <TableCell className="max-w-md">
                        <div className="font-medium truncate">{r.title}</div>
                        <div className="text-xs text-muted-foreground truncate">{r.url}</div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{r.source}</Badge></TableCell>
                      <TableCell className="text-center">{out}</TableCell>
                      <TableCell className={`text-center ${inc === 0 ? "text-orange-600 font-medium" : ""}`}>{inc}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="orphans">
          <div className="border rounded-lg">
            <Table>
              <TableHeader><TableRow><TableHead>Page</TableHead><TableHead>Source</TableHead><TableHead className="text-center">Out</TableHead></TableRow></TableHeader>
              <TableBody>
                {graph.orphans.map((r) => (
                  <TableRow key={r.url}>
                    <TableCell><div className="font-medium">{r.title}</div><div className="text-xs text-muted-foreground">{r.url}</div></TableCell>
                    <TableCell><Badge variant="outline">{r.source}</Badge></TableCell>
                    <TableCell className="text-center">{graph.outgoing.get(r.url)?.length || 0}</TableCell>
                  </TableRow>
                ))}
                {graph.orphans.length === 0 && <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No orphans 🎉</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="suggestions">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Anchor</TableHead>
                  <TableHead className="text-center">Score</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suggestions.slice(0, 200).map((s, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">{s.source_url}</TableCell>
                    <TableCell className="font-mono text-xs">{s.target_url}</TableCell>
                    <TableCell className="text-xs">{s.anchor_text}</TableCell>
                    <TableCell className="text-center">{s.score.toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{s.reason}</TableCell>
                  </TableRow>
                ))}
                {suggestions.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No suggestions found.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="edges">
          <div className="border rounded-lg max-h-[600px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Source</TableHead><TableHead>Target</TableHead><TableHead>Anchor</TableHead><TableHead>Type</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {graph.edges.slice(0, 500).map((e, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">{e.source_url}</TableCell>
                    <TableCell className="font-mono text-xs flex items-center gap-1">
                      {e.is_external ? <ExternalLink className="w-3 h-3" /> : <Link2 className="w-3 h-3" />}
                      {e.target_url.slice(0, 60)}
                    </TableCell>
                    <TableCell className="text-xs">{e.anchor_text.slice(0, 60)}</TableCell>
                    <TableCell>{e.is_external ? <Badge variant="outline">external</Badge> : <Badge>internal</Badge>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {graph.edges.length > 500 && <div className="text-xs text-center text-muted-foreground p-2">Showing first 500 of {graph.edges.length}</div>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Card({ label, value, accent }: { label: string; value: number; accent?: "ok" | "warn" }) {
  return (
    <div className="border rounded-lg p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-3xl font-display mt-1 ${accent === "warn" ? "text-orange-600" : ""}`}>{value}</div>
    </div>
  );
}
