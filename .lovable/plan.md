# Parent CMS → Full Distribution Platform

The current Releases page only writes a row with empty `manifest: {}`. Children verify the signature, find nothing to render, and the UI surfaces "no release". This plan turns the parent into a real distribution platform.

## What gets built

### 1. Release Builder (replaces the bare "Cut release" dialog)
A guided modal at `/admin/releases` → **Build release**:

- **Version + changelog** (existing)
- **Snapshot picker** — checkboxes for what to bake into the release:
  - Pages / Posts / CPT entries (published only)
  - Templates, Sections, Theme tokens
  - Taxonomies + terms
  - Menus, Forms, Redirects, SEO settings
  - Cloud components (sections / templates / widgets)
  - Site settings
  - Media metadata (URLs only — files stay in storage)
- **SDK source** — three options:
  1. *Use latest built SDK* (auto-resolves the most recent uploaded bundle and reuses its signed URL — fixes the "preload SDK" gap on the Cut Release popup)
  2. *Upload new bundle* (existing flow, inline in the modal)
  3. *Generate stub SDK* (server-side function returns the minimal `window.ParentCMS` shim so children can boot with zero upload)
- **Migrations** — auto-includes any rows in `cms_migration_manifest` queued since last release, plus a free-form add step.
- **Preview pane** — shows the populated manifest JSON before publishing.

On submit: builds the manifest, inserts the release, attaches migrations, attaches the SDK URL, and (if a local signer exists) signs it automatically in one click.

### 2. Manifest Generator (`src/lib/manifestBuilder.ts`)
Server-readable function that assembles:
```
{ version, sdk_url, manifest_url, signature, created_at,
  pages, posts, cpts, templates, sections, components,
  taxonomies, terms, menus, forms, redirects, settings,
  theme: { tokens, sections, templates }, seo, media }
```
Anything not selected in the snapshot picker is omitted (not `[]` placeholder).

### 3. Public Manifest URL
Extend `supabase/functions/cms-release` so `?action=manifest&version=X` returns the full manifest as JSON with CDN cache headers. The release row stores the resolved `manifest_url` pointing at this endpoint, so children can fetch it independently of the release record.

### 4. Stub SDK Generator (new edge function `cms-sdk-stub`)
Returns a tiny JS bundle that:
- Defines `window.ParentCMS` with `mount*` no-ops that render a "view-only" badge.
- Exposes `ParentCMS.applyManifest(manifest)` which writes pages/templates/etc. into the child's local tables via the existing engine surface.
- Solves the "no SDK uploaded yet" case so first release is never empty.

### 5. Component Registry distribution
The Build Release flow pulls latest `cloud_components` (kind+slug → newest version) into `manifest.components`. Children with `cloud_component_installs.auto_sync = true` already re-apply on realtime; the manifest path covers cold-boot installs.

### 6. Content Sync application (child side)
New `src/cms-core/applyManifest.ts`:
- Upserts pages/posts/cpts/templates/sections/tokens/menus/forms/redirects/SEO into the child's `public.*` tables.
- Idempotent: matches on `slug`/`id`; skips rows where `updated_at` is newer locally (last-write-wins guard).
- Called automatically after `bootstrap()` succeeds with a fresh release.

### 7. Framework-aware Child Installer
Rewrite `AdminSetupWizard` to:
- Ask the user which framework they're installing into (Vite + React, Next.js App Router, Next.js Pages, TanStack Start, Remix, React Router data router, Lovable/Vite default).
- Generate the correct snippet per framework:
  - Vite/Lovable → `src/main.tsx`
  - Next App Router → `app/layout.tsx` (client component wrapper)
  - Next Pages → `pages/_app.tsx`
  - TanStack Start → `src/routes/__root.tsx`
  - Remix → `app/root.tsx`
- All snippets call the same `bootstrap()` from `@our-org/cms-core` so the engine surface is identical.
- Provides a copy-paste `.env` block with `CMS_MODE=child`, `CMS_PARENT_URL`, `CMS_SITE_ID`, `CMS_PUBLIC_KEY`.

### 8. Parent dashboard polish
Add a "Distribution" overview card at `/admin/installations` showing:
- Site → current version → latest version → drift badge → last sync.
- Filters: up-to-date / pending / failed / awaiting first release.
- One-click "Force resync manifest" per row.

(No new tables — reuses existing `child_installations` + `child_upgrade_log`.)

### 9. Runtime error fix (in scope)
`cms-release` edge function currently 400s when called without params on `/admin/releases`. Add a default `?action=list` branch that returns `{ releases: [...] }` so the page never surfaces the 400 to users.

## Out of scope (call out explicitly)
- A real `npx parent-cms install` CLI shipped to npm — requires registry publishing outside Lovable. The Setup Wizard's per-framework snippet covers the same outcome inside the platform.
- Per-framework adapter packages on npm (React Router/Remix/etc. as standalone modules). The single `@our-org/cms-core` workspace package already works in all of them via the snippets above.
- File-level media replication (only metadata + public URLs ship in the manifest; binaries stay in `post-images`).

## Technical layout

```text
supabase/functions/
  cms-release/index.ts          ← +?action=list, +?action=manifest
  cms-sdk-stub/index.ts         ← NEW: minimal window.ParentCMS bundle

src/lib/
  manifestBuilder.ts            ← NEW: snapshot → manifest JSON
  releaseBuilder.ts             ← NEW: orchestrates snapshot + sign + publish

src/cms-core/
  applyManifest.ts              ← NEW: write manifest contents into child tables
  bootstrap.ts                  ← call applyManifest() after verify

src/pages/admin/
  AdminReleases.tsx             ← swap dialog for BuildReleaseDialog
  AdminInstallations.tsx        ← add drift / resync controls
  AdminSetupWizard.tsx          ← framework selector + per-stack snippets

src/components/admin/
  BuildReleaseDialog.tsx        ← NEW: snapshot picker + SDK chooser + preview
```

No schema migrations required — `cms_releases.manifest jsonb` and `child_installations` already hold everything. The only DB write pattern is `INSERT` into existing tables.

## Acceptance
1. Open Releases → Build release → tick "All published content" → Publish. Resulting row has a non-empty manifest, signed, with `sdk_url` auto-filled from the latest bundle (or stub).
2. Reload the child preview — pages/templates/tokens appear locally without manual import.
3. Setup Wizard offers TanStack Start as a target and emits a `__root.tsx` snippet.
4. Installations page shows version drift and a working "Force resync" button.
5. `/admin/releases` no longer shows the `Provide ?domain=...` 400 in the console.
