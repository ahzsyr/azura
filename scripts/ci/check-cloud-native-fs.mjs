#!/usr/bin/env node
/**
 * CI guard: fail if production code writes to runtime data directories without cloud-native guard.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");

const BLOCKED_PATTERNS = [
  /writeFile\s*\([^)]*src[/\\]data/i,
  /writeFile\s*\([^)]*seeds[/\\]catalog/i,
  /writeFile\s*\([^)]*public[/\\]uploads/i,
  /writeFile\s*\([^)]*data[/\\]search-analytics/i,
  /readFile(?:Sync)?\s*\([^)]*src[/\\]data/i,
  /existsSync\s*\([^)]*src[/\\]data/i,
  /mkdir\s*\([^)]*src[/\\]data/i,
  /mkdir\s*\([^)]*public[/\\]uploads/i,
];

const ALLOWLIST = new Set([
  "src/lib/cloud-native-guard.ts",
  "src/features/products/products-persistence.ts",
  "src/features/collections/collections-persistence.ts",
  "src/features/catalog/site-settings.service.ts",
  "src/features/search/analytics/search-analytics-store.service.ts",
  "src/features/products/index/product-index-builder.ts",
  "src/app/api/collections/route.ts",
  "src/app/api/catalog-media/upload/route.ts",
]);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === "node_modules" || name.startsWith(".")) continue;
      walk(full, out);
    } else if (/\.(ts|tsx|mjs|js)$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

const violations = [];

for (const file of walk(SRC)) {
  const rel = relative(ROOT, file).replace(/\\/g, "/");
  if (ALLOWLIST.has(rel)) continue;

  const content = readFileSync(file, "utf-8");
  if (!content.includes("writeFile") && !content.includes("mkdir(") && !content.includes("readFile")) continue;

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(content)) {
      violations.push(`${rel}: matches ${pattern}`);
    }
  }
}

if (violations.length) {
  console.error("Cloud-native FS guard violations:\n" + violations.join("\n"));
  process.exit(1);
}

console.log("Cloud-native FS guard: OK");
