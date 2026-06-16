# Architecture: Parent CMS + Child Sites

## End state

```text
cms-core (new Lovable project + GitHub repo)        ← Parent CMS
  ├─ src/cms-managed/        the shipped CMS code
  ├─ admin control plane:    Releases, Installations, Setup Wizard,
  │                          Signing Keys, Upgrade Log, API Registry
  ├─ Supabase project:       release registry + installation tracking only
  └─ .github/workflows/      build-cms-release.yml (tag → manifest → release)

this project (becomes Child #1: your personal site)
  ├─ src/cms-managed/        synced from Parent, never hand-edited
  ├─ src/cms-custom/         your overrides + site-specific code
  ├─ src/pages/, content     your website
  ├─ own Supabase project    your content DB
  └─ .github/workflows/cms-update.yml   receives update PRs

child 2, 3, ... 80 — same shape as Child #1, own repo, own DB
```

Parent ships code. Each child owns its own content database. Updates flow as GitHub PRs opened by the Parent's edge function — no manual Lovable prompting per child.

---

## Phase 1 — Stand up the Parent (in a new project)

You'll do this part in Lovable's UI, not in this chat:

1. From this project's three-dot menu → **Remix** → name it `cms-core`.
2. Open the remix → connect it to a new GitHub repo (`cms-core`) via Plus (+) → GitHub.
3. In the remix, ask Lovable to run the **"Parent cleanup"** task (next section).

The remix carries over the Supabase schema you already built (releases, child_installations, cms_install_prs, signing_keys, upgrade_log, api_registry) — that's exactly what the Parent needs.

### Parent cleanup task (run inside the `cms-core` remix)

Delete from the remix:
- `src/pages/` website pages: `Index, About, Blog, BlogPost, BlogTaxonomy, Books, BookACall, Contact, Press, Privacy, Terms, Service, AuthorArchive, TaxonomyArchive, DynamicPage`
- `src/components/site/*` (Hero, Footer, Header, Testimonials, etc. — site-specific)
- `src/data/services.ts` and any other personal-website content
- Website routes from `src/App.tsx`; keep only `/admin/*` routes and a minimal landing page that links to `/admin`
- Database content rows for cpt_entries, posts, media, authors, theme_* (keep schema, drop data)

Keep:
- Everything under `cms-distribution/managed/` → promote to `src/cms-managed/` at the repo root (this becomes the shipped artifact)
- All `/admin/*` pages
- `supabase/functions/cms-github-installer`, `cms-release`, `cms-marketplace`, `seo-*`, `redirect-resolver`, `site-config`, `image-import-worker`
- `.github/workflows/build-cms-release.yml`
- `cms-distribution/scripts/` (build-manifest, sync-managed)

---

## Phase 2 — Convert this project into Child #1

After the Parent is live with its own repo:

1. In this project, delete the Parent-only admin pages:
   `AdminReleases, AdminInstallations, AdminSetupWizard, AdminSigningKeys, AdminUpgradeLog, AdminApiRegistry, AdminSyncHub, AdminSyncControl, AdminSync, AdminComponentCloud`
2. Delete `cms-distribution/` (lives in Parent now).
3. Keep `src/cms-managed/` (synced copy) + `src/cms-custom/` (your overrides) + your website pages and content.
4. Add `cms.config.json` (site_id, parent_url, current cms version) and `cms.lock.json` (pinned release tag + checksums) at repo root.
5. Add `.github/workflows/cms-update.yml` that accepts `workflow_dispatch` from Parent and opens a PR replacing `src/cms-managed/` with the new release tarball.
6. From Parent's `/admin/setup-wizard`, register this child (its GitHub repo + permanent site_id) and trigger the first **install PR** to validate the loop end-to-end.

---

## Phase 3 — Update flow (the payoff)

```text
You edit CMS in `cms-core` Lovable project
       ↓ (auto-push to GitHub)
You bump version in Parent's /admin/releases  → "Build Release"
       ↓
GitHub Action tags `cms-v1.5.0`, builds manifest, creates GH Release
       ↓
Parent's /admin/installations shows "1.5.0 available" for every child
       ↓
You click "Request Update" on a child row
       ↓
cms-github-installer edge function → workflow_dispatch on child repo
       ↓
Child's cms-update.yml opens a PR replacing src/cms-managed/
       ↓
You review + merge → Lovable auto-syncs → child is on 1.5.0
```

No per-child Lovable prompting. The PR is the update.

---

## Per-child databases

Each child = its own Lovable Cloud (Supabase) project. The Parent's Supabase only stores:
- `releases` (version, tag, manifest, signature)
- `child_installations` (site_id, github_repo, current_version, status)
- `cms_install_prs` (PR url, state, target version)
- `signing_keys`, `upgrade_log`, `api_registry`

The child's Supabase stores its own posts, pages, media, users, theme, forms, leads — all the content tables. The shipped `src/cms-managed/` code reads from whichever Supabase the child is configured against (already how it works today via `src/integrations/supabase/client.ts`).

---

## Technical notes

- **Signing**: Parent signs each release manifest with a private key from `signing_keys`. The child's `cms-update.yml` verifies the signature before opening the PR — prevents tampered updates. Public keys are already SELECT-able to anon (existing schema).
- **`src/cms-managed/` is immutable in children**: a CODEOWNERS rule + a pre-commit hook (added by the install PR) blocks hand-edits. All customization goes in `src/cms-custom/` via the extension points already defined in `cms-distribution/child-template/src/cms-custom/index.ts`.
- **Version pinning**: `cms.lock.json` records the exact release tag + file checksums. The child workflow refuses to apply an update if checksums don't match the manifest.
- **Rollback**: each update PR is a normal Git commit. Revert the merge → child drops back to the previous version automatically on next Lovable sync.
- **Schema migrations**: ship SQL migration files inside the release manifest. The child workflow runs them against the child's own Supabase using a server-side action (never browser-triggered) — already part of the constraint set you locked in earlier.
- **No GitHub creds in frontend**: `GITHUB_INSTALLER_TOKEN` lives only as a Parent Supabase secret, used exclusively by `cms-github-installer` edge function.
- **Legacy installations**: the existing flag on `child_installations` keeps any pre-PR-flow children visible but marked legacy in `/admin/installations`.

---

## What I'll actually do when you switch to build mode

Because the Parent must live in a *different* Lovable project, this chat can only do half the work. The split:

**In this chat (Child #1 prep), I will:**
1. Add `cms.config.json` + `cms.lock.json` scaffolds at repo root.
2. Add `.github/workflows/cms-update.yml`.
3. Remove the Parent-only admin pages listed in Phase 2 and their routes.
4. Remove `cms-distribution/` (it now lives in the Parent remix).
5. Keep `src/cms-managed/` + `src/cms-custom/` intact.
6. Verify the site still builds and your website pages still render.

**You will (in Lovable UI, outside this chat):**
1. Remix this project → name it `cms-core` → connect new GitHub repo.
2. Open the remix and tell Lovable: *"Run the Parent cleanup from the plan"* — it has the same context and will execute Phase 1.
3. Come back here and tell me the Parent is live so I can run the install-PR test end-to-end against this child.

Confirm and I'll execute the Child #1 prep.