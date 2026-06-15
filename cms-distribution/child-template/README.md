# Child Website Template

Minimal scaffold a new child site starts from. Pulls the reusable CMS from
`@our-org/cms-managed` (installed from a Git tag such as `cms-v1.1.0`).

```
src/
  cms-custom/         # Child-specific overrides (safe to edit)
    index.ts
  main.tsx
  App.tsx             # Wires <CmsManagedApp /> + site routes
```

The managed package is consumed read-only:

```ts
// src/App.tsx
import { CmsManagedApp } from "@our-org/cms-managed";
import { overrides } from "./cms-custom";

export default function App() {
  return <CmsManagedApp overrides={overrides} />;
}
```

Do not modify any file under `node_modules/@our-org/cms-managed` or a vendored
copy of it. The Parent CMS owns updates; children pull a newer Git tag.
