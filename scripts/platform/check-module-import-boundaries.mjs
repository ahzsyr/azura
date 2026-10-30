#!/usr/bin/env node
/**
 * Phase 4 — Module import boundary check.
 *
 * - Modules may import Core allowlisted prefixes.
 * - Modules must not import sibling Module trees (except documented exceptions).
 * - Core features/seo may import Module trees only via documented bridge exceptions.
 *
 * Exit 0 when all edges are allowlisted or excepted; exit 1 on unexpected edges.
 *
 * Usage:
 *   node scripts/platform/check-module-import-boundaries.mjs
 *   node scripts/platform/check-module-import-boundaries.mjs --json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SRC = path.join(root, "src");
const JSON_FLAG = process.argv.includes("--json");

/** Module id → path under src/modules */
const MODULE_DIRS = ["documentation", "status-page", "marketing", "advanced-seo"];

/**
 * Allowed Module → Core import prefixes (specifier after @/).
 * Anything else from a Module into @/ that is not another Module exception fails.
 */
const MODULE_CORE_ALLOW_PREFIXES = [
  "config/",
  "features/auth/",
  "features/i18n/",
  "features/translation/",
  "features/portal/",
  "features/account/",
  "features/builder/",
  "features/email/",
  "features/seo/integrations/", // Core-owned secret seal etc.
  "hooks/",
  "i18n/",
  "lib/",
  "platform/packages/",
  "services/",
  "components/",
  "types/",
  "generated/",
  "modules/module-manifest", // shared ModuleManifest type (not a product Module)
];

/**
 * Documented exceptions (Phase 4 bridge; Phase 7 RFC owns Advanced SEO relocate timeline).
 * See docs/modules-v2/plans/phase-7-extraction-advanced-seo.md — physical relocate deferred.
 */
const DOCUMENTED_EXCEPTIONS = [
  { fromIncludes: "src/features/seo/", toIncludes: "modules/advanced-seo/", reason: "advanced-seo-bridge" },
  {
    fromIncludes: "src/features/search-intelligence/",
    toIncludes: "modules/advanced-seo/",
    reason: "search-intelligence-as-advanced-bridge",
  },
  {
    fromIncludes: "src/features/seo/google-platform/",
    toIncludes: "modules/marketing/providers/google-ads/",
    reason: "google-ads-credential-bridge",
  },
  {
    fromIncludes: "src/modules/marketing/",
    toIncludes: "features/seo/integrations/secret-seal",
    reason: "secret-seal-core-helper",
  },
  {
    fromIncludes: "src/modules/marketing/",
    toIncludes: "features/seo/google-platform/",
    reason: "google-ads-dual-store-bridge",
  },
];
const IMPORT_RE =
  /(?:^|[^\w$])(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/gm;

function walkTsFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkTsFiles(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) out.push(full);
  }
  return out;
}

function toPosix(p) {
  return p.split(path.sep).join("/");
}

function relFromRoot(abs) {
  return toPosix(path.relative(root, abs));
}

function isTestPath(rel) {
  return rel.includes("/__tests__/") || /\.(test|spec)\.(ts|tsx)$/.test(rel);
}

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function resolveAlias(specifier) {
  if (specifier.startsWith("@/")) return specifier.slice(2);
  return null;
}

function moduleIdFromRel(rel) {
  const m = rel.match(/^src\/modules\/([^/]+)\//);
  if (!m) return null;
  const id = m[1];
  // Shared contracts under src/modules/*.ts (not a product Module package).
  if (!MODULE_DIRS.includes(id)) return null;
  return id;
}

function targetModuleId(aliasedPath) {
  if (!aliasedPath.startsWith("modules/")) return null;
  const id = aliasedPath.split("/")[1];
  if (!MODULE_DIRS.includes(id)) return null;
  return id;
}

function isExcepted(fromRel, toPath) {
  return DOCUMENTED_EXCEPTIONS.some(
    (ex) => fromRel.includes(ex.fromIncludes) && toPath.includes(ex.toIncludes),
  );
}

function coreAllowlisted(toPath) {
  return MODULE_CORE_ALLOW_PREFIXES.some((prefix) => toPath.startsWith(prefix));
}

const violations = [];
const excepted = [];

for (const file of walkTsFiles(SRC)) {
  const fromRel = relFromRoot(file);
  if (isTestPath(fromRel)) continue;
  const source = stripComments(fs.readFileSync(file, "utf8"));
  IMPORT_RE.lastIndex = 0;
  let match;
  while ((match = IMPORT_RE.exec(source))) {
    const specifier = match[1];
    const aliased = resolveAlias(specifier);
    if (!aliased) continue;

    const fromModule = moduleIdFromRel(fromRel);
    const toModule = targetModuleId(aliased);

    // Sibling Module imports
    if (fromModule && toModule && fromModule !== toModule) {
      if (isExcepted(fromRel, aliased)) {
        excepted.push({ from: fromRel, to: aliased, kind: "sibling-module" });
      } else {
        violations.push({
          from: fromRel,
          to: aliased,
          kind: "sibling-module",
          message: `Module “${fromModule}” must not import sibling Module “${toModule}”`,
        });
      }
      continue;
    }

    // Core → Module (especially features/seo)
    if (!fromModule && toModule && fromRel.startsWith("src/features/")) {
      if (isExcepted(fromRel, aliased)) {
        excepted.push({ from: fromRel, to: aliased, kind: "core-to-module" });
      } else if (fromRel.startsWith("src/features/seo/")) {
        violations.push({
          from: fromRel,
          to: aliased,
          kind: "core-to-module",
          message: `features/seo must not import modules/${toModule} without a documented bridge exception`,
        });
      }
      continue;
    }

    // Module → Core allowlist
    if (fromModule && !aliased.startsWith("modules/")) {
      if (isExcepted(fromRel, aliased)) {
        excepted.push({ from: fromRel, to: aliased, kind: "module-to-core-exception" });
      } else if (!coreAllowlisted(aliased)) {
        violations.push({
          from: fromRel,
          to: aliased,
          kind: "module-to-core",
          message: `Module “${fromModule}” import “${aliased}” is outside the Phase 4 Core allowlist`,
        });
      }
    }
  }
}

const report = {
  moduleDirs: MODULE_DIRS,
  allowPrefixes: MODULE_CORE_ALLOW_PREFIXES,
  exceptions: DOCUMENTED_EXCEPTIONS,
  exceptedCount: excepted.length,
  violationCount: violations.length,
  violations,
  exceptedSample: excepted.slice(0, 20),
};

if (JSON_FLAG) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(
    `module-import-boundaries: ${violations.length} violation(s), ${excepted.length} documented exception hit(s)`,
  );
  for (const v of violations.slice(0, 40)) {
    console.log(`  FAIL ${v.from} → ${v.to}: ${v.message}`);
  }
  if (violations.length > 40) console.log(`  … ${violations.length - 40} more`);
}

process.exit(violations.length > 0 ? 1 : 0);
