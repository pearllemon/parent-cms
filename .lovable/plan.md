This is a large, destructive cleanup. Before I start deleting files and data, here's exactly what I'll do — please confirm.

## 1. Promote the shipped CMS artifact

- Move `cms-distribution/managed/src/cms-managed/` → `src/cms-managed/` (becomes the canonical source of truth)
- Keep `cms-distribution/scripts/` (build-manifest, sync-managed) and `cms-distribution/manifest.json`
- Keep `.github/workflows/build-cms-release.yml` and `.github/workflows/cms-update.yml`
- Update `cms-distribution/scripts/sync-managed.mjs` so it reads from `src/cms-managed/` going forward

## 2. Delete website-only code

Pages (`src/pages/`):
Index, About, Blog, BlogPost, BlogTaxonomy, Books, BookACall, Contact, Press, Privacy, Terms, Service, AuthorArchive, TaxonomyArchive, DynamicPage

Components (`src/components/site/`):
Hero, Header, Footer, Testimonials, YouTubeSection, LatestBlogs, SplitMediaCTA, Adventure, ContactBlock, EntrepreneurshipWealth, LearnMoreCTA, ProServices, StoriesOfMyLife, TeamAndPress, TedxBento, ThemeBlocksRenderer, Layout, FormRenderer
(Keep `DynamicRouter` — admin/landing still needs it? Actually no, will drop it too since no public site pages remain.)

Data: `src/data/services.ts`

## 3. Rewrite `src/App.tsx`

- Remove all public-site imports/routes
- Keep all `/admin/*` routes exactly as they are
- Add a minimal landing page at `/` that shows "Parent CMS" + button linking to `/admin`
- Remove `<DynamicRouter>` catch-all; replace with simple "Not found → /admin" redirect

## 4. Wipe database content (schema stays)

Truncate (data only, no schema changes):
`cpt_entries`, `entry_field_values`, `entry_terms`, `imported_posts`, `media_meta`, `media_folders`, `image_assets`, `image_import_jobs`, `authors`, `theme_sections`, `theme_templates`, `theme_tokens`, `elementor_templates`, `elementor_site_settings`, `page_blocks`, `page_block_versions`, `page_schemas`, `post_seo`, `seo_scores`, `revisions`, `leads`, `redirects`, `internal_links`, `link_suggestions`, `taxonomies`, `taxonomy_terms`, `template_assignments`, `custom_post_types`, `custom_fields`, `form_definitions`, `import_history`, `orphan_edits`

Keeping data in: `admin_users`, `site_settings`, `cms_releases`, `cms_signing_keys`, `cms_api_registry`, `applied_cms_migrations`, `cms_migration_manifest`, `child_installations`, `child_upgrade_log`, `cms_install_prs`, sync_* tables, cloud_component_* tables, `user_table_prefs`, `activity_log`.

## 5. Add the "Check for CMS updates" self-update system

The parent repo lives at `github.com/pearllemon/parent-cms`. I'll add:

- **Edge function `cms-self-update`** that:
  1. Calls GitHub API `/repos/pearllemon/parent-cms/releases/latest` (and `/commits/main` as fallback) using `GITHUB_INSTALLER_TOKEN`
  2. Compares latest tag/sha against `cms.lock.json` in the running install
  3. Returns `{ currentVersion, latestVersion, updateAvailable, changelogUrl }`

- **Edge function `cms-self-update-apply`** that:
  1. Opens a PR (or pushes a branch) in the *child* repo using the GitHub App / installer token, bumping `cms.lock.json` and copying new `src/cms-managed/` files from the parent repo's release tarball
  2. Records the upgrade in `child_upgrade_log`
  3. Returns PR URL so the user can merge with one click

- **UI**: add an "Updates" card on `AdminDashboard` (and a dedicated `/admin/upgrade-log` enhancement) with:
  - "Check for updates" button → calls `cms-self-update`
  - "Install update" button → calls `cms-self-update-apply`
  - Shows current vs latest version + changelog link
  - No Lovable AI credits used — pure GitHub REST calls

## 6. Functions I will NOT touch (keep as-is)

`cms-release`, `cms-marketplace`, `seo-file`, `seo-regenerate`, `redirect-resolver`, `site-config`, `image-import-worker`, `cms-forms`, `cms-sdk-stub`

Note: there is no `cms-github-installer` function in the project today — the self-update functions above will cover that role.

---

### ⚠️ Things I want you to confirm before I run this

1. **Database wipe is irreversible.** Confirm you want me to truncate all the content tables listed in section 4.
2. **GitHub repo `pearllemon/parent-cms`** — is this remix project already connected to that repo via Lovable's GitHub integration? The self-update edge functions need the `GITHUB_INSTALLER_TOKEN` to have `contents:write` + `pull_requests:write` scope on both the parent repo and any child repos.
3. **Landing page at `/`** — just a plain "Parent CMS / Go to Admin" page, or do you want a slightly nicer marketing-style splash?

Reply "go" (or with answers/changes) and I'll execute the whole thing in one pass.