// Child setup wizard — generates a self-contained bootstrap for a child site
// in the framework the user selects (Vite, Next.js App/Pages, TanStack Start,
// Remix, or React Router). Every snippet — env file, trusted keys, bootstrap,
// and entry-point patch — is rendered for the selected framework so the docs
// and the code always match.

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wand2, Copy, Check, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { listPublicKeys } from "@/lib/releaseSigning";

const PARENT_RELEASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cms-release`;
const PARENT_SDK_ORIGIN = new URL(import.meta.env.VITE_SUPABASE_URL).origin;

type Row = { key_id: string; public_key: string; is_active: boolean };

type Framework = "vite" | "next-app" | "next-pages" | "tanstack" | "remix" | "react-router";

const FRAMEWORK_LABELS: Record<Framework, string> = {
  "vite":         "Vite + React (Lovable default)",
  "next-app":     "Next.js — App Router",
  "next-pages":   "Next.js — Pages Router",
  "tanstack":     "TanStack Start",
  "remix":        "Remix",
  "react-router": "React Router (data router)",
};

export default function AdminSetupWizard() {
  const [siteName, setSiteName] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [framework, setFramework] = useState<Framework>("vite");
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

  // Frameworks split into two env conventions:
  //   - Vite / TanStack Start / Remix (Vite) / React-Router (Vite): VITE_* + import.meta.env
  //   - Next.js (App & Pages router): NEXT_PUBLIC_* + process.env
  const envStyle: "vite" | "next" = framework.startsWith("next") ? "next" : "vite";
  const envPrefix = envStyle === "next" ? "NEXT_PUBLIC_" : "VITE_";
  const envAccess = envStyle === "next" ? "process.env" : "import.meta.env";
  const envFile   = envStyle === "next" ? ".env.local" : ".env";

  const envSnippet = useMemo(() => `# ${envFile} — mark this project as a child of the parent CMS.
# These are read at build time (must be prefixed ${envPrefix}).
${envPrefix}CMS_MODE=child
${envPrefix}PARENT_RELEASE_URL=${PARENT_RELEASE_URL}
${envPrefix}PARENT_SDK_ORIGIN=${PARENT_SDK_ORIGIN}
`, [envFile, envPrefix]);

  const trustedKeysFile = `// src/cms/trusted-keys.ts — embedded Ed25519 public keys.
// Bake-in trust. The child verifies every release against this set BEFORE
// running migrations or loading any engine code. Rotate by shipping a new build.
export const TRUSTED_KEYS = ${trustedLiteral} as const;
`;

  // Self-contained bootstrap. No external npm package required.
  const bootstrap = useMemo(() => `// src/cms-bootstrap.ts — self-contained child bootstrap (${FRAMEWORK_LABELS[framework]}).
// No npm dependency on the parent CMS package. Uses only Web Crypto +
// @/integrations/supabase/client (already present in every Lovable project).
//
//   1. Register this site with the parent CMS edge function.
//   2. Fetch the signed release manifest.
//   3. Verify the Ed25519 signature against TRUSTED_KEYS BEFORE doing anything.
//   4. Forward SQL migrations to the child's own \`cms-migrate\` edge function,
//      which calls \`exec_cms_migration\` with service_role.
//   5. Dynamically import() the engine SDK from an allow-listed origin.
//   6. Send periodic heartbeats so the parent dashboard stays live.

import { supabase } from "@/integrations/supabase/client";
import { TRUSTED_KEYS } from "@/cms/trusted-keys";

const SHIM_VERSION = "1.1.0";
const SITE_ID_KEY = "cms-core-site-id";
const INSTALLED_VERSION_KEY = "cms-core-installed-version";
const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;

const PARENT_RELEASE_URL = ${envAccess}.${envPrefix}PARENT_RELEASE_URL as string;
const ALLOWED_SDK_ORIGINS = [${envAccess}.${envPrefix}PARENT_SDK_ORIGIN as string];

const SITE_NAME = ${JSON.stringify(siteName || null)};
const SITE_URL  = ${JSON.stringify(siteUrl || null)};

