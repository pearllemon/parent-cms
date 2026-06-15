import { Plugin } from "vite";
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { createHash } from "node:crypto";

/**
 * Snapshots the parent CMS source tree into public/cms-snapshot.json so
 * the in-browser release packager can bundle the full admin into a ZIP
 * without filesystem access.
 *
 * Included paths are the minimum needed for a child site to render the
 * full admin against its OWN Supabase backend.
 */
const INCLUDE: Array<{ dir: string; exts: string[] }> = [
  { dir: "src/pages/admin", exts: [".ts", ".tsx", ".css"] },
  { dir: "src/components/admin", exts: [".ts", ".tsx"] },
  { dir: "src/components/ui", exts: [".ts", ".tsx"] },
  { dir: "src/components/editor", exts: [".ts", ".tsx"] },
  { dir: "src/components/site", exts: [".ts", ".tsx"] },
  { dir: "src/lib", exts: [".ts", ".tsx"] },
  { dir: "src/hooks", exts: [".ts", ".tsx"] },
  { dir: "src/cms-core", exts: [".ts", ".tsx"] },
  { dir: "src/providers", exts: [".ts", ".tsx"] },
  { dir: "src/integrations/supabase", exts: [".ts"] },
  { dir: "supabase/functions", exts: [".ts", ".toml"] },
  { dir: "supabase/migrations", exts: [".sql"] },
];

const SINGLE_FILES = [
  "src/index.css",
  "src/App.css",
  "tailwind.config.ts",
  "postcss.config.js",
  "components.json",
];

function walk(root: string, dir: string, exts: string[], out: Record<string, string>) {
  const abs = join(root, dir);
  if (!existsSync(abs)) return;
  for (const name of readdirSync(abs)) {
    const full = join(abs, name);
    const rel = relative(root, full).split("\\").join("/");
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(root, rel, exts, out);
    } else if (exts.some((e) => name.endsWith(e))) {
      out[rel] = readFileSync(full, "utf8");
    }
  }
}

export function cmsSnapshotPlugin(): Plugin {
  let root = process.cwd();
  const build = () => {
    const files: Record<string, string> = {};
    for (const inc of INCLUDE) walk(root, inc.dir, inc.exts, files);
    for (const f of SINGLE_FILES) {
      const p = join(root, f);
      if (existsSync(p)) files[f] = readFileSync(p, "utf8");
    }
    const pkgJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    const snapshot = {
      generatedAt: new Date().toISOString(),
      fileCount: Object.keys(files).length,
      dependencies: pkgJson.dependencies ?? {},
      devDependencies: pkgJson.devDependencies ?? {},
      files,
    };
    const json = JSON.stringify(snapshot);
    const sha = createHash("sha256").update(json).digest("hex");
    const outDir = join(root, "public");
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "cms-snapshot.json"), json);
    writeFileSync(join(outDir, "cms-snapshot.sha256"), sha);
    // eslint-disable-next-line no-console
    console.log(`[cms-snapshot] wrote ${snapshot.fileCount} files (sha256 ${sha.slice(0, 12)}…)`);
  };
  return {
    name: "cms-snapshot",
    apply: () => true,
    configResolved(c) { root = c.root; },
    buildStart() { build(); },
    configureServer(server) {
      build();
      server.watcher.on("change", (file) => {
        if (INCLUDE.some((i) => file.includes(i.dir)) || SINGLE_FILES.some((f) => file.endsWith(f))) {
          try { build(); } catch (e) { /* ignore */ }
        }
      });
    },
  };
}
