import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Link2, RefreshCcw, ShieldCheck, Github, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  getLocalManagementCfg,
  pullConfig,
  registerSite,
  clearCache,
  type ManagementCfg,
  type RemoteSiteConfig,
} from "@/cms-managed/lib/managementClient";
import {
  getGithubConnection,
  saveGithubConnection,
  testGithubConnection,
  type GithubConnection,
} from "@/lib/githubConnection";
import { syncParentConfig } from "@/lib/parentSync";
import { getSiteConfig } from "@/lib/parent";

function maskToken(t: string) {
  if (!t) return "(none)";
  if (t.length <= 8) return "•".repeat(t.length);
  return `${t.slice(0, 4)}${"•".repeat(Math.max(4, t.length - 8))}${t.slice(-4)}`;
}

export default function AdminManagementLink() {
  const [cfg, setCfg] = useState<ManagementCfg | null>(null);
  const [remote, setRemote] = useState<RemoteSiteConfig | null>(null);
  const [busy, setBusy] = useState<"idle" | "register" | "pull">("idle");

  // GitHub connection state
  const [siteId, setSiteId] = useState<string | null>(null);
  const [gh, setGh] = useState<GithubConnection>({
    site_id: null, repo: "", branch: "main", visibility: "private",
    pat: "", workflow_filename: "cms-update.yml", enabled: true,
  });
  const [ghBusy, setGhBusy] = useState<"idle" | "save" | "test" | "sync">("idle");

  const load = async () => {
    try {
      const c = await getLocalManagementCfg();
      setCfg(c);
      if (c.site_id && c.install_token) {
        const r = await pullConfig();
        setRemote(r);
      }
      const parent = await getSiteConfig().catch(() => null);
      const sid = parent?.site?.id || null;
      setSiteId(sid);
      const existing = await getGithubConnection(sid);
      if (existing) setGh({ ...existing, pat: existing.pat || "" });
      else setGh((g) => ({ ...g, site_id: sid }));
    } catch (e: any) {
      toast.error(`Cannot reach Parent Management: ${e?.message || e}`);
    }
  };

  useEffect(() => { void load(); }, []);

  const doRegister = async () => {
    setBusy("register");
    try {
      const r = await registerSite();
      toast.success(`Registered. site_id ${r.site_id.slice(0, 8)}…`);
      await load();
    } catch (e: any) {
      toast.error(`Register failed: ${e?.message || e}`);
    } finally {
      setBusy("idle");
    }
  };

  const doPull = async () => {
    setBusy("pull");
    try {
      const r = await pullConfig({ force: true });
      setRemote(r);
      toast.success("Config refreshed from Parent Management");
    } catch (e: any) {
      toast.error(`Pull failed: ${e?.message || e}`);
    } finally {
      setBusy("idle");
    }
  };

  const doSaveGh = async () => {
    setGhBusy("save");
    try {
      const saved = await saveGithubConnection({ ...gh, site_id: siteId, pat: gh.pat || null });
      setGh({ ...saved, pat: saved.pat || "" });
      toast.success("GitHub connection saved");
    } catch (e: any) {
      toast.error(`Save failed: ${e?.message || e}`);
    } finally {
      setGhBusy("idle");
    }
  };

  const doTestGh = async () => {
    setGhBusy("test");
    try {
      const t = await testGithubConnection({ ...gh, site_id: siteId });
      if (!t.ok) toast.error(t.error || "GitHub test failed");
      else toast.success(
        `Repo OK (${t.isPrivate ? "private" : "public"})${t.latestRelease ? ` — latest ${t.latestRelease.tag}` : " — no releases"}`,
      );
    } finally {
      setGhBusy("idle");
    }
  };

  const doSyncParent = async () => {
    setGhBusy("sync");
    try {
      const r = await syncParentConfig();
      if (!r.ok) toast.error(r.error || "Sync failed");
      else toast.success(`Mirrored ${r.synced} config rows from Parent Management`);
    } finally {
      setGhBusy("idle");
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Link2 className="h-5 w-5" /> Parent Management Link
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          This site pulls its GitHub repo, update channel, and release policy from the
          Parent Management Site. No GitHub credentials are stored here.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-3">
        <h2 className="font-semibold">Connection</h2>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="text-muted-foreground">Management URL</div>
          <div className="col-span-2 font-mono break-all">{cfg?.management_url || "—"}</div>
          <div className="text-muted-foreground">site_id</div>
          <div className="col-span-2 font-mono">{cfg?.site_id || <span className="italic text-muted-foreground">not registered yet</span>}</div>
          <div className="text-muted-foreground">install_token</div>
          <div className="col-span-2 font-mono">{maskToken(cfg?.install_token || "")}</div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button size="sm" onClick={doRegister} disabled={busy === "register"}>
            {busy === "register" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
            {cfg?.site_id ? "Re-register" : "Register this site"}
          </Button>
          <Button size="sm" variant="outline" onClick={doPull} disabled={busy === "pull" || !cfg?.site_id}>
            {busy === "pull" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
            Pull config now
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { clearCache(); toast.message("Local cache cleared"); void load(); }}>
            Clear local cache
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-3">
        <h2 className="font-semibold">Remote release config</h2>
        {remote ? (
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="text-muted-foreground">parent_repo</div>
            <div className="col-span-2 font-mono">{remote.parent_repo}</div>
            <div className="text-muted-foreground">default_branch</div>
            <div className="col-span-2 font-mono">{remote.default_branch}</div>
            <div className="text-muted-foreground">update workflow</div>
            <div className="col-span-2 font-mono">{remote.update_workflow_filename}</div>
            <div className="text-muted-foreground">channel</div>
            <div className="col-span-2 font-mono">{remote.channel}</div>
            <div className="text-muted-foreground">auto_update</div>
            <div className="col-span-2 font-mono">{String(remote.auto_update)}</div>
            <div className="text-muted-foreground">fetched</div>
            <div className="col-span-2 font-mono">{new Date(remote.fetched_at).toLocaleString()}</div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No config yet. Register this site and pull config.</p>
        )}
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <Download className="h-4 w-4" /> Parent Management → Local mirror
          </h2>
          <Button size="sm" variant="outline" onClick={doSyncParent} disabled={ghBusy === "sync"}>
            {ghBusy === "sync" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
            Sync now
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Pulls site, theme, header, footer, SEO, popup, services, team and dynamic sections
          from the Parent Management platform and stores them in <code>parent_site_mirror</code>
          on this site so editors and the runtime can read them locally.
        </p>
        <p className="text-xs text-muted-foreground">
          site_id: <span className="font-mono">{siteId || "—"}</span>
        </p>
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-3">
        <h2 className="font-semibold flex items-center gap-2">
          <Github className="h-4 w-4" /> Manual GitHub connection (fallback)
        </h2>
        <p className="text-sm text-muted-foreground">
          Optional. When set, CMS update checks and installs go directly to this repo
          (public or private with a Personal Access Token) instead of routing through
          Parent Management.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="gh-repo">Repository (owner/repo)</Label>
            <Input id="gh-repo" placeholder="pearllemon/parent-cms" value={gh.repo}
              onChange={(e) => setGh({ ...gh, repo: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="gh-branch">Branch</Label>
            <Input id="gh-branch" placeholder="main" value={gh.branch}
              onChange={(e) => setGh({ ...gh, branch: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="gh-vis">Visibility</Label>
            <select id="gh-vis" className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={gh.visibility}
              onChange={(e) => setGh({ ...gh, visibility: e.target.value as "public" | "private" })}>
              <option value="public">Public (no token required)</option>
              <option value="private">Private (PAT required)</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="gh-wf">Workflow filename</Label>
            <Input id="gh-wf" placeholder="cms-update.yml" value={gh.workflow_filename || ""}
              onChange={(e) => setGh({ ...gh, workflow_filename: e.target.value })} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="gh-pat">Personal Access Token (PAT)</Label>
            <Input id="gh-pat" type="password" placeholder="ghp_… (required for private repos and dispatching workflows)"
              value={gh.pat || ""} onChange={(e) => setGh({ ...gh, pat: e.target.value })} />
            <p className="text-xs text-muted-foreground">
              Needs scopes: <code>repo</code> + <code>workflow</code>. Stored in this site's database; never sent to Parent Management.
            </p>
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <Switch id="gh-en" checked={gh.enabled} onCheckedChange={(v) => setGh({ ...gh, enabled: v })} />
            <Label htmlFor="gh-en">Enabled — use this connection instead of Parent Management</Label>
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button size="sm" onClick={doSaveGh} disabled={ghBusy === "save" || !gh.repo}>
            {ghBusy === "save" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save
          </Button>
          <Button size="sm" variant="outline" onClick={doTestGh} disabled={ghBusy === "test" || !gh.repo}>
            {ghBusy === "test" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Test connection
          </Button>
        </div>
      </div>
    </div>
  );
}