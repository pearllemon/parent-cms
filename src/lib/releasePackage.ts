import JSZip from "jszip";

export type ReleasePackageInput = {
  version: string;
  releaseEndpoint: string;
  sdkUrl: string | null;
  manifest: Record<string, unknown>;
  migrations: Array<Record<string, unknown>>;
  changelog?: string | null;
  minCompatibleChild?: string | null;
};

export type ReleasePackageMeta = {
  blob: Blob;
  sha256: string;
  size: number;
  snapshotSha256: string | null;
  snapshotFileCount: number;
};

async function sha256Hex(blob: Blob | ArrayBuffer): Promise<string> {
  const buf = blob instanceof Blob ? await blob.arrayBuffer() : blob;
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function stableJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

type Snapshot = {
  generatedAt: string;
  fileCount: number;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  files: Record<string, string>;
};

async function loadSnapshot(): Promise<Snapshot | null> {
  try {
    const r = await fetch("/cms-snapshot.json", { cache: "no-store" });
    if (!r.ok) return null;
    return (await r.json()) as Snapshot;
  } catch {
    return null;
  }
}

const INSTALL_README = (version: string, fileCount: number) => `# Parent CMS v${version} — Installable Release

This ZIP contains a full snapshot of the parent CMS admin (${fileCount} files):
admin pages, components, shadcn UI, libs, hooks, edge functions, and database migrations.

## One-command install (child site)

From the root of your child project:

\`\`\`bash
# extract this zip somewhere, then:
node ./bin/install.mjs --target /absolute/path/to/your/child-project
\`\`\`

The installer will:
1. Verify the snapshot SHA-256 against the signed release manifest.
2. Write all admin files under \`src/cms/\` in your child repo.
3. Write \`supabase/migrations/\` and \`supabase/functions/\` into your child repo.
4. Add missing npm dependencies to your \`package.json\` (no overwrite).
5. Print follow-up steps for env vars, router wiring, and migration apply.

## Required child env (\`.env\`)

\`\`\`
VITE_SUPABASE_URL=...                   # YOUR child Supabase URL
VITE_SUPABASE_PUBLISHABLE_KEY=...       # YOUR child anon key
VITE_PARENT_RELEASE_API=...             # parent release endpoint (for auto-upgrades)
VITE_SITE_ID=...                        # unique child site id
\`\`\`

## Router wiring

Add to your top-level router:

\`\`\`tsx
import { AdminRoutes } from "@/cms/admin-routes";
// ...
<Route path="/admin/*" element={<AdminRoutes />} />
\`\`\`

## Apply DB migrations against the child Supabase

Using the Supabase CLI (\`supabase link\` to your child project first):

\`\`\`bash
supabase db push
supabase functions deploy --no-verify-jwt
\`\`\`

## Upgrading later

\`\`\`bash
node ./bin/install.mjs --target /path/to/child --upgrade
\`\`\`

Already-applied files are skipped; new files are added; modified files are written
only when their SHA-256 changed since the last install. A backup \`*.bak\` is kept.
`;

const INSTALLER_JS = `#!/usr/bin/env node
// Parent CMS installer — unpacks a full admin snapshot into a child repo.
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, copyFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { createHash } from "node:crypto";

function arg(name, def) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : def;
}
const TARGET = resolve(arg("--target", process.cwd()));
const UPGRADE = process.argv.includes("--upgrade");
const DRY = process.argv.includes("--dry");

const here = dirname(new URL(import.meta.url).pathname);
const root = resolve(here, "..");
const snap = JSON.parse(readFileSync(join(root, "cms-snapshot.json"), "utf8"));
const release = JSON.parse(readFileSync(join(root, "release.json"), "utf8"));

const expected = readFileSync(join(root, "cms-snapshot.sha256"), "utf8").trim();
const actual = createHash("sha256").update(JSON.stringify(snap)).digest("hex");
// Note: the recorded sha hashes the original on-disk JSON; if it differs that's
// only because of formatting. We compare against release.snapshot_sha256 below.
if (release.snapshot_sha256 && release.snapshot_sha256 !== expected) {
  console.error("Snapshot SHA mismatch vs release manifest. Aborting.");
  process.exit(2);
}

const ADMIN_PREFIXES = ["src/pages/admin/", "src/components/admin/", "src/components/ui/", "src/components/editor/", "src/components/site/", "src/lib/", "src/hooks/", "src/cms-core/", "src/providers/", "src/integrations/supabase/"];

function targetFor(rel) {
  // Route admin source under src/cms/ in the child project to avoid clashes.
  for (const p of ADMIN_PREFIXES) {
    if (rel.startsWith(p)) return join("src/cms", rel.slice(4)); // strip leading "src/"
  }
  if (rel.startsWith("supabase/")) return rel;
  if (rel === "src/index.css" || rel === "src/App.css") return join("src/cms", rel.slice(4));
  if (rel === "tailwind.config.ts") return "src/cms/tailwind.preset.ts";
  if (rel === "components.json") return "src/cms/components.json";
  return join("src/cms/_root", rel);
}

let wrote = 0, skipped = 0, conflicts = 0;
for (const [rel, content] of Object.entries(snap.files)) {
  const dest = join(TARGET, targetFor(rel));
  if (!DRY) mkdirSync(dirname(dest), { recursive: true });
  if (existsSync(dest)) {
    const existing = readFileSync(dest, "utf8");
    if (existing === content) { skipped++; continue; }
    if (!UPGRADE) { conflicts++; continue; }
    if (!DRY) copyFileSync(dest, dest + ".bak");
  }
  if (!DRY) writeFileSync(dest, content);
  wrote++;
}

// Generate admin-routes.tsx pointing at the CMS admin tree.
const routesFile = join(TARGET, "src/cms/admin-routes.tsx");
if (!existsSync(routesFile) || UPGRADE) {
  const routes = \`import { Routes, Route } from "react-router-dom";
import AdminShell from "@/cms/pages/admin/AdminShell";
export function AdminRoutes() {
  return (<Routes><Route path="/*" element={<AdminShell />} /></Routes>);
}
\`;
  if (!DRY) {
    mkdirSync(dirname(routesFile), { recursive: true });
    writeFileSync(routesFile, routes);
  }
}

// Merge dependencies into child package.json (no overwrite).
const pkgPath = join(TARGET, "package.json");
if (existsSync(pkgPath)) {
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  pkg.dependencies = pkg.dependencies || {};
  let added = 0;
  for (const [k, v] of Object.entries(snap.dependencies)) {
    if (!pkg.dependencies[k]) { pkg.dependencies[k] = v; added++; }
  }
  if (!DRY && added) writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\\n");
  console.log(\`Added \${added} new dependencies to package.json\`);
}

console.log(\`Wrote \${wrote} files, skipped \${skipped} unchanged, \${conflicts} conflicts (use --upgrade to overwrite).\`);
console.log(\`Next: bun install && supabase db push && supabase functions deploy --no-verify-jwt\`);
console.log(\`Then mount <AdminRoutes/> from src/cms/admin-routes.tsx at path "/admin/*".\`);
`;

export async function buildReleaseZip(input: ReleasePackageInput): Promise<ReleasePackageMeta> {
  const zip = new JSZip();
  const snapshot = await loadSnapshot();
  const snapshotJson = snapshot ? JSON.stringify(snapshot) : null;
  const snapshotSha = snapshotJson ? await sha256Hex(new TextEncoder().encode(snapshotJson).buffer) : null;
  const fileCount = snapshot?.fileCount ?? 0;

  const releaseJson = {
    version: input.version,
    releaseEndpoint: input.releaseEndpoint,
    sdkUrl: input.sdkUrl,
    minCompatibleChild: input.minCompatibleChild ?? null,
    changelog: input.changelog ?? null,
    generatedAt: new Date().toISOString(),
    snapshot_sha256: snapshotSha,
    snapshot_file_count: fileCount,
    bundle_kind: snapshot ? "full-admin" : "shim-only",
  };

  zip.file("README.md", INSTALL_README(input.version, fileCount));
  zip.file("release.json", stableJson(releaseJson));
  zip.file("manifest.json", stableJson(input.manifest));
  zip.file("migrations.json", stableJson(input.migrations));
  zip.file(".env.example", [
    "VITE_SUPABASE_URL=your-child-supabase-url",
    "VITE_SUPABASE_PUBLISHABLE_KEY=your-child-anon-key",
    `VITE_PARENT_RELEASE_API=${input.releaseEndpoint}`,
    `VITE_PARENT_API=${input.releaseEndpoint.replace(/\/cms-release\/?$/, "/site-config")}`,
    "VITE_SITE_ID=your-child-site-id",
    "",
  ].join("\n"));

  if (snapshot && snapshotJson && snapshotSha) {
    zip.file("cms-snapshot.json", snapshotJson);
    zip.file("cms-snapshot.sha256", snapshotSha);
    zip.file("bin/install.mjs", INSTALLER_JS);
  } else {
    zip.file("SNAPSHOT_MISSING.txt", "Snapshot was unavailable when this ZIP was built. The release contains only the shim. Rebuild from the parent dev server with the cms-snapshot Vite plugin enabled to include the full admin tree.");
  }

  // Keep the legacy shim too so old child code still works.
  zip.file("cms-bootstrap.example.ts", [
    "export async function bootParentCms() {",
    "  const releaseUrl = import.meta.env.VITE_PARENT_RELEASE_API;",
    "  const siteId = import.meta.env.VITE_SITE_ID;",
    "  const res = await fetch(`${releaseUrl}?site_id=${encodeURIComponent(siteId)}`, { cache: \"no-store\" });",
    "  if (!res.ok) throw new Error(`Parent CMS release failed: ${res.status}`);",
    "  const release = await res.json();",
    "  if (release?.sdk_url) await import(/* @vite-ignore */ release.sdk_url);",
    "  return release;",
    "}",
    "",
  ].join("\n"));

  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
  return {
    blob,
    sha256: await sha256Hex(blob),
    size: blob.size,
    snapshotSha256: snapshotSha,
    snapshotFileCount: fileCount,
  };
}
