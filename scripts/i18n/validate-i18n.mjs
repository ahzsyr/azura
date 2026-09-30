/**
 * Validate i18n completeness and guard against new legacy translation patterns.
 * Run: npm run i18n:validate
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

function flattenKeys(obj, prefix = "") {
  const keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const pathKey = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") {
      keys.push(pathKey);
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      keys.push(...flattenKeys(v, pathKey));
    }
  }
  return keys;
}

function loadJson(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

function walkFiles(dir, ext, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      walkFiles(full, ext, out);
    } else if (ext.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/** Files allowed to use locale.startsWith("ar") for RTL/Intl formatting only (not content). */
const STARTS_WITH_AR_ALLOWLIST = new Set([
  "src/features/i18n/locale.service.ts",
  "src/features/i18n/public-shell-context.ts",
  "src/features/email/templates.ts",
  "src/features/catalog/load-catalog-listing-page.ts",
  "src/features/discovery-blocks/components/discovery-product-card.tsx",
  "src/features/media-blocks/components/video-hero-view.tsx",
  "src/features/portal-blocks/components/pricing-calculator-view.tsx",
  "src/features/pricing-plans/components/pricing-table-view.tsx",
  "src/features/product-blocks/components/product-grid-block-renderer.tsx",
  "src/features/product-blocks/components/product-reviews-block-renderer.tsx",
  "src/features/product-blocks/components/related-products-block-renderer.tsx",
  "src/features/products/components/pdp/product-deferred-sections.tsx",
  "src/features/products/components/pdp/product-detail-view-body.tsx",
  "src/features/products/components/pdp/product-frequently-bought.tsx",
  "src/features/products/components/pdp/product-related-section.tsx",
  "src/features/products/components/product-listing-island.tsx",
]);

/** Legacy catalog locale symbols — must not appear in runtime src/. */
const LEGACY_CATALOG_PATTERNS = [
  /\burlPrefixToCatalogLocale\b/,
  /\bCATALOG_LOCALES\b/,
  /\bPREFIX_TO_CATALOG\b/,
];

/** Legacy En/Ar field names in Zod schemas. */
const LEGACY_SCHEMA_FIELD = /\b(titleEn|labelEn|placeholderEn|successMessageEn|titleAr|labelAr)\b/;

const messagesDir = join(process.cwd(), "messages");
const files = readdirSync(messagesDir).filter((f) => f.endsWith(".json"));

if (files.length === 0) {
  console.error("No message files found in messages/");
  process.exit(1);
}

const baseFile = files.includes("en.json") ? "en.json" : files[0];
const baseKeys = new Set(flattenKeys(loadJson(join(messagesDir, baseFile))));

let hasErrors = false;
const warnings = [];

for (const file of files) {
  if (file === baseFile) continue;
  const keys = new Set(flattenKeys(loadJson(join(messagesDir, file))));
  const missing = [...baseKeys].filter((k) => !keys.has(k));
  const extra = [...keys].filter((k) => !baseKeys.has(k));

  if (missing.length > 0) {
    hasErrors = true;
    console.error(`\n❌ ${file}: ${missing.length} missing keys (vs ${baseFile})`);
    missing.slice(0, 20).forEach((k) => console.error(`   - ${k}`));
    if (missing.length > 20) console.error(`   ... and ${missing.length - 20} more`);
  }

  if (extra.length > 0) {
    warnings.push(`${file}: ${extra.length} extra keys not in ${baseFile}`);
  }
}

for (const file of files) {
  const locale = file.replace(".json", "");
  if (!/^[a-z]{2}(-[a-z]{2})?$/i.test(locale)) {
    warnings.push(`${file}: non-standard locale code "${locale}"`);
  }
}

// Guard: locale.startsWith("ar") for content branching
const scanRoots = ["src/features", "src/components"].map((d) => join(process.cwd(), d));
const startsWithArHits = [];
for (const root of scanRoots) {
  if (!statSync(root, { throwIfNoEntry: false })) continue;
  for (const file of walkFiles(root, /\.(ts|tsx)$/)) {
    const rel = relative(process.cwd(), file).replace(/\\/g, "/");
    if (STARTS_WITH_AR_ALLOWLIST.has(rel)) continue;
    const text = readFileSync(file, "utf-8");
    if (/locale\.startsWith\s*\(\s*["']ar/.test(text)) {
      startsWithArHits.push(rel);
    }
  }
}

if (startsWithArHits.length > 0) {
  hasErrors = true;
  console.error(
    `\n❌ locale.startsWith("ar") found outside RTL allowlist (${startsWithArHits.length} files):`
  );
  startsWithArHits.slice(0, 25).forEach((f) => console.error(`   - ${f}`));
  if (startsWithArHits.length > 25) {
    console.error(`   ... and ${startsWithArHits.length - 25} more`);
  }
}

// Guard: legacy catalog locale runtime in src/
const catalogHits = [];
for (const file of walkFiles(join(process.cwd(), "src"), /\.(ts|tsx)$/)) {
  const rel = relative(process.cwd(), file).replace(/\\/g, "/");
  const text = readFileSync(file, "utf-8");
  for (const pat of LEGACY_CATALOG_PATTERNS) {
    if (pat.test(text)) {
      catalogHits.push(rel);
      break;
    }
  }
}

if (catalogHits.length > 0) {
  hasErrors = true;
  console.error(`\n❌ Legacy catalog locale symbols in src/ (${catalogHits.length} files):`);
  catalogHits.forEach((f) => console.error(`   - ${f}`));
}

// Guard: MenuItem labels map persistence
const labelsMapHits = [];
for (const file of walkFiles(join(process.cwd(), "src/features/navigation"), /\.(ts|tsx)$/)) {
  const rel = relative(process.cwd(), file).replace(/\\/g, "/");
  const text = readFileSync(file, "utf-8");
  if (/\blabels\s*:\s*\{/.test(text) || /\blabels\s*\[\s*activeLocaleCode\s*\]/.test(text)) {
    labelsMapHits.push(rel);
  }
}

if (labelsMapHits.length > 0) {
  hasErrors = true;
  console.error(`\n❌ MenuItem labels map usage (${labelsMapHits.length} files):`);
  labelsMapHits.forEach((f) => console.error(`   - ${f}`));
}

// Guard: legacy En/Ar in Zod schemas
const schemaHits = [];
for (const file of walkFiles(join(process.cwd(), "src"), /\.(ts)$/)) {
  const rel = relative(process.cwd(), file).replace(/\\/g, "/");
  if (!rel.includes("/schemas/") && !rel.endsWith(".schema.ts")) continue;
  const text = readFileSync(file, "utf-8");
  if (LEGACY_SCHEMA_FIELD.test(text)) {
    schemaHits.push(rel);
  }
}

if (schemaHits.length > 0) {
  hasErrors = true;
  console.error(`\n❌ Legacy En/Ar field names in schemas (${schemaHits.length} files):`);
  schemaHits.forEach((f) => console.error(`   - ${f}`));
}

if (warnings.length > 0) {
  console.warn("\n⚠ Warnings:");
  warnings.forEach((w) => console.warn(`   ${w}`));
}

if (hasErrors) {
  console.error("\nValidation failed.");
  process.exit(1);
}

console.log(`\n✓ i18n validation passed (${files.length} locales, ${baseKeys.size} keys in ${baseFile})`);
