import { useEffect, useRef, useState } from "react";
import {
  listReleases, recallRelease, promoteRelease,
  listMigrationsForVersion,
  type Release,
} from "@/lib/distribution";
import { uploadSdkBundle, updateReleaseSdkUrl } from "@/lib/sdkUpload";
import {
  loadLocalSigner, signReleasePayload, attachSignatureToRelease,
} from "@/lib/releaseSigning";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Rocket, RotateCcw, CheckCircle2, AlertTriangle, Plus, Upload, ShieldCheck, ShieldAlert, PenLine, PackageOpen } from "lucide-react";
import { toast } from "sonner";
import BuildReleaseDialog from "@/components/admin/BuildReleaseDialog";

export default function AdminReleases() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setReleases(await listReleases());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load releases");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl flex items-center gap-2">
            <Rocket className="w-7 h-7" /> Releases
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Cut new versions of the CMS engine. Children pull the latest version automatically on next boot.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" /> Build release</Button>
        <BuildReleaseDialog open={open} onOpenChange={setOpen} onDone={load} />
      </header>


      <div className="bg-background border rounded-2xl divide-y">
        {loading && <div className="p-6 text-sm text-muted-foreground">Loading…</div>}
        {!loading && releases.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No releases yet. Cut your first release to start pushing engine updates to child sites.
          </div>
        )}
        {releases.map((r) => (
          <div key={r.id} className="p-4 flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-display text-lg">v{r.version}</span>
                {r.is_latest && !r.recalled && (
                  <Badge variant="default" className="gap-1"><CheckCircle2 className="w-3 h-3" /> Latest</Badge>
                )}
                {r.recalled && (
                  <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" /> Recalled</Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {new Date(r.published_at).toLocaleString()}
                </span>
              </div>
              {r.changelog && (
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-4">{r.changelog}</p>
              )}
              {r.sdk_url && (
                <p className="text-xs text-muted-foreground mt-1 truncate">SDK: <code>{r.sdk_url}</code></p>
              )}
              {r.package_url && (
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  ZIP: <code>{r.package_sha256?.slice(0, 12)}…</code> · {Math.round((r.package_size || 0) / 1024)} KB
                </p>
              )}
              <div className="mt-1">
                {r.signature
                  ? <Badge variant="outline" className="gap-1"><ShieldCheck className="w-3 h-3" /> signed · {r.signing_key_id}</Badge>
                  : <Badge variant="destructive" className="gap-1"><ShieldAlert className="w-3 h-3" /> unsigned — children will refuse</Badge>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {r.package_url && (
                <Button size="sm" variant="outline" asChild>
                  <a href={r.package_url} target="_blank" rel="noreferrer">
                    <PackageOpen className="w-3.5 h-3.5 mr-1" /> ZIP
                  </a>
                </Button>
              )}
              {!r.signature && <UploadBundleButton release={r} onDone={load} />}
              <SignButton release={r} onDone={load} />
              {!r.is_latest && !r.recalled && (
                <Button size="sm" variant="outline" onClick={async () => { await promoteRelease(r.id); toast.success("Promoted"); void load(); }}>
                  Promote
                </Button>
              )}
              <Button size="sm" variant={r.recalled ? "outline" : "destructive"}
                onClick={async () => { await recallRelease(r.id, !r.recalled); toast.success(r.recalled ? "Restored" : "Recalled"); void load(); }}>
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                {r.recalled ? "Restore" : "Recall"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SignButton({ release, onDone }: { release: Release; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const handle = async () => {
    if (release.signature) return toast.message("Signed releases are immutable. Build a new version for changes.");
    const signer = loadLocalSigner();
    if (!signer) return toast.error("No local signing key — generate one in Signing Keys.");
    setBusy(true);
    try {
      const migrations = await listMigrationsForVersion(release.version);
      const signed = await signReleasePayload({
        version: release.version,
        sdk_url: release.sdk_url,
        package_url: release.package_url,
        package_sha256: release.package_sha256,
        package_size: release.package_size,
        package_format: release.package_format,
        min_compatible_child_version: release.min_compatible_child_version,
        manifest: release.manifest || {},
        migrations: migrations.map((m) => ({
          order_index: m.order_index, kind: m.kind, payload: m.payload, reversible: m.reversible,
        })),
      }, signer);
      await attachSignatureToRelease(release.id, signed);
      toast.success(`Signed with ${signed.signing_key_id}`);
      onDone();
    } catch (e) {
      toast.error(String((e as Error).message));
    } finally { setBusy(false); }
  };
  return (
    <Button size="sm" variant={release.signature ? "ghost" : "default"} disabled={busy} onClick={handle}>
      <PenLine className="w-3.5 h-3.5 mr-1" /> {release.signature ? "Signed" : "Sign"}
    </Button>
  );
}

function UploadBundleButton({ release, onDone }: { release: Release; onDone: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadSdkBundle(release.version, file);
      await updateReleaseSdkUrl(release.id, url);
      toast.success("SDK bundle uploaded");
      onDone();
    } catch (err) {
      toast.error(String((err as Error).message));
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };
  return (
    <>
      <input ref={ref} type="file" accept=".js,application/javascript" className="hidden" onChange={handle} />
      <Button size="sm" variant="outline" disabled={busy} onClick={() => ref.current?.click()}>
        <Upload className="w-3.5 h-3.5 mr-1" /> {busy ? "Uploading…" : "Upload SDK"}
      </Button>
    </>
  );
}
