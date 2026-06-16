import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCcw, GitBranch, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type CheckResult = {
  ok: boolean;
  currentVersion: string | null;
  currentSha: string | null;
  latestVersion: string | null;
  latestSha: string | null;
  publishedAt: string | null;
  changelogUrl: string | null;
  updateAvailable: boolean;
  parentRepo: string;
};

async function readLockFile(): Promise<{ version: string | null; sha: string | null }> {
  try {
    const res = await fetch("/cms.lock.json", { cache: "no-store" });
    if (!res.ok) return { version: null, sha: null };
    const j = await res.json();
    return { version: j.version ?? j.tag ?? null, sha: j.sha ?? null };
  } catch {
    return { version: null, sha: null };
  }
}

export default function CmsUpdateCard({ childRepo }: { childRepo?: string }) {
  const [checking, setChecking] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);

  const check = async () => {
    setChecking(true);
    try {
      const local = await readLockFile();
      const { data, error } = await supabase.functions.invoke("cms-self-update-check", {
        body: { currentVersion: local.version, currentSha: local.sha },
      });
      if (error) throw error;
      setResult(data as CheckResult);
    } catch (e: any) {
      toast.error(`Update check failed: ${e?.message || e}`);
    } finally {
      setChecking(false);
    }
  };

  const apply = async () => {
    if (!childRepo) {
      toast.error('No child repo configured. Set "childRepo" prop or cms.config.json.');
      return;
    }
    setApplying(true);
    try {
      const { data, error } = await supabase.functions.invoke("cms-self-update-apply", {
        body: { childRepo, targetRef: result?.latestSha || result?.latestVersion || undefined },
      });
      if (error) throw error;
      const url = (data as any)?.actionsUrl;
      toast.success("Update dispatched. The PR will appear in your repo shortly.");
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast.error(`Apply failed: ${e?.message || e}`);
    } finally {
      setApplying(false);
    }
  };

  useEffect(() => { void check(); }, []);

  return (
    <div className="rounded-lg border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold">CMS Updates</h3>
        </div>
        <Button size="sm" variant="ghost" onClick={check} disabled={checking}>
          {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          <span className="ml-2">Check</span>
        </Button>
      </div>

      {result ? (
        <div className="text-sm space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-xs text-muted-foreground">Installed</div>
              <div className="font-mono">{result.currentVersion || result.currentSha?.slice(0, 7) || "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Latest</div>
              <div className="font-mono">{result.latestVersion || result.latestSha?.slice(0, 7) || "—"}</div>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2">
            <span className={`text-xs px-2 py-1 rounded ${result.updateAvailable ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
              {result.updateAvailable ? "Update available" : "Up to date"}
            </span>
            <div className="flex gap-2">
              {result.changelogUrl && (
                <a href={result.changelogUrl} target="_blank" rel="noreferrer" className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground">
                  Changelog <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              )}
              <Button size="sm" disabled={!result.updateAvailable || applying} onClick={apply}>
                {applying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Install update
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground pt-1">
            Source: <span className="font-mono">{result.parentRepo}</span>
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Checking GitHub for the latest CMS release…</p>
      )}
    </div>
  );
}