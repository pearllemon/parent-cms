# Parent ↔ Child CMS Architecture

This document describes how the Parent CMS distributes a complete admin
experience to any number of child sites without requiring those children to
rebuild or ship handwritten admin UI.

## Goals

- **Zero handwritten UI in the child.** The child only ships a thin runtime
  shell, an auth handoff, and a database. Every screen under `/admin` is
  loaded from the parent at runtime.
- **Push updates instantly.** New editors, dashboard widgets, SEO panels, and
  schema changes all roll out as signed releases. Children pick them up on
  the next page load — no rebuild, no redeploy.
- **Safe by construction.** Every release is Ed25519-signed against an
  embedded trusted key set. SDK URLs are allow-listed. Migrations are
  forward-only and run through a `SECURITY DEFINER` RPC that requires
  service-role and proof of signature verification.
- **Framework-agnostic.** The child can be Vite, Next.js, Remix, TanStack
  Start, React Router, or a plain SPA. The contract is the same.

## High-level flow

```text
  ┌──────────────────────────┐         signed release
  │   Parent CMS (admin)     │  ───────────────────────────►  cms_releases
  │  - Release Builder       │     (manifest + sdk_url +
  │  - SDK Generator         │      migrations + signature)
  │  - Signing Keys          │
  └────────────┬─────────────┘
               │
               │  edge fn: cms-release (no_release | manifest | list)
               │  edge fn: cms-sdk-stub (default ESM bundle)
               ▼
  ┌──────────────────────────┐
  │   Child site shim        │  ── bootstrapCmsCore() on every page load
  │   src/cms-core/*         │     1. register / heartbeat
  │   (~10 KB)               │     2. fetch + verify signature
  │                          │     3. run forward SQL migrations
  │                          │     4. import(sdk_url)  ← real ES module
  │                          │     5. sdk.mountAdmin(el, ctx)
  └──────────────────────────┘
```

## What the parent ships

### 1. A real ES module at `sdk_url`

The bundle MUST be a JavaScript module (`Content-Type:
application/javascript`) that exports a stable mount surface:

```ts
export const version: string;
export const isStub: boolean;

export function mountAdmin       (el: HTMLElement, ctx: AdminContext): Unmount;
export function mountEditor      (el: HTMLElement, ctx: AdminContext, opts?: EditorOpts): Unmount;
export function mountMediaLibrary(el: HTMLElement, ctx: AdminContext): Unmount;
export function mountSEOEditor   (el: HTMLElement, ctx: AdminContext): Unmount;
export function mountPageBuilder (el: HTMLElement, ctx: AdminContext): Unmount;
export function mountFormBuilder (el: HTMLElement, ctx: AdminContext): Unmount;

export function onManifest(cb: (m: Manifest) => void): () => void;
export function applyManifest(m: Manifest): void;

type Unmount = () => void;
```

Real engine bundles also bundle their own React, router, query client and UI
library (or declare them as peer-deps the child is guaranteed to have).

### 2. The `AdminContext` passed by the child

The child gives the SDK everything it needs to operate — the SDK never
reaches into globals:

```ts
type AdminContext = {
  siteId: string;
  supabase: SupabaseClient;          // or { url, anonKey } to build one
  currentPath: string;               // e.g. "/admin/posts/123"
  navigate: (to: string) => void;    // host router callback
  theme?: "light" | "dark";
  features?: Record<string, boolean>;
  onEvent?: (e: AdminEvent) => void; // analytics / audit hooks
};
```

### 3. Correct HTTP semantics

| Header                          | Value                                          |
|---------------------------------|------------------------------------------------|
| `Content-Type`                  | `application/javascript; charset=utf-8`        |
| `Access-Control-Allow-Origin`   | `*` (or the child's exact origin)              |
| `Access-Control-Allow-Methods`  | `GET, OPTIONS`                                 |
| `Cache-Control`                 | `public, max-age=31536000, immutable` on versioned URLs |

A JSON response will fail `import()` with *"Expected a JavaScript module
script but the server responded with MIME type application/json"*. The
`cms-sdk-stub` edge function returns the correct contract by default.

### 4. Migrations + assets travel with the release

A signed release manifest carries:

- `migrations[]` — forward-only SQL applied via `exec_cms_migration` so
  the child DB has the tables the SDK queries (`posts`, `pages`, `leads`,
  `media`, …) before mount.
- `manifest.*` — pages, posts, CPTs, templates, sections, theme tokens,
  taxonomies, menus, forms, redirects, SEO, media metadata, cloud
  components. Upserted into the child via `applyManifest()`.
- `sdk_url` — the engine bundle described above.
- `signature` + `signing_key_id` — Ed25519 over the canonical payload.

## The child's entire surface

Once the parent ships the above, the child's `/admin` surface collapses to a
single splat route:

```tsx
// Vite + React Router
// src/routes/admin.$.tsx
import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function AdminRoute() {
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    const sdk = (window as any).__cmsSdk;
    if (!sdk || !ref.current) return;
    const unmount = sdk.mountAdmin(ref.current, {
      siteId: import.meta.env.VITE_CMS_SITE_ID,
      supabase,
      currentPath: pathname,
      navigate,
    });
    return () => unmount?.();
  }, []);

  return <div ref={ref} />;
}
```

Equivalent one-liners exist for Next.js App Router (`app/admin/[[...slug]]/page.tsx`),
Pages Router (`pages/admin/[[...slug]].tsx`), TanStack Start (`src/routes/admin.$.tsx`),
and Remix (`app/routes/admin.$.tsx`). The `AdminSetupWizard` generates them
automatically based on the framework the child selects.

## Security model

1. **Embedded trusted keys.** The child build bakes in the Ed25519 public
   keys it will trust. Releases signed by anything else are rejected.
2. **Allow-listed SDK origins.** `bootstrapCmsCore({ allowedSdkOrigins })`
   restricts `import()` to known origins; HTTPS is enforced.
3. **No `eval`, no `new Function`.** The SDK is loaded only through the
   native `import()` loader.
4. **Forward-only migrations.** `exec_cms_migration` refuses downgrades,
   unsigned releases, recalled releases, and any caller that isn't
   `service_role` with `_signature_verified = true`.
5. **Idempotent applies.** `applied_cms_migrations` and `last-write-wins`
   timestamps on content tables make every retry safe.

## Failure handling

| Condition                          | Child behaviour                                          |
|------------------------------------|----------------------------------------------------------|
| Parent reachable, no release yet   | Status `no_release`. Friendly "waiting for first release" panel. Heartbeat with `awaiting_release`. |
| Parent temporarily unreachable     | Status `waiting`. Site keeps rendering with cached manifest. Retry with backoff. |
| Signature invalid                  | Status `untrusted`. Previous version stays mounted. Upgrade log records the failure. |
| Release was recalled               | Status `recalled`. Previous version stays mounted.       |
| SDK import fails                   | Status `error`. Site still renders public pages; admin shows a retry banner. |

The user never sees a 404, 500, or runtime crash — every degraded state is
surfaced as a calm in-app message.

## Releases pipeline

1. Admin opens **Releases → Build release** in the parent.
2. Picks snapshot scope (pages, posts, CPTs, templates, tokens, SEO, …).
3. Chooses SDK source: latest signed bundle, uploaded bundle, or the stub.
4. Optionally attaches migrations from `cms_migration_manifest`.
5. On submit the parent builds the manifest, inserts a `cms_releases` row,
   and auto-signs with the local signer if one is present.
6. Children pick it up on the next page load and mount the new bundle.

That's the whole architecture. The parent owns the product surface; the
child owns the runtime shell, the auth handoff, and the database.