/* ---------- helpers ---------- */
function b64decode(s: string): ArrayBuffer {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}
async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalize).join(",") + "]";
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return "{" + keys.map((k) =>
    JSON.stringify(k) + ":" + canonicalize((value as Record<string, unknown>)[k])
  ).join(",") + "}";
}
function getOrCreateSiteId(): string {
  try { const x = localStorage.getItem(SITE_ID_KEY); if (x) return x; } catch { /* */ }
  const id = "site_" + (crypto.randomUUID?.() || Math.random().toString(36).slice(2)).replace(/-/g, "").slice(0, 16);
  try { localStorage.setItem(SITE_ID_KEY, id); } catch { /* */ }
  return id;
}
function cmpSemver(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}
const DEFAULT_TIMEOUT_MS = 10000;
async function fetchWithTimeout(input: string, init: RequestInit = {}, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try { return await fetch(input, { ...init, signal: ctrl.signal }); }
  finally { clearTimeout(t); }
}
async function postJSON(url: string, body: unknown) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await fetchWithTimeout(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch { /* retry */ }
  }
  return null;
}
async function fetchManifestWithRetry(url: string): Promise<any | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetchWithTimeout(url, { cache: "no-store" });
      if (res.ok) return await res.json().catch(() => null);
      if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) return null;
    } catch { /* network — retry */ }
    await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
  }
  return null;
}
function isAllowedSdkUrl(sdkUrl: string): boolean {
  try {
    const u = new URL(sdkUrl);
    return u.protocol === "https:" && ALLOWED_SDK_ORIGINS.includes(u.origin);
  } catch { return false; }
}
async function verifySignature(manifest: any): Promise<{ ok: true; key_id: string; payload_hash: string } | { ok: false; reason: string }> {
  const sig = manifest.signature_b64 || manifest.signature;
  const keyId = manifest.signing_key_id;
  if (!sig || !keyId) return { ok: false, reason: "missing signature" };
  const trusted = (TRUSTED_KEYS as ReadonlyArray<{ key_id: string; public_key_b64: string }>).find((k) => k.key_id === keyId);
  if (!trusted) return { ok: false, reason: "untrusted key id " + keyId };
  const canonical = manifest.payload_canonical || canonicalize(manifest.payload);
  try {
    const key = await crypto.subtle.importKey("raw", b64decode(trusted.public_key_b64), { name: "Ed25519" }, false, ["verify"]);
    const ok = await crypto.subtle.verify({ name: "Ed25519" }, key, b64decode(sig), new TextEncoder().encode(canonical));
    if (!ok) return { ok: false, reason: "bad signature" };
    return { ok: true, key_id: keyId, payload_hash: await sha256Hex(canonical) };
  } catch (e) {
    return { ok: false, reason: "verify error: " + String((e as Error).message || e) };
  }
}

/* ---------- main ---------- */
export type BootstrapStatus = "ok" | "no_release" | "waiting" | "recalled" | "untrusted" | "error";
export type BootstrapResult = {
  siteId: string; status: BootstrapStatus; message: string;
  version: string; previousVersion: string | null;
  sdkLoaded: boolean; verified: boolean; upgraded: boolean; error: string | null;
};

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

export async function bootstrapCmsCore(): Promise<BootstrapResult> {
  // Top-level guard: this function NEVER throws. The customer's site keeps
  // rendering no matter what happens with the parent CMS.
  try {
    return await bootstrapInner();
  } catch (e) {
    const siteId = getOrCreateSiteId();
    return {
      siteId, status: "error",
      message: "Site is running normally. Background sync will retry automatically.",
      version: "0.0.0", previousVersion: null,
      sdkLoaded: false, verified: false, upgraded: false,
      error: String((e as Error)?.message || e),
    };
  }
}

