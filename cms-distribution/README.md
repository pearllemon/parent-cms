# CMS Distribution

GitHub-managed source distribution for the reusable Child CMS.

```
cms-distribution/
  managed/
    src/cms-managed/      # Source of truth — reusable Child CMS source files
    package.json          # Distributed package metadata
    tsconfig.json
  child-template/         # Bootstrap shell a new child website starts from
  manifest.json           # Release manifest (version, tag, checksums, etc.)
  scripts/
    sync-managed.mjs      # Copies reusable code from Parent src/ into managed/
    build-manifest.mjs    # Recomputes checksums + manifest fields
```

## Rules

- `cms-distribution/managed` is the **source of truth** for files shipped to
  children. Children must not edit anything inside `cms-managed/`; per-site
  overrides live in `src/cms-custom/` in the child repo.
- Parent-only screens (Releases, Installations, Upgrade Log, Signing Keys,
  API Registry, Setup Wizard, Sync Hub, fleet management, GitHub credentials)
  are intentionally excluded.
- No runtime SQL is distributed. Schema changes ship as forward-only
  migrations through the existing Parent release flow.
- No mutable remote SDK is dynamically imported by the managed package.
- The legacy `cms_releases` / `RemoteAdmin` system is **not** removed; this
  GitHub-managed distribution runs alongside it.

## Workflow

1. Bump version + sync sources locally:
   ```
   node cms-distribution/scripts/sync-managed.mjs
   node cms-distribution/scripts/build-manifest.mjs 1.1.0
   ```
2. Push to `main`, then trigger `build-cms-release.yml` with the desired
   semantic version. The workflow validates the version, runs typecheck and
   tests, builds, recomputes checksums, tags `cms-v<version>`, and creates a
   GitHub Release. Metadata is mirrored into `cms_releases` where possible.
