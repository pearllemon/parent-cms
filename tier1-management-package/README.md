# Tier 1 — Parent Management add-on

Paste this into the **Parent Management Site** (the Supabase project at
`zvaiqrewtqvsokzbxnxt.supabase.co`). It adds the centralized GitHub +
release-config layer that both the Parent CMS (Tier 2) and Child CMS
installs (Tier 3) call into.

## What gets added

1. **Migration** (`migrations/001_parent_release_config.sql`)
   - `parent_release_config` — singleton row with GitHub repo, default branch,
     update workflow filename, signing public key, registry endpoints, release policy.
   - `parent_managed_sites` — one row per registered site (Parent CMS + every Child).
     Holds `install_token`, `update_channel`, `auto_update`, last-seen version/sha.
   - `child_upgrade_log` — append-only log of dispatched updates.

2. **Edge functions** (in `functions/`)
   - `parent-register-site` — first-boot registration. Returns `{ site_id, install_token }`.
   - `parent-site-config` — returns sanitized config for the calling site. **No tokens.**
   - `parent-update-check` — calls GitHub with Tier 1's token, returns latest version/sha.
   - `parent-update-apply` — dispatches the child's `cms-update.yml` workflow.

3. **Secret** — set `GITHUB_INSTALLER_TOKEN` on the Management project only.
   This is the **only** place it lives. It never leaves Tier 1.

## Install steps

1. Run `migrations/001_parent_release_config.sql` against the Management DB.
2. Insert one row into `parent_release_config`:
   ```sql
   INSERT INTO public.parent_release_config (parent_repo, default_branch)
   VALUES ('pearllemon/parent-cms', 'main');
   ```
3. Deploy the four edge functions in `functions/`.
4. Add the secret `GITHUB_INSTALLER_TOKEN` to the Management project
   (a GitHub PAT with `contents:write` + `actions:write` on the parent repo
   AND `actions:write` on every child repo, OR a GitHub App installation token).

## Wire-up on Tier 2 / Tier 3

Each site's `cms.config.json` only needs:

```json
{
  "management_url": "https://zvaiqrewtqvsokzbxnxt.supabase.co",
  "management_anon_key": "<anon key>",
  "site_id": "",
  "install_token": ""
}
```

On first boot the site calls `parent-register-site` and stores the returned
`site_id` + `install_token` locally. From then on all GitHub repo info,
channel, and policy are pulled from `parent-site-config`.