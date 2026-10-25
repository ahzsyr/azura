#!/usr/bin/env node
/**
 * Fail CI when a known-vulnerable dependency version resolves into the tree.
 *
 * Advisories remediated so far (see package.json): next, nodemailer, zod,
 * dompurify, fast-uri. When a new advisory lands, add the package and the
 * first patched version to MIN_SAFE: `"pkg": "1.2.3"` means ">= 1.2.3 is safe
 * within that major line".
 *
 * Usage: node scripts/ci/check-dependency-advisories.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/** package -> first patched release. */
const MIN_SAFE = {
  next: "16.4.3",
  nodemailer: "10.2.1",
  zod: "4.4.3",
  dompurify: "3.4.17",
  "fast-uri": "3.1.9",
};

function parseVersion(version) {
  return String(version)
    .split("-")[0]
    .split(".")
    .map((n) => Number.parseInt(n, 10) || 0);
}

function compareVersions(a, b) {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  for (let i = 0; i < 3; i += 1) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  // A prerelease sorts before its own release (5.0.0-beta.32 < 5.0.0).
  const aPre = String(a).includes("-");
  const bPre = String(b).includes("-");
  if (aPre !== bPre) return aPre ? -1 : 1;
  return 0;
}

/** Vulnerable when the same major (or older) and below the first patched release. */
function isVulnerable(pkg, version) {
  const safe = MIN_SAFE[pkg];
  const [safeMajor] = parseVersion(safe);
  const [major] = parseVersion(version);
  if (major > safeMajor) return false;
  return compareVersions(version, safe) < 0;
}

/** `node_modules/a/node_modules/@scope/pkg` -> `@scope/pkg`. */
function packageNameFromLockKey(key) {
  const marker = "node_modules/";
  return key.slice(key.lastIndexOf(marker) + marker.length);
}

const lockPath = join(process.cwd(), "package-lock.json");
if (!existsSync(lockPath)) {
  console.error(`Missing ${lockPath}`);
  process.exit(1);
}

const lock = JSON.parse(readFileSync(lockPath, "utf8"));
const findings = [];

for (const [key, entry] of Object.entries(lock.packages ?? {})) {
  if (!key.startsWith("node_modules/") || !entry?.version) continue;
  const name = packageNameFromLockKey(key);
  if (!Object.hasOwn(MIN_SAFE, name)) continue;
  if (!isVulnerable(name, entry.version)) continue;
  findings.push(`${key}: ${name}@${entry.version} needs >= ${MIN_SAFE[name]}`);
}

if (findings.length > 0) {
  console.error("Known-vulnerable dependency versions found:");
  for (const line of findings) console.error(`  ✖ ${line}`);
  process.exit(1);
}

const summary = Object.entries(MIN_SAFE)
  .map(([name, min]) => `${name}>=${min}`)
  .join(", ");
console.log(`Advisory check passed (${summary})`);
