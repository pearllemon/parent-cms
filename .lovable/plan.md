## Three-tier model (now grounded in your real Tier 1)

```text
TIER 1 — Parent Management Site (zvaiqrewtqvsokzbxnxt.supabase.co)
  Already has: sites table, site-config edge fn, heartbeat auto-register,
  per-site overrides, config versioning.
  Missing for this feature: GitHub repo info, update channels, update-check
  + update-apply endpoints, GITHUB_INSTALLER_TOKEN secret.

TIER 2 — Parent CMS (this Lovable repo, pearllemon/parent-cms)
  The "golden master" codebase that ships to children via GitHub.
  At runtime: client of Tier 1. Distribution UI VISIBLE.

TIER 3 — Child CMS (remixes installed from parent-cms repo)
  Identical code, runs in child mode. Distribution UI HIDDEN.
  Auth to Tier 1 = site_id + install_token. No GitHub creds, ever.
```

---

## Work split

### A. Tier 1 add-on package (you paste it into the Management project)
I'll generate it inside this repo at `tier1-management-package/` so you can copy/migrate it over. Contains:

1. **Migration** — extend `sites` (or add `site_install_meta`) with: `install_token text unique`, `github_repo text`, `update_channel text default 'stable'`, `auto_update boolean default false`, `current_version text`, `current_sha text`, `last_config_pull_at timestamptz`. Plus a singleton `parent_release_config` table: `parent_repo`, `default_branch`, `update_workflow_filename`, `signing_public_key`, `registry_endpoints jsonb`, `release_policy jsonb`.
2. **Edge functions** (4):
   - `parent-register-site` — child first boot: returns `{ site_id, install_token }`. Reuses existing `heartbeat` row when possible.
   - `parent-site-config` — returns sanitized `{ parent_repo, default_branch, update_workflow_filename, channel, auto_update, registry_endpoints, signing_public_key }`. No tokens.
   - `parent-update-check` — calls GitHub with Tier 1's `GITHUB_INSTALLER_TOKEN`, returns `{ latestVersion, latestSha, changelogUrl, updateAvailable }`.
   - `parent-update-apply` — dispatches the child's `cms-update.yml` workflow using Tier 1's token, logs to a new `child_upgrade_log` table.
3. **Secret to set on Tier 1**: `GITHUB_INSTALLER_TOKEN` (the only place it lives).
4. **README** with paste-in steps.

I cannot deploy to Tier 1 from here; you run the migration + deploy functions there.

### B. Tier 2 changes (this repo — I execute now)
1. **Slim `cms.config.json`** to:
   ```json
   { "management_url": "https://zvaiqrewtqvsokzbxnxt.supabase.co",
     "management_anon_key": "eyJ…",
     "site_id": "", "install_token": "" }
   ```
   Removes `parent_repo`, `channel`, `auto_update` (now come from Tier 1).
2. **New `src/cms-managed/lib/managementClient.ts`** — `registerSite()`, `pullConfig()`, `checkUpdate()`, `applyUpdate()`. POSTs to `${management_url}/functions/v1/parent-*` with `apikey` + `{ site_id, install_token, … }`. 5-min `localStorage` cache for config.
3. **Rewire `CmsUpdateCard`** to call `managementClient`. Show channel + last-pulled timestamp.
4. **Delete** `supabase/functions/cms-self-update-check` and `cms-self-update-apply` from this repo (they hardcoded the repo and assumed token-on-child — wrong tier).
5. **`VITE_CMS_MODE` gating** (`parent` default here, `child` in distributed template):
   - `AdminShell.tsx` Distribution section: already conditional, keep.
   - `src/App.tsx`: also guard routes `/admin/releases`, `installations`, `upgrade-log`, `apis`, `signing-keys`, `setup-wizard` — render `<Navigate to="/admin" replace />` in child mode so deep links don't expose them.
6. **New parent-only page** `/admin/management-link` — shows Tier 1 URL, site_id, install_token (masked), last config pull, buttons: Register, Pull config now, Rotate token.
7. **Child template** `cms-distribution/child-template/src/App.tsx`: remove distribution route imports entirely; `.env.example` sets `VITE_CMS_MODE=child`.

### C. Tier 3 (Child installs)
Nothing extra. Inherits the same `src/cms-managed/` from Tier 2; runs in `child` mode; `cms.config.json` populated by the install PR (site_id + install_token returned by `parent-register-site` on first boot).

---

## Security
- `GITHUB_INSTALLER_TOKEN` lives ONLY on Tier 1.
- Tier 2 + Tier 3 authenticate to Tier 1 with `site_id` + `install_token` (32-byte random, rotatable from Tier 1).
- No Tier 1 response ever contains GitHub credentials.
- Only Tier 1 calls `api.github.com` or dispatches workflows.

---

## Open questions (need answers before I build)

1. **Channels** — `stable` only for v1, or also `beta`?
2. **Self-registration** — when a child boots with empty `site_id`, auto-call `parent-register-site` and create itself in Tier 1, OR require manual approval in Tier 1 first?
3. **Tier 1 delivery** — generate the migration + functions as files under `tier1-management-package/` in this repo for you to copy over? (Recommended.)

Answer those three and I'll execute Part B end-to-end and hand you Part A as a paste-ready package.
