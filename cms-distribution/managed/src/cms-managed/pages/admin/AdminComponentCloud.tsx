// Component Cloud — browse, install, manage auto-sync, publish, and review.
//
// Parent admins approve submissions in the Review queue; once approved,
// the component is visible to other child sites in the Browse library.

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteConfig } from "@/providers/SiteProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Cloud, CloudUpload, Search, Download, Trash2, RefreshCw, CheckCircle2, Eye, ShieldCheck, ShieldAlert, ExternalLink } from "lucide-react";
import {
  listCloudComponents, listInstalls, installComponent, publishComponent,
  setAutoSync, uninstall, listPendingReviews, approveComponent, rejectComponent,
  previewUrl,
  type CloudComponent, type Install, type ComponentKind,
} from "@/lib/componentCloud";

const KIND_LABEL: Record<ComponentKind, string> = {
  section: "Section",
  template: "Template",
  widget: "Widget",
};

export default function AdminComponentCloud() {
  const { config } = useSiteConfig();
  const siteId = config?.site?.id;
  const [tab, setTab] = useState<"browse" | "publish" | "installed" | "review">("browse");
  const [items, setItems] = useState<CloudComponent[]>([]);
  const [installs, setInstalls] = useState<Install[]>([]);
  const [pending, setPending] = useState<CloudComponent[]>([]);
  const [q, setQ] = useState("");
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [publishOpen, setPublishOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [c, i, p] = await Promise.all([
        listCloudComponents(),
        siteId ? listInstalls(siteId) : Promise.resolve([] as Install[]),
        listPendingReviews().catch(() => [] as CloudComponent[]),
      ]);
      setItems(c);
      setInstalls(i);
      setPending(p);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load library");
    }
    setLoading(false);
  };
  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [siteId]);

  // Realtime: refresh on approvals
  useEffect(() => {
    const ch = supabase.channel("asset_updates")
      .on("broadcast", { event: "asset_approved" }, () => { void load(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const installMap = useMemo(() => {
    const m = new Map<string, Install>();
    for (const i of installs) m.set(`${i.kind}:${i.slug}`, i);
    return m;
  }, [installs]);

  const filtered = useMemo(() => items.filter((c) =>
    (kindFilter === "all" || c.kind === kindFilter) &&
    (!q || `${c.name} ${c.slug} ${c.description || ""}`.toLowerCase().includes(q.toLowerCase()))
  ), [items, q, kindFilter]);

  const onInstall = async (c: CloudComponent, mode: "link" | "fork" = "link") => {
    if (!siteId) { toast.error("No site context"); return; }
    try {
      await installComponent(c, siteId, mode);
      toast.success(`${mode === "fork" ? "Forked" : "Installed"} ${c.name} v${c.version}`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Install failed");
    }
  };

  const onToggleSync = async (c: CloudComponent, on: boolean) => {
    if (!siteId) return;
    await setAutoSync(siteId, c.kind, c.slug, on);
    await load();
  };

  const onApprove = async (c: CloudComponent) => {
    try {
      await approveComponent(c.id);
      toast.success(`Approved ${c.name} v${c.version}`);
      await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Approve failed"); }
  };

  const onReject = async (c: CloudComponent) => {
    const notes = window.prompt(`Reject ${c.name}? Optional notes:`);
    if (notes === null) return;
    try {
      await rejectComponent(c.id, notes || undefined);
      toast.success(`Rejected ${c.name}`);
      await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Reject failed"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="font-display text-3xl flex items-center gap-2"><Cloud className="w-7 h-7" /> Component Cloud</h1>
          <p className="text-sm text-muted-foreground">Shared library of sections, templates, and widgets — publish locally, share globally after review.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
          <Button onClick={() => setPublishOpen(true)}><CloudUpload className="w-4 h-4 mr-1" /> Publish new</Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="browse">Browse library</TabsTrigger>
          <TabsTrigger value="installed">Installed ({installs.length})</TabsTrigger>
          <TabsTrigger value="publish">Publish from local</TabsTrigger>
          <TabsTrigger value="review">
            Review queue {pending.length > 0 && <Badge variant="destructive" className="ml-1.5">{pending.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="pt-4 space-y-3">
          <Card className="p-3 flex gap-2 items-center flex-wrap">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input className="pl-8" placeholder="Search by name, slug, description…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Select value={kindFilter} onValueChange={setKindFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All kinds</SelectItem>
                <SelectItem value="section">Sections</SelectItem>
                <SelectItem value="template">Templates</SelectItem>
                <SelectItem value="widget">Widgets</SelectItem>
              </SelectContent>
            </Select>
          </Card>

          {loading ? <p className="text-sm text-muted-foreground">Loading library…</p>
            : filtered.length === 0 ? <Card className="p-8 text-center text-muted-foreground">No approved components yet. Publish your first one from the <strong>Publish from local</strong> tab.</Card>
            : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.map((c) => {
                  const inst = installMap.get(`${c.kind}:${c.slug}`);
                  const upgradeable = inst && c.version > inst.installed_version;
                  return (
                    <Card key={c.id} className="overflow-hidden flex flex-col">
                      <div className="aspect-video bg-muted relative">
                        {c.thumbnail_url ? <img src={c.thumbnail_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No preview</div>}
                        <Badge className="absolute top-2 left-2 capitalize" variant="secondary">{KIND_LABEL[c.kind]}</Badge>
                      </div>
                      <div className="p-3 space-y-2 flex-1 flex flex-col">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-medium truncate">{c.name}</div>
                            <div className="text-xs text-muted-foreground truncate">{c.slug} · v{c.version}</div>
                          </div>
                          {inst && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                        </div>
                        {c.description && <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>}
                        <div className="flex gap-2 pt-1 mt-auto">
                          <Button size="sm" variant="outline" onClick={() => window.open(previewUrl(c, siteId), "_blank")}>
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant={inst ? "outline" : "default"} className="flex-1" onClick={() => onInstall(c, "link")}>
                            <Download className="w-3.5 h-3.5 mr-1" />
                            {inst ? (upgradeable ? `Upgrade v${c.version}` : "Reinstall") : "Install"}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => onInstall(c, "fork")} title="Fork (clone, breaks upgrade link)">
                            Fork
                          </Button>
                        </div>
                        {inst && (
                          <div className="flex items-center justify-between text-xs pt-1">
                            <span className="text-muted-foreground">Auto-sync new versions</span>
                            <Switch checked={inst.auto_sync} onCheckedChange={(v) => onToggleSync(c, v)} />
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )
          }
        </TabsContent>

        <TabsContent value="installed" className="pt-4">
          {installs.length === 0 ? <Card className="p-8 text-center text-muted-foreground">No installs yet.</Card> : (
            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wide">
                  <tr><th className="p-3 text-left">Kind</th><th className="p-3 text-left">Slug</th><th className="p-3 text-left">Installed</th><th className="p-3 text-left">Auto-sync</th><th className="p-3 text-left">Last synced</th><th></th></tr>
                </thead>
                <tbody>
                  {installs.map((i) => (
                    <tr key={i.id} className="border-t">
                      <td className="p-3 capitalize">{i.kind}</td>
                      <td className="p-3 font-mono text-xs">{i.slug}</td>
                      <td className="p-3">v{i.installed_version}</td>
                      <td className="p-3"><Switch checked={i.auto_sync} onCheckedChange={(v) => siteId && setAutoSync(siteId, i.kind, i.slug, v).then(load)} /></td>
                      <td className="p-3 text-xs text-muted-foreground">{new Date(i.last_synced_at).toLocaleString()}</td>
                      <td className="p-3 text-right">
                        <Button size="icon" variant="ghost" onClick={() => siteId && uninstall(siteId, i.kind, i.slug).then(load)}><Trash2 className="w-4 h-4" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="publish" className="pt-4">
          <PublishFromLocal onPublished={() => { void load(); }} />
        </TabsContent>

        <TabsContent value="review" className="pt-4 space-y-3">
          {pending.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-emerald-600" />
              No submissions waiting for review.
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {pending.map((c) => (
                <Card key={c.id} className="overflow-hidden flex flex-col">
                  <div className="aspect-video bg-muted relative">
                    {c.thumbnail_url ? <img src={c.thumbnail_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No preview</div>}
                    <Badge variant="secondary" className="absolute top-2 left-2 capitalize">{KIND_LABEL[c.kind]}</Badge>
                    <Badge className="absolute top-2 right-2 bg-amber-500"><ShieldAlert className="w-3 h-3 mr-1" /> Pending</Badge>
                  </div>
                  <div className="p-3 space-y-2 flex-1 flex flex-col">
                    <div>
                      <div className="font-medium truncate">{c.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{c.slug} · v{c.version}</div>
                    </div>
                    {c.description && <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>}
                    <div className="text-[11px] text-muted-foreground">
                      Submitted {new Date(c.submitted_at).toLocaleString()}
                      {c.publisher_site_id && <> · from <span className="font-mono">{c.publisher_site_id.slice(0, 8)}</span></>}
                    </div>
                    <div className="flex gap-2 pt-1 mt-auto">
                      <Button size="sm" variant="outline" onClick={() => window.open(previewUrl(c, siteId), "_blank")}>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => onApprove(c)}>
                        Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => onReject(c)}>
                        Reject
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <PublishDialog open={publishOpen} onOpenChange={setPublishOpen} onPublished={() => { setPublishOpen(false); void load(); }} />
    </div>
  );
}

// ---- Publish from local theme_sections / theme_templates ----
function PublishFromLocal({ onPublished }: { onPublished: () => void }) {
  const { config } = useSiteConfig();
  const siteId = config?.site?.id;
  const [sections, setSections] = useState<Array<Record<string, unknown>>>([]);
  const [templates, setTemplates] = useState<Array<Record<string, unknown>>>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [s, t] = await Promise.all([
        supabase.from("theme_sections").select("*").order("updated_at", { ascending: false }).limit(100),
        supabase.from("theme_templates").select("*").order("updated_at", { ascending: false }).limit(100),
      ]);
      setSections((s.data as Array<Record<string, unknown>>) || []);
      setTemplates((t.data as Array<Record<string, unknown>>) || []);
    })();
  }, []);

  const pub = async (kind: ComponentKind, row: Record<string, unknown>) => {
    setBusy(String(row.id));
    try {
      const { asset, status } = await publishComponent({
        kind,
        slug: row.slug as string,
        name: row.name as string,
        description: (row.description as string) || null,
        category: (row.category as string) || null,
        payload: kind === "section"
          ? { blocks: row.blocks, category: row.category, design_tokens: row.design_tokens, variants: row.variants }
          : { blocks: row.blocks, kind: row.kind },
        preview_url: (row.preview_url as string) || null,
        publisher_site_id: siteId || null,
      });
      if (status === "pending_review") {
        toast.success(`Submitted ${asset.name} v${asset.version} for review`);
      } else {
        toast.success(`Published ${asset.name} v${asset.version}`);
      }
      onPublished();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Publish failed");
    }
    setBusy(null);
  };

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card className="p-4 space-y-3">
        <h3 className="font-medium">Local sections</h3>
        {sections.length === 0 ? <p className="text-xs text-muted-foreground">No sections yet.</p> : sections.map((s) => (
          <div key={String(s.id)} className="flex items-center justify-between text-sm border rounded p-2">
            <div className="min-w-0">
              <div className="truncate font-medium">{String(s.name)}</div>
              <div className="text-xs text-muted-foreground truncate">{String(s.slug)} · v{String(s.version || 1)}</div>
            </div>
            <Button size="sm" disabled={busy === String(s.id)} onClick={() => pub("section", s)}>Publish</Button>
          </div>
        ))}
      </Card>
      <Card className="p-4 space-y-3">
        <h3 className="font-medium">Local templates</h3>
        {templates.length === 0 ? <p className="text-xs text-muted-foreground">No templates yet.</p> : templates.map((t) => (
          <div key={String(t.id)} className="flex items-center justify-between text-sm border rounded p-2">
            <div className="min-w-0">
              <div className="truncate font-medium">{String(t.name)}</div>
              <div className="text-xs text-muted-foreground truncate">{String(t.slug)} · v{String(t.version || 1)}</div>
            </div>
            <Button size="sm" disabled={busy === String(t.id)} onClick={() => pub("template", t)}>Publish</Button>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ---- Manual publish dialog (paste JSON / widget) ----
function PublishDialog({ open, onOpenChange, onPublished }: { open: boolean; onOpenChange: (o: boolean) => void; onPublished: () => void }) {
  const { config } = useSiteConfig();
  const siteId = config?.site?.id;
  const [form, setForm] = useState<{ kind: ComponentKind; slug: string; name: string; description: string; payload: string; thumbnail_url: string }>({
    kind: "widget", slug: "", name: "", description: "", payload: "{}", thumbnail_url: "",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.slug || !form.name) { toast.error("Slug and name are required"); return; }
    let payload: Record<string, unknown> = {};
    try { payload = JSON.parse(form.payload || "{}"); }
    catch { toast.error("Payload must be valid JSON"); return; }
    setSaving(true);
    try {
      const { status, asset } = await publishComponent({
        kind: form.kind,
        slug: form.slug,
        name: form.name,
        description: form.description || null,
        payload,
        thumbnail_url: form.thumbnail_url || null,
        publisher_site_id: siteId || null,
      });
      toast.success(status === "pending_review" ? `Submitted ${asset.name} for review` : `Published ${asset.name}`);
      onPublished();
      setForm({ kind: "widget", slug: "", name: "", description: "", payload: "{}", thumbnail_url: "" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Publish failed");
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Publish new component</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Kind</Label>
              <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as ComponentKind })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="section">Section</SelectItem>
                  <SelectItem value="template">Template</SelectItem>
                  <SelectItem value="widget">Widget</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="hero-split-cta" /></div>
            <div className="col-span-2"><Label className="text-xs">Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          </div>
          <div><Label className="text-xs">Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div><Label className="text-xs">Thumbnail URL</Label><Input value={form.thumbnail_url} onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })} placeholder="https://…" /></div>
          <div><Label className="text-xs">Payload (JSON)</Label><Textarea rows={6} className="font-mono text-xs" value={form.payload} onChange={(e) => setForm({ ...form, payload: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={saving} onClick={save}>{saving ? "Publishing…" : "Submit v1"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
