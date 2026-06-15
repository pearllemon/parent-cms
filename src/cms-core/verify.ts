// Child-side signature verification for incoming release manifests.
//
// The parent always ships `payload_canonical` — the EXACT bytes that were
// signed — alongside the parsed `payload`. The child verifies the signature
// over those literal bytes, removing any JSON key-order ambiguity.
//
// Falls back to recomputing canonicalize(payload) for older parents.

const enc = new TextEncoder();

function b64decode(s: string): ArrayBuffer {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
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

export type SignablePayload = {
  version: string;
  sdk_url: string | null;
  package_url?: string | null;
  package_sha256?: string | null;
  package_size?: number | null;
  package_format?: string | null;
  min_compatible_child_version: string | null;
  manifest: Record<string, unknown>;
  migrations: Array<{
    order_index: number;
    kind: string;
    payload: string;
    reversible: boolean;
  }>;
};

/**
 * The envelope returned by the parent's /cms-release endpoint. New fields
 * (`payload`, `payload_canonical`, `signature_b64`) are authoritative; the
 * legacy top-level fields are kept for backward compatibility.
 */
export type VerifiableManifest = {
  // New envelope
  siteId?: string | null;
  version: string;
  previousVersion?: string | null;
  payload?: SignablePayload;
  payload_canonical?: string | null;
  signature_b64?: string | null;
  signing_key_id: string | null;
  signed_at?: string | null;

  // Legacy / convenience
  sdk_url: string | null;
  package_url?: string | null;
  package_sha256?: string | null;
  package_size?: number | null;
  package_format?: string | null;
  min_compatible_child_version: string | null;
  manifest: Record<string, unknown>;
  migrations: Array<{
    order_index: number;
    kind: string;
    payload: string;
    reversible: boolean;
  }>;
  signature: string | null;
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
  const signature = manifest.signature_b64 || manifest.signature;
  if (!signature || !manifest.signing_key_id) {
    return { ok: false, reason: "manifest is unsigned" };
  }
  const trustedKey = trusted.find((k) => k.key_id === manifest.signing_key_id);
  if (!trustedKey) {
    return { ok: false, reason: `signing key ${manifest.signing_key_id} not trusted` };
  }

  // Prefer the bytes the parent says it signed. Fall back to recomputing
  // canonical(payload) — and finally to the legacy top-level shape — for
  // older parents that haven't shipped payload_canonical yet.
  let canonical: string;
  if (typeof manifest.payload_canonical === "string" && manifest.payload_canonical.length > 0) {
    canonical = manifest.payload_canonical;
  } else if (manifest.payload) {
    canonical = canonicalize(manifest.payload);
  } else {
    const legacyPayload: Record<string, unknown> = {
      version: manifest.version,
      sdk_url: manifest.sdk_url,
      min_compatible_child_version: manifest.min_compatible_child_version,
      manifest: manifest.manifest,
      migrations: manifest.migrations.map((m) => ({
        order_index: m.order_index, kind: m.kind, payload: m.payload, reversible: m.reversible,
      })),
    };
    if (manifest.package_url || manifest.package_sha256 || manifest.package_size) {
      legacyPayload.package_url = manifest.package_url ?? null;
      legacyPayload.package_sha256 = manifest.package_sha256 ?? null;
      legacyPayload.package_size = manifest.package_size ?? null;
      legacyPayload.package_format = manifest.package_format ?? "zip";
    }
    canonical = canonicalize(legacyPayload);
  }

  const expectedHash = await sha256Hex(canonical);
  if (manifest.payload_hash && manifest.payload_hash !== expectedHash) {
    return { ok: false, reason: "payload hash mismatch" };
  }
  try {
    const key = await importEd25519PublicKey(trustedKey.public_key_b64);
    const okSig = await crypto.subtle.verify(
      { name: "Ed25519" }, key,
      b64decode(signature),
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
