// PASTE-IN CHILD WIZARD — the entire CMS in one file the user adds to their
// Lovable child project. Mount it at /admin/* and you're done:
//
//   <Route path="/admin/*" element={
//     <RemoteAdmin
//       parentBaseUrl="https://YOUR-PARENT.lovable.app"
//       parentReleaseApi="https://<project-ref>.functions.supabase.co/cms-release"
//     />
//   } />
//
// What it does on first load:
//   1. If no child Supabase config yet → shows a setup screen.
//   2. Fetches signed release manifest from the parent.
//   3. Verifies Ed25519 signature against trusted public keys.
//   4. Dynamically imports the admin bundle (admin.js + admin.css).
//   5. Configures Supabase with the child's keys, then renders <AdminApp/>.
//   6. Polls every 60s; on new version → toast → one click → hot-swap.
//   7. Caches last good bundle URL → auto-rollback if a new bundle throws.
import {
  type ComponentType,
  type ReactElement,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Manifest = {
  version: string;
  bundle_url: string;
  bundle_sha256: string;
  bundle_css_url?: string | null;
  signature: string;
  signing_key_id: string;
  payload_canonical: string;
  min_compatible_child?: string | null;
  changelog?: string | null;
};

type ChildConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  siteId: string;
};

type AdminModule = {
  AdminApp: ComponentType;
  configureSupabase: (url: string, anonKey: string) => void;
  BUNDLE_VERSION?: string;
};

const LS_CFG = "cms-child-config-v1";
const LS_TRUSTED_KEYS = "cms-child-trusted-keys-v1";
const LS_LAST_GOOD = "cms-child-last-good-bundle-v1";

/* ---------- crypto helpers ---------- */
function b64ToBuf(s: string): ArrayBuffer {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}
async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function verifyEd25519(publicKeyB64: string, signatureB64: string, message: string): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      "raw", b64ToBuf(publicKeyB64), { name: "Ed25519" }, false, ["verify"],
    );
    return await crypto.subtle.verify(
      { name: "Ed25519" }, key, b64ToBuf(signatureB64), new TextEncoder().encode(message),
    );
  } catch (e) {
    console.error("[cms-child] verify failed", e);
    return false;
  }
}

/* ---------- config & trusted keys ---------- */
function loadConfig(): ChildConfig | null {
  try { return JSON.parse(localStorage.getItem(LS_CFG) || "null"); } catch { return null; }
}
function saveConfig(c: ChildConfig) { localStorage.setItem(LS_CFG, JSON.stringify(c)); }

async function fetchTrustedKeys(parentBaseUrl: string, parentReleaseApi: string): Promise<Record<string, string>> {
  // Try edge function first; fall back to PostgREST anon select on cms_signing_keys.
  try {
    const r = await fetch(`${parentReleaseApi.replace(/\/cms-release\/?$/, "")}/cms-release?keys=1`, { cache: "no-store" });
    if (r.ok) {
      const j = await r.json();
      if (j?.trusted_keys) {
        localStorage.setItem(LS_TRUSTED_KEYS, JSON.stringify(j.trusted_keys));
        return j.trusted_keys;
      }
    }
  } catch { /* fall through */ }
  try {
    const cached = JSON.parse(localStorage.getItem(LS_TRUSTED_KEYS) || "{}");
    if (Object.keys(cached).length) return cached;
  } catch { /* ignore */ }
  throw new Error("Could not fetch trusted signing keys from parent.");
}

