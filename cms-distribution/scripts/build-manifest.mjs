#!/usr/bin/env node
/**
 * Recompute cms-distribution/manifest.json:
 *   - version (CLI arg or $CMS_RELEASE_VERSION)
 *   - gitTag = cms-v<version>
 *   - sourceCommit = HEAD sha
 *   - createdAt = ISO timestamp
 *   - files = { relativePath: sha256 } for every file under managed/src
 *
 * Refuses to run unless the version matches semver MAJOR.MINOR.PATCH
 * (with an optional -prerelease).
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const distRoot = path.join(repoRoot, "cms-distribution");
const managedSrc = path.join(distRoot, "managed", "src");
const manifestPath = path.join(distRoot, "manifest.json");

const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

function git(cmd, fallback = null) {
  try {
    return execSync(`git ${cmd}`, { cwd: repoRoot, stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return fallback;
  }
}

async function walk(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full)));
    else if (e.isFile()) out.push(full);
  }
  return out;
}

async function sha256(file) {
  const buf = await fs.readFile(file);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

async function main() {
  const version = process.argv[2] || process.env.CMS_RELEASE_VERSION;
  if (!version || !SEMVER.test(version)) {
    console.error(`Invalid or missing version: ${version}\nExpected semver MAJOR.MINOR.PATCH.`);
    process.exit(1);
  }

  const files = await walk(managedSrc);
  const checksums = {};
  for (const f of files.sort()) {
    const rel = path.relative(distRoot, f).split(path.sep).join("/");
    checksums[rel] = await sha256(f);
  }

  const prev = JSON.parse(await fs.readFile(manifestPath, "utf8").catch(() => "{}"));

  const manifest = {
    version,
    gitTag: `cms-v${version}`,
    sourceCommit: git("rev-parse HEAD"),
    createdAt: new Date().toISOString(),
    minimumChildInstallerVersion: prev.minimumChildInstallerVersion || "1.0.0",
    releaseNotes: process.env.CMS_RELEASE_NOTES || prev.releaseNotes || "",
    files: checksums,
  };

  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`Wrote manifest for ${manifest.gitTag} (${files.length} files)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
