// Child setup wizard — generates a TanStack Start–ready bootstrap that:
//   - Loads from src/routes/__root.tsx (no Vite main.tsx in TanStack Start)
//   - Verifies the Ed25519 signature of every release BEFORE applying it
//   - Routes SQL migrations through a `cms-migrate` edge function in the
//     CHILD project (service_role + exec_cms_migration RPC)
//   - Loads the engine SDK via native dynamic `import()` only — no eval
//   - Consumes `@our-org/cms-core` as a real versioned package
//
// The wizard embeds the parent's currently-active trusted public keys directly
// into the snippet so verification works fully offline on first boot.

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Wand2, Copy, Check, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { listPublicKeys } from "@/lib/releaseSigning";

const PARENT_RELEASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cms-release`;
const PARENT_SDK_ORIGIN = new URL(import.meta.env.VITE_SUPABASE_URL).origin;

type Row = { key_id: string; public_key: string; is_active: boolean };

export default function AdminSetupWizard() {
  const [siteName, setSiteName] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [trusted, setTrusted] = useState<Row[]>([]);

  useEffect(() => {
    listPublicKeys().then((rows) =>
      setTrusted((rows as Row[]).filter((r) => r.is_active))
    );
  }, []);

  const trustedLiteral = useMemo(
    () => JSON.stringify(
      trusted.map((k) => ({ key_id: k.key_id, public_key_b64: k.public_key })),
      null, 2,
    ),
    [trusted],
  );

  const envSnippet = useMemo(() => `# .env.local — mark this project as a child of the parent CMS
VITE_CMS_MODE=child
VITE_PARENT_RELEASE_URL=${PARENT_RELEASE_URL}
VITE_PARENT_SDK_ORIGIN=${PARENT_SDK_ORIGIN}
`, []);

  const trustedKeysFile = `// src/cms/trusted-keys.ts — embedded Ed25519 public keys.
// Bake-in trust. Children verify every release against this set BEFORE running
// migrations or loading any engine code. Rotate by shipping a new build.
export const TRUSTED_KEYS = ${trustedLiteral} as const;
`;

  const bootstrap = useMemo(() => `// src/cms-bootstrap.ts — production bootstrap (TanStack Start).
// Calls the REAL @our-org/cms-core bootstrap. Do not edit by hand.
import { bootstrapCmsCore } from "@our-org/cms-core/bootstrap";
import { supabase } from "@/integrations/supabase/client";
import { TRUSTED_KEYS } from "@/cms/trusted-keys";

export const cmsCorePromise = bootstrapCmsCore({
  parentReleaseUrl: import.meta.env.VITE_PARENT_RELEASE_URL,
  trustedPublicKeys: [...TRUSTED_KEYS],
  allowedSdkOrigins: [import.meta.env.VITE_PARENT_SDK_ORIGIN],
  siteName: ${JSON.stringify(siteName || null)},
  siteUrl: ${JSON.stringify(siteUrl || null)},
  mode: "child",

  // Forward the VERIFIED step to a child-owned edge function that calls
  // exec_cms_migration with service_role. Bootstrap only invokes this AFTER
  // the Ed25519 signature has been verified locally.
  runMigration: async (ctx) => {
    const { error } = await supabase.functions.invoke("cms-migrate", { body: ctx });
    if (error) throw error;
  },
});

cmsCorePromise.then((r) => {
  // eslint-disable-next-line no-console
  console.info("[cms-core]", { site: r.siteId, version: r.version, verified: r.verified, sdk: r.sdkLoaded });
});
`, [siteName, siteUrl]);

  const rootRoute = `// src/routes/__root.tsx — TanStack Start root.
// Import the bootstrap ONCE here so the CMS initializes on app startup.
import "@/cms-bootstrap";

import { createRootRoute, Outlet } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: () => <Outlet />,
});
`;

  const childEdgeFn = `// supabase/functions/cms-migrate/index.ts — runs in the CHILD project.
