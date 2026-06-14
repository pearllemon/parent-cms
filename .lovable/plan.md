
# Parent CMS → Child Auto-Upgrade Pipeline

A hybrid distribution model. Parent CMS owns the engine (editor, renderer, sync, SEO, schemas); children own their pages, routes, and customizations. Engine ships as a versioned bundle from a parent edge function. Children boot, check the manifest, run DB migrations, and load the latest engine — automatically. "Parent always wins"; child overrides that conflict get snapshotted and rolled back-able.

---

## Architecture at a glance

```text
┌─────────────────────────────────────────────────────────┐
│  PARENT CMS (this project)                              │
│  ─────────────────────────────────────────────────────  │
│  • Authors all engine code in /packages/cms-core        │
│  • Build step bundles → /public/sdk/v{N}/cms-core.js   │
│  • Edge function: /functions/v1/cms-release             │
│      → returns latest manifest {version, sdk_url,       │
│         migrations[], component_overrides[], min_child} │
│  • Admin UI: "Releases" tab → cut version, push update  │
│  • cms_releases table: version, changelog, manifest     │
└─────────────────────────────────────────────────────────┘
                          │
                  manifest + SDK (HTTP, cached)
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Child A      │  │ Child B      │  │ Child C      │
│ (Lovable     │  │              │  │              │
│  remix)      │  │              │  │              │
│ ──────────── │  │              │  │              │
│ • bootstrap  │  │              │  │              │
│   on app     │  │              │  │              │
│   load:      │  │              │  │              │
│   - fetch    │  │              │  │              │
│     manifest │  │              │  │              │
│   - run      │  │              │  │              │
│     pending  │  │              │  │              │
│     migr.    │  │              │  │              │
│   - load SDK │  │              │  │              │
│ • own pages, │  │              │  │              │
│   routes,    │  │              │  │              │
│   slot       │  │              │  │              │
│   overrides  │  │              │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## What gets built — in 6 phases

### Phase 1 — Carve out `@cms-core` (parent, this project)
Extract code that should be shared across all children into a single mountable surface — without moving files yet, just declare the surface:

- **Engine surface** (`src/cms-core/index.ts`):
  - `<CmsRoot>` provider (mounts sync, theme, activity, auth context)
  - `ThemeBlocksRenderer`, `VisualCanvas`, `RichTextEditor`, `MediaPicker`
  - `themeStore`, `templateAssignments`, `syncControl`, `parent` client
  - SEO engine (`postSeo`, `seoScoring`, `seoFiles`)
  - Block registry (`registerBlock`, `getBlockRenderer`) — so children can add custom block types
  - Slot registry (`registerSlot`, `<Slot name="...">`) — children override any component by name
- **Public contract**: only what's exported from `src/cms-core/index.ts` is part of the "API"; everything else is internal and can change without a major bump.

### Phase 2 — Release registry (parent DB)
New tables:
- `cms_releases` — `version` (semver), `sdk_url`, `manifest` (jsonb), `changelog`, `min_compatible_child_version`, `published_at`, `is_latest`
- `cms_migration_manifest` — versioned list of SQL/JS migrations a child must run when adopting this version. Each entry: `id`, `version`, `kind` (`sql` | `js`), `payload`, `description`, `reversible`, `down_payload`
- `child_installations` — every child that has ever pinged: `site_id`, `current_version`, `last_seen_at`, `upgrade_state` (`up_to_date` | `pending` | `upgrading` | `failed` | `rolled_back`), `last_error`
- `child_upgrade_log` — per-child upgrade history with snapshots for rollback

All grants + RLS per the standard template; service_role-only writes; authenticated read on `cms_releases`.

### Phase 3 — Release edge function (parent)
`supabase/functions/cms-release/index.ts`:
- `GET /` → latest manifest (cached 60s, ETag)
- `GET /?version=1.4.2` → specific manifest
- `POST /heartbeat` → child reports `{site_id, current_version, status}` → upsert `child_installations`
- `POST /rollback` → admin-only; marks a release as recalled, children downgrade on next boot

CDN cache via `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`. Manifest is small JSON; SDK bundle is served from Supabase Storage `cms-sdk` bucket (public) at stable URLs like `/sdk/1.4.2/cms-core.js`.

### Phase 4 — SDK bundler (parent build)
Add a Vite library-mode build target that emits `dist/cms-core.{version}.js` (ESM, externalizes react/react-dom). A small Node script (`scripts/cut-release.ts`):
1. Reads `package.json` version
2. Bundles `src/cms-core/index.ts`
3. Uploads to Storage `cms-sdk/{version}/`
4. Inserts row into `cms_releases` with manifest (auto-collected migrations from `src/cms-core/migrations/`)
5. Flips `is_latest`

Admin UI ("Releases" tab in this CMS) wraps this with a button: **Cut release v1.5.0 → Push to all children**. Logs go through `activityLog`.

### Phase 5 — Child bootstrap loader
Every child remix gets a tiny, stable shim that does NOT change between versions (this is the only "frozen" code in children):

```ts
// src/cms-bootstrap.ts  ← never edit in child
import { bootstrapCmsCore } from "@/cms-core-loader";
export const CmsCore = await bootstrapCmsCore({
  parentUrl: import.meta.env.VITE_PARENT_CMS_URL,
  siteId: import.meta.env.VITE_SITE_ID,
  childVersion: __CHILD_SHIM_VERSION__,
});
```

`bootstrapCmsCore` does:
1. Fetch `/cms-release` manifest
2. Compare `current_version` (from local `child_installations` row) to `manifest.version`
3. If different: snapshot affected tables → run pending migrations in order → on failure, restore snapshot + report `failed` + stay on old version
4. Dynamic `import(manifest.sdk_url)` → returns the engine module
5. Send heartbeat
6. Re-check every 5 min + on focus

Child app uses `CmsCore.ThemeBlocksRenderer`, `CmsCore.VisualCanvas`, etc. — no direct imports of engine internals.

### Phase 6 — Override + safety system
- **Slot overrides** — child registers `CmsCore.registerSlot("Header.Logo", MyLogo)`. Parent updates that don't break the slot contract just work; if the slot contract changes (major version), child sees a banner "Override `Header.Logo` is incompatible with v2.0.0 — falling back to parent default".
- **Block overrides** — same pattern via `registerBlock`.
- **"Parent always wins" conflict policy**: when migration touches a row the child also customized, child's value is moved to `child_upgrade_log.snapshot` and parent's wins. Admin can one-click restore from the Activity Log.
- **Rollback**: every upgrade writes a reversible journal entry. `CmsCore.rollback()` (also exposed via parent's "Recall release" button) replays `down_payload` migrations in reverse.

---

## Admin surface (this CMS gets)

New sidebar group **"Distribution"** with three pages:

- `/admin/releases` — list of `cms_releases`, "Cut new release" wizard, changelog editor, recall button
- `/admin/installations` — every child site, current version, last heartbeat, upgrade state, manual force-upgrade per child
- `/admin/upgrade-log` — per-child upgrade events, snapshots, one-click rollback

These reuse `activityLog`, the existing sync tables aesthetic, and `useCachedQuery` for snappy navigation.

---

## What this means for each layer

| Layer | Owns | Receives from parent |
|---|---|---|
| **Parent Management Platform** | Master data, integrations, APIs | (unchanged) |
| **Parent CMS** (this project) | Engine source, release pipeline, distribution UI | (unchanged) |
| **Child website** | Pages, routes, content, slot/block overrides, theme tokens | Engine, blocks, sync, SEO, migrations — auto |

A child remix made today, modified by the user, will still receive every future engine update automatically — because the engine isn't in their repo, only the thin bootstrap shim is.

---

## Technical notes

- **Why edge function, not npm**: per your choice. Zero external infra; release == upload + DB insert; rollback == flag flip.
- **Why dynamic `import()` of a URL**: native ESM, Vite-compatible, lets us serve versioned SDKs without a child rebuild. Falls back to last-known-good cached in IndexedDB if parent is offline.
- **SDK size budget**: target ~150 KB gzipped for the core engine; lazy-load editor surfaces (`VisualCanvas`, `RichTextEditor`) on demand so public child pages stay fast.
- **Auth**: SDK URL is public (signed by checksum in manifest). Sensitive ops (heartbeat write, manifest mutation) go through the edge function with the child's `VITE_SITE_ID` + a derived HMAC.
- **Versioning**: strict semver. Patch/minor auto-apply (per your "parent always wins"); major still applies but logs a `breaking_change_applied` event and surfaces a banner so admins know.
- **Child shim version**: tracked separately (`__CHILD_SHIM_VERSION__`). If parent ever needs to update the shim itself, the manifest sets `min_compatible_child_version` and the child shows a "Re-remix or run upgrade script" notice — this should be rare (years between bumps).
- **Snapshots**: stored compressed in `child_upgrade_log.snapshot` (jsonb). Pruned after 90 days.

---

## What I will NOT touch in this phase

- Existing sync engine (`syncControl.ts`, sync_queue, sync_health) — stays as the content/config channel; this new pipeline is the **code/feature** channel. They are complementary, not overlapping.
- Existing parent → child auth flow
- Any child-side content, routes, or customizations

---

## Build order (when you say go)

1. Migration: `cms_releases`, `cms_migration_manifest`, `child_installations`, `child_upgrade_log` (+ grants + RLS)
2. `src/cms-core/index.ts` surface declaration + slot/block registries
3. `supabase/functions/cms-release/index.ts` + Storage bucket `cms-sdk`
4. `scripts/cut-release.ts` + Vite library build target
5. Admin pages: Releases, Installations, Upgrade Log
6. Child bootstrap shim + loader (delivered as a copy-paste snippet + a "Setup wizard" page in this CMS that generates the exact `cms-bootstrap.ts` file for each child)
7. End-to-end test: cut v0.1.0 → simulated child boots → applies dummy migration → renders via SDK → rollback

Estimated scope: ~12–15 new files, 1 migration, 1 edge function, 1 build script. No breaking changes to existing CMS features.
