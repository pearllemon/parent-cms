# Child CMS Wizard (paste-and-go)

This is the **only file** a child Lovable site needs to receive the full parent
CMS. No CLI, no source copy, no rebuild — the admin runs from a signed ESM
bundle served by the parent.

## 1. Copy `RemoteAdmin.tsx` into your child project

Drop it at `src/cms-child/RemoteAdmin.tsx`.

## 2. Mount it at `/admin/*`

Inside your `App.tsx` (or wherever your routes live):

```tsx
import RemoteAdmin from "@/cms-child/RemoteAdmin";

<Route path="/admin/*" element={
  <RemoteAdmin
    parentBaseUrl="https://YOUR-PARENT.lovable.app"
    parentReleaseApi="https://YOUR-PARENT-PROJECT-REF.functions.supabase.co/cms-release"
  />
} />
```

Peer deps the child must have (every Lovable project ships with these): `react`,
`react-dom`, `react-router-dom`, `@tanstack/react-query`.

## 3. Open `/admin` once

You'll see a one-time setup screen. Paste your child project's:
- Lovable Cloud / Supabase URL
- Anon (publishable) key
- A unique `site_id` slug

That's it. The wizard verifies the parent's signed release, fetches the admin
bundle (~400 KB gzipped), and mounts it. All content reads/writes go to your
backend, not the parent's.

## Upgrades

When the parent cuts a new release, every child shows a toast:
**"Update available: v1.2.3 → Install"**. One click → bundle hot-swaps. If the
new bundle throws on mount the wizard auto-rolls back to the last good version.

## Power-user (eject)

Prefer the source in your repo? Download the release ZIP from
`/admin/releases` and run `node ./bin/install.mjs --target /path/to/child`.
You lose one-click upgrades but gain full per-site customization.