// Receives a SIGNATURE-VERIFIED migration step and forwards to exec_cms_migration.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const body = await req.json();
  const { step, version, previousVersion, signature_verified, signing_key_id, payload_hash } = body || {};
  if (signature_verified !== true) {
    return new Response(JSON.stringify({ error: "unverified" }), { status: 400, headers: cors });
  }
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data, error } = await sb.rpc("exec_cms_migration", {
    _site_id: req.headers.get("x-site-id") || "unknown",
    _migration_id: step.id,
    _version: version,
    _order_index: step.order_index,
    _kind: step.kind,
    _payload: step.payload,
    _signature_verified: true,
    _current_version: previousVersion,
  });
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: cors });
  return new Response(JSON.stringify({ ok: true, data, payload_hash, signing_key_id }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
`;

  const installSnippet = `# 1) Add the versioned CMS Core package + supabase client
bun add @our-org/cms-core @supabase/supabase-js

# 2) Add the exec_cms_migration RPC to the child DB (copy from the parent's
#    20260614_secure_release_pipeline migration — service_role only, forward-
#    only, signature-gated).
`;

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key); toast.success("Copied");
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="font-display text-3xl flex items-center gap-2">
          <Wand2 className="w-7 h-7" /> Child setup wizard
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Generates a signed, TanStack-Start–ready bootstrap. Releases are Ed25519-signed by the parent and verified against the embedded trusted-key set before any migration runs or any code is loaded.
        </p>
      </header>

      {trusted.length === 0 && (
        <Card className="p-4 border-destructive/40 bg-destructive/5 text-sm flex items-start gap-2">
          <ShieldAlert className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">No active signing key found.</p>
            <p className="text-muted-foreground">Generate one in <a href="/admin/signing-keys" className="underline">Signing Keys</a> first — without trusted keys, children will refuse every release.</p>
          </div>
        </Card>
      )}

      <Card className="p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Display name (optional)</Label>
            <Input value={siteName} onChange={(e) => setSiteName(e.target.value)} placeholder="Acme Marketing Site" />
          </div>
          <div>
            <Label>Site URL (optional)</Label>
            <Input value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} placeholder="https://acme.example.com" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Site ID is auto-generated on first boot and persisted in the child's localStorage.
        </p>
      </Card>

      <Snippet label="1. Install in the child project" code={installSnippet} copied={copied === "i"} onCopy={() => copy(installSnippet, "i")} />
      <Snippet label="2. .env.local" code={envSnippet} copied={copied === "env"} onCopy={() => copy(envSnippet, "env")} />
      <Snippet label="3. src/cms/trusted-keys.ts (embedded public keys)" code={trustedKeysFile} copied={copied === "tk"} onCopy={() => copy(trustedKeysFile, "tk")} />
      <Snippet label="4. src/cms-bootstrap.ts" code={bootstrap} copied={copied === "boot"} onCopy={() => copy(bootstrap, "boot")} />
      <Snippet label="5. src/routes/__root.tsx (import the bootstrap)" code={rootRoute} copied={copied === "root"} onCopy={() => copy(rootRoute, "root")} />
      <Snippet label="6. supabase/functions/cms-migrate/index.ts (child edge function)" code={childEdgeFn} copied={copied === "edge"} onCopy={() => copy(childEdgeFn, "edge")} />

      <Card className="p-5">
        <h2 className="font-display text-lg mb-2">How it works end-to-end</h2>
        <ol className="list-decimal pl-5 space-y-1 text-sm text-muted-foreground">
          <li>Parent admin cuts a release, signs it with the Ed25519 private key (only on their machine).</li>
          <li>Children fetch the manifest, verify the signature against the embedded keys, and reject anything unsigned, tampered, or downgraded.</li>
          <li>Verified SQL migrations are forwarded to the child's <code>cms-migrate</code> edge function, which calls <code>exec_cms_migration</code> with <code>service_role</code>.</li>
          <li>The engine SDK is loaded via native <code>import()</code> from the allow-listed parent origin only — no <code>eval</code> or remote string execution.</li>
        </ol>
      </Card>
    </div>
  );
}

function Snippet({ label, code, copied, onCopy }: { label: string; code: string; copied: boolean; onCopy: () => void }) {
  return (
    <Card className="p-0 overflow-hidden">
      <div className="flex items-center justify-between border-b px-4 py-2 bg-muted/30">
        <span className="text-sm font-medium">{label}</span>
        <Button size="sm" variant="ghost" onClick={onCopy}>
          {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="p-4 text-xs overflow-x-auto bg-background"><code>{code}</code></pre>
    </Card>
  );
}