async function fetchManifest(parentReleaseApi: string, siteId: string): Promise<Manifest> {
  const r = await fetch(`${parentReleaseApi}?site_id=${encodeURIComponent(siteId)}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`Manifest fetch failed: ${r.status}`);
  const j = await r.json();
  if (!j?.bundle_url || !j?.signature || !j?.signing_key_id) {
    throw new Error("Release has no admin bundle yet. Build & sign a release with bundle_url in the parent CMS.");
  }
  return j as Manifest;
}

async function verifyManifest(m: Manifest, trusted: Record<string, string>): Promise<void> {
  const pub = trusted[m.signing_key_id];
  if (!pub) throw new Error(`Unknown signing key ${m.signing_key_id}`);
  const ok = await verifyEd25519(pub, m.signature, m.payload_canonical);
  if (!ok) throw new Error("Signature verification failed.");
}

/* ---------- bundle loading ---------- */
async function loadBundle(m: Manifest, parentBaseUrl: string): Promise<AdminModule> {
  const url = /^https?:/i.test(m.bundle_url) ? m.bundle_url : `${parentBaseUrl.replace(/\/$/, "")}${m.bundle_url}`;

  // Verify SHA-256 of the JS we're about to import.
  const resp = await fetch(url, { cache: "force-cache" });
  if (!resp.ok) throw new Error(`Bundle fetch failed: ${resp.status}`);
  const bytes = await resp.arrayBuffer();
  const sha = await sha256Hex(bytes);
  if (sha !== m.bundle_sha256) throw new Error(`Bundle SHA mismatch: ${sha} vs ${m.bundle_sha256}`);

  // Inject CSS once.
  if (m.bundle_css_url && !document.querySelector(`link[data-cms-bundle="${m.version}"]`)) {
    const cssUrl = /^https?:/i.test(m.bundle_css_url)
      ? m.bundle_css_url
      : `${parentBaseUrl.replace(/\/$/, "")}${m.bundle_css_url}`;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = cssUrl;
    link.dataset.cmsBundle = m.version;
    document.head.appendChild(link);
  }

  // Dynamic import via Blob URL so we can pin the bytes we just hashed.
  const blob = new Blob([bytes], { type: "application/javascript" });
  const blobUrl = URL.createObjectURL(blob);
  try {
    return (await import(/* @vite-ignore */ blobUrl)) as AdminModule;
  } finally {
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000);
  }
}

/* ---------- UI bits (Tailwind classes from child app) ---------- */
function SetupScreen({ onSave }: { onSave: (c: ChildConfig) => void }) {
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");
  const [siteId, setSiteId] = useState("");
  const [err, setErr] = useState<string | null>(null);

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Connect your CMS backend</h1>
        <p style={{ color: "#64748b", marginBottom: 20, fontSize: 14 }}>
          The admin code is delivered from the parent CMS. Your content lives in your own backend.
          Paste your project's URL and anon (publishable) key.
        </p>
        {err && <div style={errStyle}>{err}</div>}
        <Field label="Supabase / Cloud URL" value={url} onChange={setUrl} placeholder="https://xxxxx.supabase.co" />
        <Field label="Anon / Publishable Key" value={key} onChange={setKey} placeholder="eyJhbGciOi..." />
        <Field label="Site ID (any unique slug)" value={siteId} onChange={setSiteId} placeholder="my-site-prod" />
        <button
          style={btnStyle}
          onClick={() => {
            if (!url || !key || !siteId) { setErr("All three fields are required."); return; }
            onSave({ supabaseUrl: url.trim(), supabaseAnonKey: key.trim(), siteId: siteId.trim() });
          }}
        >Save & connect</button>
      </div>
    </div>
  );
}
function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label style={{ display: "block", marginBottom: 14, fontSize: 13 }}>
      <span style={{ display: "block", fontWeight: 500, marginBottom: 6 }}>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={inputStyle}
      />
    </label>
  );
}
const containerStyle: React.CSSProperties = { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", padding: 24 };
const cardStyle: React.CSSProperties = { background: "white", border: "1px solid #e2e8f0", borderRadius: 12, padding: 28, maxWidth: 460, width: "100%", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 14, boxSizing: "border-box" };
const btnStyle: React.CSSProperties = { width: "100%", padding: "10px 16px", background: "#0f172a", color: "white", border: 0, borderRadius: 8, fontWeight: 600, cursor: "pointer", marginTop: 8 };
const errStyle: React.CSSProperties = { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 14 };
const toastStyle: React.CSSProperties = { position: "fixed", bottom: 20, right: 20, background: "#0f172a", color: "white", padding: "12px 16px", borderRadius: 10, display: "flex", gap: 12, alignItems: "center", boxShadow: "0 8px 24px rgba(0,0,0,0.2)", zIndex: 99999, fontSize: 14 };

/* ---------- main component ---------- */
export type RemoteAdminProps = {
  parentBaseUrl: string;
  parentReleaseApi: string;
  /** Override config (skips setup screen). */
  config?: ChildConfig;
  pollIntervalMs?: number;
};

export function RemoteAdmin({ parentBaseUrl, parentReleaseApi, config: cfgProp, pollIntervalMs = 60_000 }: RemoteAdminProps): ReactElement {
  const [config, setConfig] = useState<ChildConfig | null>(() => cfgProp ?? loadConfig());
  const [mod, setMod] = useState<AdminModule | null>(null);
  const [version, setVersion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingUpgrade, setPendingUpgrade] = useState<Manifest | null>(null);
  const loadingRef = useRef(false);

  const install = useCallback(async (cfg: ChildConfig, force = false) => {
    if (loadingRef.current && !force) return;
    loadingRef.current = true;
    setError(null);
    try {
      const trusted = await fetchTrustedKeys(parentBaseUrl, parentReleaseApi);
      const manifest = await fetchManifest(parentReleaseApi, cfg.siteId);
      await verifyManifest(manifest, trusted);

      let loaded: AdminModule;
      try {
        loaded = await loadBundle(manifest, parentBaseUrl);
        localStorage.setItem(LS_LAST_GOOD, JSON.stringify(manifest));
      } catch (e) {
        // Rollback: try last-good bundle
        const lastGood = localStorage.getItem(LS_LAST_GOOD);
        if (lastGood && !force) {
          console.warn("[cms-child] new bundle failed, rolling back", e);
          const old = JSON.parse(lastGood) as Manifest;
          loaded = await loadBundle(old, parentBaseUrl);
          setError(`Update to ${manifest.version} failed; running ${old.version}. ${(e as Error).message}`);
          manifest.version = old.version;
        } else {
          throw e;
        }
      }

      loaded.configureSupabase(cfg.supabaseUrl, cfg.supabaseAnonKey);
      setMod(() => loaded);
      setVersion(manifest.version);
      setPendingUpgrade(null);
    } catch (e) {
      console.error("[cms-child] install failed", e);
      setError((e as Error).message);
    } finally {
      loadingRef.current = false;
    }
  }, [parentBaseUrl, parentReleaseApi]);

  // Initial install
  useEffect(() => { if (config) void install(config); }, [config, install]);

  // Poll for upgrades
  useEffect(() => {
    if (!config || !version) return;
    const t = setInterval(async () => {
      try {
        const trusted = await fetchTrustedKeys(parentBaseUrl, parentReleaseApi);
        const m = await fetchManifest(parentReleaseApi, config.siteId);
        if (m.version !== version) {
          await verifyManifest(m, trusted);
          setPendingUpgrade(m);
        }
      } catch (e) {
        console.debug("[cms-child] upgrade poll failed", e);
      }
    }, pollIntervalMs);
    return () => clearInterval(t);
  }, [config, version, parentBaseUrl, parentReleaseApi, pollIntervalMs]);

  const reset = useCallback(() => {
    if (!confirm("Disconnect this site from the CMS and re-run setup?")) return;
    localStorage.removeItem(LS_CFG);
    setConfig(null);
    setMod(null);
  }, []);

  const handleSetupSave = useCallback((c: ChildConfig) => { saveConfig(c); setConfig(c); }, []);
  const handleUpgrade = useCallback(() => { if (config) void install(config, true); }, [config, install]);

  if (!config) return <SetupScreen onSave={handleSetupSave} />;
  if (error && !mod) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <h2 style={{ fontWeight: 700, marginBottom: 8 }}>CMS failed to load</h2>
          <div style={errStyle}>{error}</div>
          <button style={btnStyle} onClick={() => install(config, true)}>Retry</button>
          <button style={{ ...btnStyle, background: "transparent", color: "#0f172a", border: "1px solid #cbd5e1", marginTop: 8 }} onClick={reset}>Re-run setup</button>
        </div>
      </div>
    );
  }
  if (!mod) {
    return <div style={{ ...containerStyle, fontSize: 14, color: "#64748b" }}>Loading CMS v{version ?? "…"}…</div>;
  }

  const Admin = mod.AdminApp;
  return (
    <Suspense fallback={<div style={containerStyle}>Loading…</div>}>
      <Admin />
      {pendingUpgrade && (
        <div style={toastStyle}>
          <span>Update available: v{pendingUpgrade.version}</span>
          <button style={{ background: "white", color: "#0f172a", border: 0, borderRadius: 6, padding: "6px 12px", fontWeight: 600, cursor: "pointer" }} onClick={handleUpgrade}>
            Install
          </button>
          <button style={{ background: "transparent", color: "white", border: 0, cursor: "pointer", opacity: 0.7 }} onClick={() => setPendingUpgrade(null)}>×</button>
        </div>
      )}
    </Suspense>
  );
}

export default RemoteAdmin;
