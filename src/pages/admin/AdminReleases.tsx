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
import { Rocket, RotateCcw, CheckCircle2, AlertTriangle, Plus, Upload, ShieldCheck, ShieldAlert, PenLine } from "lucide-react";
import { toast } from "sonner";
import BuildReleaseDialog from "@/components/admin/BuildReleaseDialog";

export default function AdminReleases() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    setReleases(await listReleases());
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);



export default function AdminReleases() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    version: "",
    changelog: "",
    sdk_url: "",
    min_compatible_child_version: "",
  });

  const load = async () => {
    setLoading(true);
    setReleases(await listReleases());
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const submit = async () => {
    if (!form.version.trim()) return toast.error("Version required (e.g. 1.0.0)");
    try {
      await cutRelease({
        version: form.version.trim(),
        changelog: form.changelog || undefined,
        sdk_url: form.sdk_url || undefined,
        min_compatible_child_version: form.min_compatible_child_version || undefined,
        manifest: {},
        migrations: [],
      });
      toast.success(`Release v${form.version} cut`);
      setOpen(false);
      setForm({ version: "", changelog: "", sdk_url: "", min_compatible_child_version: "" });
      void load();
    } catch (e) {
      toast.error(String((e as Error).message));
    }
  };

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
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Cut release</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Cut new release</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Version (semver)</Label>
                <Input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} placeholder="1.0.0" />
              </div>
              <div>
                <Label>Changelog</Label>
                <Textarea rows={4} value={form.changelog} onChange={(e) => setForm({ ...form, changelog: e.target.value })} placeholder="What changed in this release..." />
              </div>
              <div>
                <Label>SDK URL (optional)</Label>
                <Input value={form.sdk_url} onChange={(e) => setForm({ ...form, sdk_url: e.target.value })} placeholder="https://.../cms-core.{ver}.js" />
              </div>
              <div>
                <Label>Min compatible child shim (optional)</Label>
                <Input value={form.min_compatible_child_version} onChange={(e) => setForm({ ...form, min_compatible_child_version: e.target.value })} placeholder="0.1.0" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submit}>Publish</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
              <div className="mt-1">
                {r.signature
                  ? <Badge variant="outline" className="gap-1"><ShieldCheck className="w-3 h-3" /> signed · {r.signing_key_id}</Badge>
                  : <Badge variant="destructive" className="gap-1"><ShieldAlert className="w-3 h-3" /> unsigned — children will refuse</Badge>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <UploadBundleButton release={r} onDone={load} />
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
    const signer = loadLocalSigner();
    if (!signer) return toast.error("No local signing key — generate one in Signing Keys.");
    setBusy(true);
    try {
      const migrations = await listMigrationsForVersion(release.version);
      const signed = await signReleasePayload({
        version: release.version,
        sdk_url: release.sdk_url,
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
      <PenLine className="w-3.5 h-3.5 mr-1" /> {release.signature ? "Re-sign" : "Sign"}
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
