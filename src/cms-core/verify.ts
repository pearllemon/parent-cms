// Child-side signature verification for incoming release manifests.
//
// The trusted public key set is EMBEDDED in the child build (the strongest
// guarantee) and may optionally be extended from the parent's signing_keys
// registry. Verification happens BEFORE any migration is executed and BEFORE
// the SDK bundle is loaded.

const enc = new TextEncoder();

function b64decode(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalize).join(",") + "]";
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return "{" + keys.map((k) =>
    JSON.stringify(k) + ":" + canonicalize((value as Record<string, unknown>)[k])
  ).join(",") + "}";
}

export type TrustedKey = { key_id: string; public_key_b64: string };

export type VerifiableManifest = {
  version: string;
  sdk_url: string | null;
  min_compatible_child_version: string | null;
  manifest: Record<string, unknown>;
  migrations: Array<{
    order_index: number;
    kind: string;
    payload: string;
    reversible: boolean;
  }>;
  signature: string | null;
  signing_key_id: string | null;
  payload_hash: string | null;
};

export type VerificationResult =
  | { ok: true; key_id: string; payload_hash: string }
  | { ok: false; reason: string };

async function importEd25519PublicKey(b64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", b64decode(b64), { name: "Ed25519" }, false, ["verify"]);
}

export async function verifyManifestSignature(
  manifest: VerifiableManifest,
  trusted: TrustedKey[],
): Promise<VerificationResult> {
  if (!manifest.signature || !manifest.signing_key_id) {
    return { ok: false, reason: "manifest is unsigned" };
  }
  const trustedKey = trusted.find((k) => k.key_id === manifest.signing_key_id);
  if (!trustedKey) {
    return { ok: false, reason: `signing key ${manifest.signing_key_id} not trusted` };
  }
  const canonical = canonicalize({
    version: manifest.version,
    sdk_url: manifest.sdk_url,
    min_compatible_child_version: manifest.min_compatible_child_version,
    manifest: manifest.manifest,
    migrations: manifest.migrations.map((m) => ({
      order_index: m.order_index, kind: m.kind, payload: m.payload, reversible: m.reversible,
    })),
  });
  const expectedHash = await sha256Hex(canonical);
  if (manifest.payload_hash && manifest.payload_hash !== expectedHash) {
    return { ok: false, reason: "payload hash mismatch" };
  }
  try {
    const key = await importEd25519PublicKey(trustedKey.public_key_b64);
    const okSig = await crypto.subtle.verify(
      { name: "Ed25519" }, key,
      b64decode(manifest.signature),
      enc.encode(canonical),
    );
    if (!okSig) return { ok: false, reason: "invalid signature" };
    return { ok: true, key_id: trustedKey.key_id, payload_hash: expectedHash };
  } catch (e) {
    return { ok: false, reason: `verify error: ${String((e as Error).message || e)}` };
  }
}

export function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  }
  return 0;
}
