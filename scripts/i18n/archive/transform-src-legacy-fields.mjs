/**
 * Bulk transform legacy *En/*Ar field references in src/ to canonical base fields.
 * Run: node scripts/i18n/transform-src-legacy-fields.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const SKIP = new Set([
  "src/features/translation/legacy-adapter.ts",
  "src/features/i18n/locale.service.ts",
  "src/features/i18n/public-shell-context.ts",
  "src/features/email/templates.ts",
  "src/i18n/locale-config.ts",
  "src/features/translation/block-translation.ts",
  "src/features/portal/lib/portal-translation.ts",
  "src/features/portal/lib/portal-translation-shape.ts",
  "src/features/translation/components/localized-fields.tsx",
]);

const LEGACY_SUFFIXES = ["En", "Ar"];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function transformContent(content) {
  let result = content;

  for (const suffix of LEGACY_SUFFIXES) {
    // object keys
    result = result.replace(new RegExp(`\\b(\\w+)${suffix}:`, "g"), (_, base) => `${base}:`);
    // property access
    result = result.replace(new RegExp(`\\.([a-zA-Z][\\w]*)${suffix}\\b`, "g"), ".$1");
    result = result.replace(new RegExp(`\\['([^']+)${suffix}'\\]`, "g"), "['$1']");
    result = result.replace(new RegExp(`\\["([^"]+)${suffix}"\\]`, "g"), '["$1"]');
    // template in backticks for field keys
    result = result.replace(new RegExp(`\`${suffix}\``, "g"), "``");
    result = result.replace(new RegExp(`\\$\\{([^}]+)\\}${suffix}`, "g"), "${$1}");
  }

  // resolveBilingualFields -> resolveCanonicalFields
  result = result.replace(/\bresolveBilingualFields\b/g, "resolveCanonicalFields");
  result = result.replace(/\blocalizedPair\b/g, "localizedFieldValue");
  result = result.replace(/\bmergeLocalizedPairs\b/g, "mergeCanonicalFields");
  result = result.replace(/\bnullableExcerptPair\b/g, "nullableExcerptField");

  return result;
}

let changed = 0;
for (const file of walk(SRC)) {
  const rel = relative(ROOT, file).replace(/\\/g, "/");
  if (SKIP.has(rel)) continue;
  const original = readFileSync(file, "utf8");
  const next = transformContent(original);
  if (next !== original) {
    writeFileSync(file, next, "utf8");
    changed++;
  }
}

console.log(`Done. ${changed} src files updated.`);