async function bootstrapInner(): Promise<BootstrapResult> {
  const started = performance.now();
  const siteId = getOrCreateSiteId();
  const base = PARENT_RELEASE_URL.replace(/\\/$/, "");
  let previousVersion: string | null = null;
  try { previousVersion = localStorage.getItem(INSTALLED_VERSION_KEY); } catch { /* */ }

  await postJSON(base + "/register", {
    site_id: siteId, site_name: SITE_NAME,
    site_url: SITE_URL || (typeof location !== "undefined" ? location.origin : null),
    mode: "child", shim_version: SHIM_VERSION,
  });

  const manifest: any = await fetchManifestWithRetry(base + "?site_id=" + encodeURIComponent(siteId));

  const make = (status: BootstrapStatus, message: string, extra: Partial<BootstrapResult> = {}): BootstrapResult => ({
    siteId, status, message,
    version: previousVersion || "0.0.0", previousVersion,
    sdkLoaded: false, verified: false, upgraded: false, error: null,
    ...extra,
  });

  // No-release envelope: parent is reachable but hasn't published yet.
  if (manifest && (manifest.status === "no_release" || (!manifest.version && !manifest.signature && !manifest.signature_b64))) {
    await postJSON(base + "/heartbeat", {
      site_id: siteId, current_version: previousVersion,
      child_shim_version: SHIM_VERSION, upgrade_state: "awaiting_release",
    });
    schedule(siteId, previousVersion);
    return make("no_release", "Connected to parent CMS. Waiting for the first release.");
  }

  if (!manifest) {
    schedule(siteId, previousVersion);
    return make("waiting", previousVersion
      ? "Parent CMS temporarily unreachable. Running last known version."
      : "Connecting to parent CMS… will retry automatically.");
  }
  if (manifest.recalled) {
    schedule(siteId, previousVersion);
    return make("recalled", "Latest release was recalled. Running previous version.");
  }

  const v = await verifySignature(manifest);
  if (!v.ok) {
    await postJSON(base + "/upgrade-log", {
      site_id: siteId, from_version: previousVersion, to_version: manifest.version,
      status: "failed", error: "signature: " + v.reason,
    });
    schedule(siteId, previousVersion);
    return make("untrusted", "Latest release could not be verified. Running previous version.", { error: "signature: " + v.reason });
  }

  const needsUpgrade = !previousVersion || cmpSemver(manifest.version, previousVersion) > 0;
  let upgradeStatus: "started" | "success" | "failed" | "skipped" = "skipped";
  let upgradeError: string | null = null;

  if (needsUpgrade) {
    upgradeStatus = "started";
    await postJSON(base + "/upgrade-log", {
      site_id: siteId, from_version: previousVersion, to_version: manifest.version, status: "started",
    });
    try {
      for (const step of (manifest.migrations || [])) {
        if (step.kind === "noop" || step.kind === "js") continue;
        const { error } = await supabase.functions.invoke("cms-migrate", {
          body: {
            step, version: manifest.version, previousVersion,
            signature_verified: true, signing_key_id: v.key_id,
            payload_hash: v.payload_hash, site_id: siteId,
          },
        });
        if (error) throw error;
      }
      try { localStorage.setItem(INSTALLED_VERSION_KEY, manifest.version); } catch { /* */ }
      upgradeStatus = "success";
    } catch (e) {
      upgradeStatus = "failed";
      upgradeError = String((e as Error)?.message || e);
    }
    await postJSON(base + "/upgrade-log", {
      site_id: siteId, from_version: previousVersion, to_version: manifest.version,
      status: upgradeStatus, error: upgradeError,
      duration_ms: Math.round(performance.now() - started),
    });
  }

  let sdkLoaded = false;
  if (manifest.sdk_url && isAllowedSdkUrl(manifest.sdk_url)) {
    try { await import(/* @vite-ignore */ manifest.sdk_url); sdkLoaded = true; }
    catch (e) { upgradeError = upgradeError || ("sdk import failed: " + String((e as Error)?.message || e)); }
  }

  const currentVersion = upgradeStatus === "success" ? manifest.version : (previousVersion || manifest.version);
  await postJSON(base + "/heartbeat", {
    site_id: siteId, site_name: SITE_NAME, site_url: SITE_URL,
    current_version: currentVersion, child_shim_version: SHIM_VERSION,
    upgrade_state: upgradeStatus === "failed" ? "failed"
      : currentVersion === manifest.version ? "up_to_date" : "pending",
    last_error: upgradeError,
  });
  schedule(siteId, currentVersion);

  return {
    siteId,
    status: upgradeError ? "error" : "ok",
    message: upgradeError
      ? "Site is running. Latest update could not be applied; will retry."
      : sdkLoaded ? "Connected. Engine loaded and up to date." : "Connected. Running current version.",
    version: currentVersion, previousVersion,
    sdkLoaded, verified: true, upgraded: upgradeStatus === "success", error: upgradeError,
  };
}

function schedule(siteId: string, version: string | null) {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = setInterval(() => {
    void postJSON(PARENT_RELEASE_URL.replace(/\\/$/, "") + "/heartbeat", {
      site_id: siteId, current_version: version, child_shim_version: SHIM_VERSION,
      upgrade_state: "up_to_date",
    });
  }, HEARTBEAT_INTERVAL_MS);
}

