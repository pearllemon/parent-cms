import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Link2, RefreshCcw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  getLocalManagementCfg,
  pullConfig,
  registerSite,
  clearCache,
  type ManagementCfg,
  type RemoteSiteConfig,
} from "@/cms-managed/lib/managementClient";

function maskToken(t: string) {
  if (!t) return "(none)";
  if (t.length <= 8) return "•".repeat(t.length);
  return `${t.slice(0, 4)}${"•".repeat(Math.max(4, t.length - 8))}${t.slice(-4)}`;
}

export default function AdminManagementLink() {
  const [cfg, setCfg] = useState<ManagementCfg | null>(null);
  const [remote, setRemote] = useState<RemoteSiteConfig | null>(null);
  const [busy, setBusy] = useState<"idle" | "register" | "pull">("idle");

  const load = async () => {
    try {
      const c = await getLocalManagementCfg();
      setCfg(c);
      if (c.site_id && c.install_token) {
        const r = await pullConfig();
        setRemote(r);
      }
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
    </div>
  );
}