#!/usr/bin/env node
/**
 * CI guard: fail if production code reads runtime data directories without cloud-native guard.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");

const READ_PATTERNS = [
  /readFile(?:Sync)?\s*\(/,
  /existsSync\s*\(/,
  /statSync\s*\(/,
];

const DATA_PATH_MARKERS = [
  /src[/\\]data/,
  /products-index/,
  /collections\.json/,
  /site\.json/,
  /media-library\.json/,
  /currency\.config\.json/,
  /seeds[/\\]catalog/,
];

const GUARD_MARKERS = [
  /isCloudNativeProduction\s*\(\s*\)/,
  /useCatalogProductsDb\s*\(\s*\)/,
  /useDatabaseOnlyCatalog\s*\(\s*\)/,
  /assertNoRuntimeDataFsRead/,
  /cloud-native:\s*fs-ok/,
];

const ALLOWLIST = new Set([
  "src/lib/cloud-native-guard.ts",
  "src/lib/catalog-seed-paths.ts",
]);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === "node_modules" || name === "data" || name.startsWith(".")) continue;
      walk(full, out);
    } else if (/\.(ts|tsx|mjs|js)$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

function hasGuard(content, matchIndex) {
  const windowStart = Math.max(0, matchIndex - 1200);
  const windowEnd = Math.min(content.length, matchIndex + 400);
  const slice = content.slice(windowStart, windowEnd);
  return GUARD_MARKERS.some((m) => m.test(slice));
}

function isStaticImport(content, matchIndex) {
  const lineStart = content.lastIndexOf("\n", matchIndex) + 1;
  const lineEnd = content.indexOf("\n", matchIndex);
  const line = content.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
  return /^\s*import\s/.test(line);
}

const violations = [];

for (const file of walk(SRC)) {
  const rel = relative(ROOT, file).replace(/\\/g, "/");
  if (ALLOWLIST.has(rel)) continue;
  if (rel.startsWith("src/data/")) continue;

  const content = readFileSync(file, "utf-8");
  if (!READ_PATTERNS.some((p) => p.test(content))) continue;

  for (const readPattern of READ_PATTERNS) {
    let match;
    const re = new RegExp(readPattern.source, readPattern.flags.includes("g") ? readPattern.flags : readPattern.flags + "g");
    while ((match = re.exec(content)) !== null) {
      const windowStart = match.index;
      const windowEnd = Math.min(content.length, match.index + 800);
      const slice = content.slice(windowStart, windowEnd);
      if (!DATA_PATH_MARKERS.some((m) => m.test(slice))) continue;
      if (isStaticImport(content, match.index)) continue;
      if (hasGuard(content, match.index)) continue;
      violations.push(`${rel}: unguarded filesystem read near ${readPattern}`);
      break;
    }
  }
}

if (violations.length) {
  console.error("Cloud-native reads guard violations:\n" + violations.join("\n"));
  process.exit(1);
}

console.log("Cloud-native reads guard: OK");