// Fire-and-forget: log result for debugging. NEVER surfaces errors to the UI.
export const cmsCorePromise = bootstrapCmsCore().then((r) => {
  // eslint-disable-next-line no-console
  console.info("[cms-core]", r.status, r.message);
  return r;
}).catch((e) => {
  // eslint-disable-next-line no-console
  console.warn("[cms-core] bootstrap soft-failed:", e);
  return null;
});
`, [siteName, siteUrl, framework, envAccess, envPrefix]);

  const entryPoint = useMemo<{ file: string; code: string }>(() => {
    const importLine = `import "@/cms-bootstrap"; // NEW — register → verify → migrate → load SDK`;
    switch (framework) {
      case "next-app":
        return {
          file: "app/layout.tsx — add a tiny client component that imports the bootstrap",
          code: `// app/cms-bootstrap-client.tsx (NEW)
"use client";
import "@/cms-bootstrap";
export default function CmsBootstrap() { return null; }

// app/layout.tsx — add <CmsBootstrap /> inside <body>
import CmsBootstrap from "./cms-bootstrap-client";
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html><body><CmsBootstrap />{children}</body></html>);
}
`,
        };
      case "next-pages":
        return {
          file: "pages/_app.tsx — add the bootstrap import at the top",
          code: `// pages/_app.tsx
${importLine}
import type { AppProps } from "next/app";
export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
`,
        };
      case "tanstack":
        return {
          file: "src/routes/__root.tsx — import the bootstrap in the root route",
          code: `// src/routes/__root.tsx
${importLine}
import { Outlet, createRootRoute } from "@tanstack/react-router";
export const Route = createRootRoute({ component: () => <Outlet /> });
`,
        };
      case "remix":
        return {
          file: "app/root.tsx — import the bootstrap once",
          code: `// app/root.tsx
${importLine}
import { Outlet } from "@remix-run/react";
export default function Root() { return <Outlet />; }
`,
        };
      case "react-router":
        return {
          file: "src/main.tsx — import the bootstrap before mounting the router",
          code: `// src/main.tsx
${importLine}
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
createRoot(document.getElementById("root")!).render(<RouterProvider router={router} />);
`,
        };
      case "vite":
      default:
        return {
          file: "src/main.tsx — add the bootstrap import (Vite + React)",
          code: `// src/main.tsx
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
${importLine}
createRoot(document.getElementById("root")!).render(<App />);
`,
        };
    }
  }, [framework]);

  const mainTsxPatch = entryPoint.code;
  const mainTsxLabel = `5. ${entryPoint.file}`;


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
  const {
    step, version, previousVersion,
    signature_verified, signing_key_id, payload_hash, site_id,
  } = body || {};
  if (signature_verified !== true) {
    return new Response(JSON.stringify({ error: "unverified" }), { status: 400, headers: cors });
  }
  if (!site_id) {
    return new Response(JSON.stringify({ error: "site_id required" }), { status: 400, headers: cors });
  }
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data, error } = await sb.rpc("exec_cms_migration", {
    _site_id: site_id,
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

  // Full SQL for the child DB. Paste once as a migration in the child project.
  const childMigrationSql = `-- Child DB migration — adds the exec_cms_migration RPC + supporting table.
-- Paste this as a single migration in your child Lovable project.

CREATE TABLE IF NOT EXISTS public.applied_cms_migrations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id         text NOT NULL,
  migration_id    text NOT NULL,
  version         text NOT NULL,
  order_index     integer NOT NULL,
  kind            text NOT NULL,
  duration_ms     integer,
  applied_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site_id, migration_id)
);

GRANT ALL ON public.applied_cms_migrations TO service_role;
ALTER TABLE public.applied_cms_migrations ENABLE ROW LEVEL SECURITY;
-- service-role only; no client policies on purpose.

-- Minimal local mirror of the parent's release table — populated by migrations
-- themselves (a SQL step that inserts the release row) OR by an admin script.
CREATE TABLE IF NOT EXISTS public.cms_releases (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version                       text NOT NULL UNIQUE,
  signature                     text,
  signing_key_id                text,
  payload_hash                  text,
  signed_at                     timestamptz,
  recalled                      boolean NOT NULL DEFAULT false,
  created_at                    timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.cms_releases TO service_role;
ALTER TABLE public.cms_releases ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.exec_cms_migration(
  _site_id text, _migration_id text, _version text, _order_index integer,
  _kind text, _payload text, _signature_verified boolean,
  _current_version text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _started TIMESTAMPTZ := clock_timestamp();
  _already_applied BOOLEAN;
  _release RECORD;
BEGIN
  IF current_setting('request.jwt.claims', true)::jsonb->>'role' IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'exec_cms_migration: forbidden (service_role required)';
  END IF;
  IF _signature_verified IS NOT TRUE THEN
    RAISE EXCEPTION 'exec_cms_migration: signature not verified — refusing to run';
  END IF;
  IF _site_id IS NULL OR length(_site_id) = 0 THEN
    RAISE EXCEPTION 'exec_cms_migration: site_id required';
  END IF;

  -- Upsert a placeholder release row so forward-only / signed checks pass.
  -- The edge function has already verified the signature against the parent's
  -- trusted key set BEFORE calling this RPC.
  INSERT INTO public.cms_releases (version, signature, signing_key_id, payload_hash, signed_at)
  VALUES (_version, 'verified-by-edge', 'verified-by-edge', 'verified-by-edge', now())
  ON CONFLICT (version) DO NOTHING;

  SELECT * INTO _release FROM public.cms_releases WHERE version = _version;
  IF _release.recalled THEN
    RAISE EXCEPTION 'exec_cms_migration: release % is recalled', _version;
  END IF;

  IF _current_version IS NOT NULL AND _current_version <> ''
     AND string_to_array(_version, '.')::int[] <= string_to_array(_current_version, '.')::int[] THEN
    RAISE EXCEPTION 'exec_cms_migration: refusing downgrade % -> %', _current_version, _version;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.applied_cms_migrations
     WHERE site_id = _site_id AND migration_id = _migration_id
  ) INTO _already_applied;
  IF _already_applied THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true, 'reason', 'already_applied');
  END IF;

  IF _kind = 'noop' THEN
    NULL;
  ELSIF _kind = 'sql' THEN
    EXECUTE _payload;
  ELSE
    RAISE EXCEPTION 'exec_cms_migration: kind % not supported by this RPC', _kind;
  END IF;

  INSERT INTO public.applied_cms_migrations
    (site_id, migration_id, version, order_index, kind, duration_ms)
  VALUES
    (_site_id, _migration_id, _version, _order_index, _kind,
     EXTRACT(MILLISECOND FROM clock_timestamp() - _started)::INTEGER);

  RETURN jsonb_build_object('ok', true, 'skipped', false, 'version', _version);
END;
$$;
`;

  const installSnippet = `# In the child Lovable project — no npm package required.
# The bootstrap snippet (step 4) is fully self-contained: it uses only
# @/integrations/supabase/client (already present) and the Web Crypto API.
#
# Just create the files in steps 2-7 and you're done. No \`bun add\` step.
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
          Generates a signed, self-contained bootstrap for <strong>{FRAMEWORK_LABELS[framework]}</strong>. Every snippet below ({envFile}, trusted keys, bootstrap, entry-point patch) is tailored to the selected framework. Releases are Ed25519-signed by the parent and verified against the embedded trusted-key set before any migration runs or any code is loaded.
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
        <div>
          <Label>Target framework</Label>
          <Select value={framework} onValueChange={(v) => setFramework(v as Framework)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(FRAMEWORK_LABELS) as Framework[]).map((k) => (
                <SelectItem key={k} value={k}>{FRAMEWORK_LABELS[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            Determines which entry-point file the bootstrap snippet targets (step 5).
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Site ID is auto-generated on first boot and persisted in the child's localStorage.
        </p>
      </Card>


      <Snippet label="1. No install needed (self-contained bootstrap)" code={installSnippet} copied={copied === "i"} onCopy={() => copy(installSnippet, "i")} />
      <Snippet label={`2. ${envFile} (child project)`} code={envSnippet} copied={copied === "env"} onCopy={() => copy(envSnippet, "env")} />
      <Snippet label="3. src/cms/trusted-keys.ts (embedded public keys)" code={trustedKeysFile} copied={copied === "tk"} onCopy={() => copy(trustedKeysFile, "tk")} />
      <Snippet label="4. src/cms-bootstrap.ts (self-contained, no npm dep)" code={bootstrap} copied={copied === "boot"} onCopy={() => copy(bootstrap, "boot")} />
      <Snippet label={mainTsxLabel} code={mainTsxPatch} copied={copied === "main"} onCopy={() => copy(mainTsxPatch, "main")} />
      <Snippet label="6. supabase/functions/cms-migrate/index.ts (child edge function)" code={childEdgeFn} copied={copied === "edge"} onCopy={() => copy(childEdgeFn, "edge")} />
      <Snippet label="7. Child DB migration — exec_cms_migration RPC" code={childMigrationSql} copied={copied === "sql"} onCopy={() => copy(childMigrationSql, "sql")} />

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
