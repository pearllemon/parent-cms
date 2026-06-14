# @our-org/cms-core

Versioned CMS Core SDK consumed by child websites.

## Install (child project)

```bash
bun add @our-org/cms-core
```

This package contains the **stable bootstrap shim** — the only thing that ships
inside the child bundle. The actual engine (renderers, stores, admin canvas)
is delivered at runtime as a signed SDK bundle and loaded via native ES module
`import()` — never `eval` or `new Function`.

## Use

```ts
// src/cms-bootstrap.ts (or src/routes/__root.tsx for TanStack Start)
import { bootstrapCmsCore } from "@our-org/cms-core/bootstrap";
import { supabase } from "@/integrations/supabase/client";
import { TRUSTED_KEYS } from "./trusted-keys";

export const cmsCorePromise = bootstrapCmsCore({
  parentReleaseUrl: import.meta.env.VITE_PARENT_RELEASE_URL,
  trustedPublicKeys: TRUSTED_KEYS,
  allowedSdkOrigins: [import.meta.env.VITE_PARENT_SDK_ORIGIN],
  mode: "child",
  async runMigration(ctx) {
    // Forward the verified step to your child's edge function that calls
    // exec_cms_migration with service_role. The bootstrap will only invoke
    // this AFTER the Ed25519 signature has been verified locally.
    const { error } = await supabase.functions.invoke("cms-migrate", {
      body: ctx,
    });
    if (error) throw error;
  },
});
```

## Security guarantees

- Every release manifest carries an Ed25519 signature + canonical payload hash.
- The child verifies the signature against an **embedded** trusted key set
  before running any migration or loading any SDK bundle.
- Migrations run **forward-only** through `exec_cms_migration` (service-role
  gated DB function); downgrades and unsigned releases are rejected.
- The SDK bundle URL must be on an explicit allow-list of origins; otherwise
  the import is refused.
- No remote string execution: only native `import()` of HTTPS modules.

## Development scaffold

During development the package re-exports from the parent CMS workspace at
`../../src/cms-core`. When publishing, copy `src/cms-core/*` into
`packages/cms-core/src/` and `npm publish`.
