/**
 * Merge paired *En/*Ar Zod fields into canonical base fields (title, label, …).
 * Run: node scripts/i18n/transform-zod-legacy-fields.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const TARGET_DIRS = [
  join(ROOT, "src/schemas"),
  join(ROOT, "src/features/marketing-blocks/schemas"),
  join(ROOT, "src/features/media-blocks/schemas"),
  join(ROOT, "src/features/product-blocks/schemas"),
  join(ROOT, "src/features/content-blocks/schemas"),
  join(ROOT, "src/features/conversion-blocks/schemas"),
  join(ROOT, "src/features/discovery-blocks/schemas"),
  join(ROOT, "src/features/portal-blocks/schemas"),
  join(ROOT, "src/features/commerce-showcase/schemas"),
  join(ROOT, "src/features/forms/schemas"),
  join(ROOT, "src/features/pricing-plans/schemas"),
  join(ROOT, "src/features/announcement-bar"),
  join(ROOT, "src/features/search/settings"),
  join(ROOT, "src/features/setup/demo-import"),
];

const LEGACY_SUFFIXES = ["En", "Ar"];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function transformContent(content) {
  let result = content;

  // object keys: titleEn: -> title:
  for (const suffix of LEGACY_SUFFIXES) {
    result = result.replace(new RegExp(`\\b(\\w+)${suffix}:`, "g"), (_, base) => {
      return `${base}:`;
    });
  }

  // destructuring / property access: props.titleEn -> props.title
  for (const suffix of LEGACY_SUFFIXES) {
    result = result.replace(new RegExp(`\\.([a-zA-Z][\\w]*)${suffix}\\b`, "g"), ".$1");
    result = result.replace(new RegExp(`\\['([^']+)${suffix}'\\]`, "g"), "['$1']");
    result = result.replace(new RegExp(`\\["([^"]+)${suffix}"\\]`, "g"), '["$1"]');
  }

  // template literals and identifiers: ${field}En, titleEn variable
  for (const suffix of LEGACY_SUFFIXES) {
    result = result.replace(new RegExp(`\\$\\{([^}]+)\\}${suffix}`, "g"), "${$1}");
    result = result.replace(new RegExp(`\\b([a-z][a-zA-Z0-9]*)${suffix}\\b`, "g"), "$1");
  }

  // TypeScript types: titleEn?: string -> title?: string
  for (const suffix of LEGACY_SUFFIXES) {
    result = result.replace(new RegExp(`\\b(\\w+)${suffix}\\?\\s*:`, "g"), "$1?:");
    result = result.replace(new RegExp(`\\b(\\w+)${suffix}\\s*:`, "g"), "$1:");
  }

  // Record types: `${F}En` | `${F}Ar` -> F
  result = result.replace(/`\$\{([^}]+)\}En`\s*\|\s*`\$\{([^}]+)\}Ar`/g, "$1");
  result = result.replace(/`\$\{typeof field\}En`\s*\|\s*`\$\{typeof field\}Ar`/g, "typeof field");

  return result;
}

let changed = 0;
for (const dir of TARGET_DIRS) {
  try {
    statSync(dir);
  } catch {
    continue;
  }
  for (const file of walk(dir)) {
    const original = readFileSync(file, "utf8");
    const next = transformContent(original);
    if (next !== original) {
      writeFileSync(file, next, "utf8");
      changed++;
      console.log("Updated", relative(ROOT, file));
    }
  }
}

console.log(`Done. ${changed} files updated.`);
