# @our-org/cms-managed

Source of truth for reusable Child CMS code. Do not edit files under
`src/cms-managed/` in a child project — override via `src/cms-custom/`.

Excluded by design (Parent-only): Releases, Installations, Upgrade Log,
Signing Keys, API Registry, Setup Wizard, Sync Hub, fleet management,
GitHub credentials, release builder/signer/SDK uploader.
