#!/usr/bin/env node
/**
 * CI guard: forbid accidental public English URL generation with /en prefix.
 * Allowed paths: redirect config, normalizer, tests, middleware legacy redirect.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");

const ALLOWLIST = new Set([
  "next.config.ts",
  "src/middleware/pipeline.ts",
  "src/i18n/url-helpers.ts",
  "src/i18n/seo-helpers.ts",
  "src/features/seo/resolve-indexable-url.ts",
  "src/features/cms/cms-page-path.ts",
  "src/features/i18n/locale-middleware.ts",
  "src/capabilities/search/lib/search-public-path.ts",
  "src/features/account/account-public-path.ts",
  "src/features/products/index/product-index-builder.ts",
  "src/features/products/index/product-index-loader.ts",
]);

const FORBIDDEN_PATTERNS = [
  { name: "template /${locale}/ public href", re: /`\$\{locale\}\/[^`]+`/ },
  { name: "template /${localePrefix}/ public href", re: /`\$\{localePrefix\}\/[^`]+`/ },
  { name: 'href="/en', re: /href=\{?"\/en[^"']*/ },
  { name: "siteUrl}/en", re: /siteUrl\}\/en/ },
  { name: "origin}/en", re: /origin\}\/en/ },
  { name: "brt-me.com/en", re: /brt-me\.com\/en/ },
  { name: "sitemap loc with /en", re: /url:\s*`\$\{siteUrl\}\/en/ },
];

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === ".next") continue;
      walk(full, files);
    } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

function isTestFile(rel) {
  return (
    rel.includes("__tests__") ||
    rel.includes(".test.") ||
    rel.includes(".spec.") ||
    rel.endsWith(".test.ts") ||
    rel.endsWith(".test.tsx")
  );
}

const violations = [];

for (const file of walk(SRC)) {
  const rel = relative(ROOT, file).replace(/\\/g, "/");
  if (ALLOWLIST.has(rel) || isTestFile(rel)) continue;

  const content = readFileSync(file, "utf8");
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes("revalidatePath")) continue;
    if (line.includes("stripAnyLocalePrefix")) continue;
    if (line.includes("normalizeSearchPublicPath")) continue;
    if (line.includes("stripDefaultLocalePublicPrefix")) continue;
    if (line.includes("normalizeStoredCanonicalUrl")) continue;
    if (line.includes("publicLocalePath")) continue;
    if (line.includes("publicLocaleAbsoluteUrl")) continue;
    if (line.includes("accountPublicPath")) continue;
    if (line.includes("localePathFromPrefix")) continue;
    if (line.includes("/en/pages/")) continue;

    for (const { name, re } of FORBIDDEN_PATTERNS) {
      if (re.test(line)) {
        violations.push({
          file: rel,
          pattern: name,
          line: i + 1,
          snippet: line.trim().slice(0, 120),
        });
      }
    }
  }
}

if (violations.length > 0) {
  console.error("Public /en URL guard failed:\n");
  for (const v of violations.slice(0, 50)) {
    console.error(`  ${v.file}:${v.line} [${v.pattern}]`);
    console.error(`    ${v.snippet}\n`);
  }
  if (violations.length > 50) {
    console.error(`  ... and ${violations.length - 50} more`);
  }
  process.exit(1);
}

console.log("Public /en URL guard passed.");
