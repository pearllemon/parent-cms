import { useEffect, useState } from "react";
import { listApis, upsertApi, deleteApi, pingApi, type CmsApi } from "@/lib/apiRegistry";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Plug, RefreshCcw, Trash2, Activity } from "lucide-react";
import { toast } from "sonner";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default", degraded: "secondary", down: "destructive", disabled: "outline",
};

// Auto-seed entries: things the CMS already knows about (parent management
// platform, cms-release distribution endpoint) so the user doesn't have to
// fill out a form to register them by hand.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const PARENT_URL = (import.meta.env.VITE_PARENT_SUPABASE_URL as string | undefined)
  || "https://zvaiqrewtqvsokzbxnxt.supabase.co";

const AUTO_ENTRIES: Array<Partial<CmsApi> & { api_key: string; name: string }> = [
  {
    api_key: "parent_management",
    name: "Parent Management Platform",
    base_url: PARENT_URL ? `${PARENT_URL}/functions/v1/site-config` : null,
    description: "Resolves site config, dynamic sections, leads, page views from the parent CMS.",
    scope: "child",
  },
  {
    api_key: "cms_release",
    name: "CMS Release Distribution",
    base_url: SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/cms-release` : null,
    description: "Signed release manifests, child registration, heartbeats, upgrade log.",
    scope: "both",
  },
  {
    api_key: "lovable_ai",
    name: "Lovable AI Gateway",
    base_url: "https://ai.gateway.lovable.dev",
    description: "Built-in AI model gateway used by SEO automations and content tools.",
    scope: "parent",
  },
];

export default function AdminApiRegistry() {
  const [items, setItems] = useState<CmsApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeded, setSeeded] = useState(false);
  const [form, setForm] = useState({ api_key: "", name: "", base_url: "", description: "", scope: "parent" as CmsApi["scope"] });

  const load = async () => {
    setLoading(true);
    const list = await listApis();
    // Auto-seed missing well-known entries the first time the page is opened.
    if (!seeded) {
      const have = new Set(list.map((a) => a.api_key));
      const missing = AUTO_ENTRIES.filter((e) => !have.has(e.api_key));
      for (const entry of missing) {
        try { await upsertApi(entry); } catch { /* ignore */ }
      }
      setSeeded(true);
      if (missing.length) {
        const fresh = await listApis();
        setItems(fresh); setLoading(false); return;
      }
    }
    setItems(list);
    setLoading(false);
  };
  useEffect(() => { void load(); /* eslint-disable-next-line */ }, []);

  const save = async () => {
    if (!form.api_key || !form.name) return toast.error("api_key and name required");
    await upsertApi(form);
    toast.success("Saved");
    setForm({ api_key: "", name: "", base_url: "", description: "", scope: "parent" });
    void load();
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl flex items-center gap-2"><Plug className="w-7 h-7" /> API Registry</h1>
        <p className="text-muted-foreground text-sm mt-1">
          External APIs and integrations available to the CMS (parent platform, third-party services, webhooks).
        </p>
      </header>

      <Card className="p-5 space-y-3">
        <h2 className="font-display text-lg">Register / update API</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><Label>API key (unique)</Label><Input value={form.api_key} onChange={(e) => setForm({ ...form, api_key: e.target.value })} placeholder="parent_management" /></div>
          <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Parent Management Platform" /></div>
          <div><Label>Base URL</Label><Input value={form.base_url} onChange={(e) => setForm({ ...form, base_url: e.target.value })} placeholder="https://api.example.com" /></div>
          <div>
            <Label>Scope</Label>
            <select className="w-full border rounded h-10 px-2 bg-background" value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value as CmsApi["scope"] })}>
              <option value="parent">Parent only</option>
              <option value="child">Child only</option>
              <option value="both">Both</option>
            </select>
          </div>
          <div className="md:col-span-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        </div>
        <Button onClick={save}>Save API</Button>
      </Card>

      <div className="bg-background border rounded-2xl divide-y">
        {loading && <div className="p-6 text-sm text-muted-foreground">Loading…</div>}
        {!loading && items.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No APIs registered yet.</div>}
        {items.map((a) => (
          <div key={a.id} className="p-4 flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-display text-lg">{a.name}</span>
                <Badge variant={STATUS_VARIANT[a.status]}>{a.status}</Badge>
                <Badge variant="outline">{a.scope}</Badge>
                <code className="text-xs opacity-60">{a.api_key}</code>
              </div>
              {a.base_url && <a className="text-xs underline" href={a.base_url} target="_blank" rel="noreferrer">{a.base_url}</a>}
              {a.description && <p className="text-xs text-muted-foreground mt-1">{a.description}</p>}
              <p className="text-[11px] text-muted-foreground mt-1">
                Last check: {a.last_check_at ? new Date(a.last_check_at).toLocaleString() : "never"}
                {a.last_check_status && ` (${a.last_check_status})`}
                {a.last_error && <span className="text-destructive ml-1">— {a.last_error}</span>}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={async () => { await pingApi(a); toast.success("Pinged"); void load(); }}>
                <Activity className="w-3.5 h-3.5 mr-1" /> Ping
              </Button>
              <Button size="sm" variant="ghost" onClick={async () => { if (confirm(`Delete ${a.name}?`)) { await deleteApi(a.id); void load(); } }}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-end"><Button variant="outline" onClick={load}><RefreshCcw className="w-4 h-4 mr-2" /> Refresh</Button></div>
    </div>
  );
}
