// Manage Ed25519 signing keys for the release pipeline.
//
//   - Generate a new keypair in-browser.
//   - Public key is registered in cms_signing_keys (children trust it).
//   - Private key is persisted to localStorage AND offered as a one-click
//     download so the admin can back it up off-machine.
//   - Revoke compromised keys; revoked keys are no longer trusted by children.

import { useEffect, useState } from "react";
import {
  generateSigningKeyPair, persistLocalPrivateKey, loadLocalSigner,
  registerPublicKey, listPublicKeys, revokePublicKey, clearLocalSigner,
} from "@/lib/releaseSigning";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KeyRound, Download, Trash2, ShieldCheck, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

type Row = {
  id: string; key_id: string; algorithm: string; public_key: string;
  is_active: boolean; revoked_at: string | null; notes: string | null; created_at: string;
};

export default function AdminSigningKeys() {
  const [keys, setKeys] = useState<Row[]>([]);
  const [local, setLocal] = useState(loadLocalSigner());

  const load = async () => setKeys(await listPublicKeys());
  useEffect(() => { void load(); }, []);

  const generate = async () => {
    if (!confirm("Generate a NEW signing keypair?\n\nThe private key stays on this device. Back it up immediately — losing it means you can never sign updates for the trusting children with this key id again.")) return;
    try {
      const kp = await generateSigningKeyPair();
      persistLocalPrivateKey(kp.key_id, kp.private_key_b64);
      await registerPublicKey(kp.key_id, kp.public_key_b64, `generated ${new Date().toISOString()}`);
      // Download the private key as a backup.
      const blob = new Blob([JSON.stringify(kp, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${kp.key_id}.backup.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      setLocal(loadLocalSigner());
      toast.success("Key generated, registered, and backup downloaded");
      void load();
    } catch (e) {
      toast.error(String((e as Error).message));
    }
  };

  const revoke = async (id: string) => {
    if (!confirm("Revoke this signing key? Releases signed with it will fail verification on every child.")) return;
    await revokePublicKey(id);
    toast.success("Key revoked");
    void load();
  };

  const clearLocal = () => {
    if (!confirm("Remove the local private key from this browser? You will not be able to sign new releases without re-importing your backup.")) return;
    clearLocalSigner();
    setLocal(null);
  };

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl flex items-center gap-2">
            <KeyRound className="w-7 h-7" /> Signing keys
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Ed25519 keys used to sign release manifests. Children verify every release against this key set BEFORE running migrations or loading code.
          </p>
        </div>
        <Button onClick={generate}><KeyRound className="w-4 h-4 mr-2" /> Generate new key</Button>
      </header>

      <Card className="p-5">
        <h2 className="font-display text-lg mb-2 flex items-center gap-2">
          {local ? <ShieldCheck className="w-5 h-5 text-emerald-500" /> : <ShieldAlert className="w-5 h-5 text-amber-500" />}
          Local signer
        </h2>
        {local ? (
          <div className="text-sm space-y-2">
            <div>Active key id: <code>{local.key_id}</code></div>
            <Button size="sm" variant="outline" onClick={clearLocal}>
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear local private key
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No private key in this browser. Generate one, or import a backup file by pasting its JSON into your browser console as <code>localStorage.setItem(...)</code>.
          </p>
        )}
      </Card>

      <div className="bg-background border rounded-2xl divide-y">
        {keys.length === 0 && <div className="p-6 text-sm text-muted-foreground">No registered keys yet.</div>}
        {keys.map((k) => (
          <div key={k.id} className="p-4 flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <code className="text-sm">{k.key_id}</code>
                <Badge variant="outline">{k.algorithm}</Badge>
                {k.is_active
                  ? <Badge className="gap-1"><ShieldCheck className="w-3 h-3" /> Trusted</Badge>
                  : <Badge variant="destructive" className="gap-1"><ShieldAlert className="w-3 h-3" /> Revoked</Badge>}
              </div>
              <p className="text-xs text-muted-foreground mt-1 break-all">pub: {k.public_key}</p>
              {k.notes && <p className="text-xs text-muted-foreground mt-1">{k.notes}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" variant="ghost" onClick={() => {
                navigator.clipboard.writeText(JSON.stringify({ key_id: k.key_id, public_key_b64: k.public_key }, null, 2));
                toast.success("Public key copied");
              }}>
                <Download className="w-3.5 h-3.5 mr-1" /> Copy pubkey
              </Button>
              {k.is_active && (
                <Button size="sm" variant="destructive" onClick={() => revoke(k.id)}>
                  Revoke
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
