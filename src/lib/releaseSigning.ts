// Ed25519 release signing for the parent CMS.
//
// Private key lives ONLY on the admin's machine (localStorage + downloadable
// backup). The public key is registered in `cms_signing_keys` so children can
// fetch the trusted set AND so the same key id is embedded in the child SDK
// for true offline verification.
//
// All Ed25519 ops use the platform Web Crypto API — no third-party deps.

import { supabase as cloud } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = cloud as any;

const LS_PRIV_KEY = "cms-signing-private-key-v1";
const LS_KEY_ID   = "cms-signing-key-id-v1";

/* ---------- base64 helpers ---------- */
function b64encode(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
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

/* ---------- canonical payload ---------- */
// Stable JSON: keys sorted, no whitespace. Children re-compute this exact
// string to verify the signature.
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

export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalize).join(",") + "]";
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return "{" + keys.map((k) =>
    JSON.stringify(k) + ":" + canonicalize((value as Record<string, unknown>)[k])
  ).join(",") + "}";
}

/* ---------- Ed25519 key management ---------- */
export type GeneratedKeyPair = {
  key_id: string;
  public_key_b64: string;
  private_key_b64: string;
};

export async function generateSigningKeyPair(): Promise<GeneratedKeyPair> {
  const kp = await crypto.subtle.generateKey("Ed25519", true, ["sign", "verify"]) as CryptoKeyPair;
  const rawPub  = await crypto.subtle.exportKey("raw", kp.publicKey);
  const rawPriv = await crypto.subtle.exportKey("pkcs8", kp.privateKey);
  const public_key_b64  = b64encode(rawPub);
  const private_key_b64 = b64encode(rawPriv);
  // Short fingerprint = first 16 chars of SHA-256(pubkey)
  const fp = await sha256Hex(public_key_b64);
  return { key_id: `ed25519-${fp.slice(0, 16)}`, public_key_b64, private_key_b64 };
}

export function persistLocalPrivateKey(keyId: string, privateKeyB64: string) {
  localStorage.setItem(LS_KEY_ID, keyId);
  localStorage.setItem(LS_PRIV_KEY, privateKeyB64);
}
export function loadLocalSigner(): { key_id: string; private_key_b64: string } | null {
  const id = localStorage.getItem(LS_KEY_ID);
  const k  = localStorage.getItem(LS_PRIV_KEY);
  return id && k ? { key_id: id, private_key_b64: k } : null;
}
export function clearLocalSigner() {
  localStorage.removeItem(LS_KEY_ID);
  localStorage.removeItem(LS_PRIV_KEY);
}

async function importPrivateKey(privateKeyB64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "pkcs8", b64decode(privateKeyB64),
    { name: "Ed25519" }, false, ["sign"]
  );
}

/* ---------- signing API ---------- */
export type SignedRelease = {
  signature: string;        // base64
  signing_key_id: string;
  payload_hash: string;     // hex sha256 of canonical payload
  canonical: string;        // for debugging / re-verification
};

export async function signReleasePayload(
  payload: SignablePayload,
  signer = loadLocalSigner(),
): Promise<SignedRelease> {
  if (!signer) throw new Error("No local signing key — generate one in Signing Keys.");
  const canonical = canonicalize(payload);
  const payload_hash = await sha256Hex(canonical);
  const key = await importPrivateKey(signer.private_key_b64);
  const sig = await crypto.subtle.sign({ name: "Ed25519" }, key,
    new TextEncoder().encode(canonical));
  return { signature: b64encode(sig), signing_key_id: signer.key_id, payload_hash, canonical };
}

/* ---------- DB helpers ---------- */
export async function registerPublicKey(keyId: string, publicKeyB64: string, notes?: string) {
  await db.from("cms_signing_keys").insert({
    key_id: keyId, public_key: publicKeyB64,
    algorithm: "ed25519", is_active: true, notes: notes || null,
  });
}

export async function listPublicKeys() {
  const { data } = await db.from("cms_signing_keys").select("*").order("created_at", { ascending: false });
  return data || [];
}

export async function revokePublicKey(id: string) {
  await db.from("cms_signing_keys").update({
    is_active: false, revoked_at: new Date().toISOString(),
  }).eq("id", id);
}

export async function attachSignatureToRelease(
  releaseId: string,
  signed: { signature: string; signing_key_id: string; payload_hash: string; canonical?: string },
) {
  // payload_canonical is persisted alongside the signature so the edge
  // function serves the *exact* bytes that were signed — never recomputed.
  // After this update the row is immutable (DB trigger enforces it).
  await db.from("cms_releases").update({
    signature: signed.signature,
    signing_key_id: signed.signing_key_id,
    payload_hash: signed.payload_hash,
    payload_canonical: signed.canonical ?? null,
    signed_at: new Date().toISOString(),
  }).eq("id", releaseId);
}
