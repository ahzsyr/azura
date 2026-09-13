/**
 * Architecture guardrails for unified i18n.
 * Run: npm run i18n:verify-architecture
 */
import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import path from "path";

const ROOT = path.join(process.cwd(), "src");
const FEATURES = path.join(process.cwd(), "src", "features");
const SKIP_DIRS = new Set(["node_modules", ".next", "dist"]);
const HARDED_RUNTIME_FILES = [
  "src/features/search/components/global-search-panel.tsx",
  "src/features/discovery-blocks/lib/resolve-related-content.ts",
  "src/features/media-blocks/components/video-gallery-block-renderer.tsx",
  "src/features/commerce-showcase/components/brand-showcase-island.tsx",
  "src/features/commerce-showcase/components/category-showcase-island.tsx",
  "src/features/content-blocks/components/comparison-block-renderer.tsx",
];

let violations = 0;
let warnings = 0;

function walk(dir: string, files: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, files);
    else if (/\.(ts|tsx|js|mjs)$/.test(name)) files.push(full);
  }
  return files;
}

function isAllowedUiMessageImport(filePath: string): boolean {
  const rel = path.relative(process.cwd(), filePath).replace(/\\/g, "/");
  if (rel.startsWith("scripts/i18n/")) return true;
  return false;
}

function checkRuntimeUiMessageImports() {
  console.log("Checking runtime UiMessage imports...");
  for (const file of walk(ROOT)) {
    if (isAllowedUiMessageImport(file)) continue;
    const content = readFileSync(file, "utf8");
    if (
      /uiMessageService|from ["']@\/features\/translation\/ui-message\.service["']/.test(content)
    ) {
      console.error(`  VIOLATION: ${path.relative(process.cwd(), file)} imports uiMessageService`);
      violations++;
    }
  }
}

function checkRequestConfig() {
  console.log("Checking i18n/request.ts uses file-only messages...");
  const requestPath = path.join(process.cwd(), "src", "i18n", "request.ts");
  const content = readFileSync(requestPath, "utf8");
  if (content.includes("uiMessageService")) {
    console.error("  VIOLATION: src/i18n/request.ts still references uiMessageService");
    violations++;
  } else {
    console.log("  OK: request.ts is file-based");
  }
}

function checkWorkspaceTextKeys() {
  console.log("Checking workspace translatable keys (informational until Phase 3)...");
  const navTypes = path.join(process.cwd(), "src", "features", "navigation", "types.ts");
  if (!existsSync(navTypes)) return;
  const content = readFileSync(navTypes, "utf8");
  if (content.includes("label: string") && content.includes("MenuItem")) {
    console.log("  NOTE: MenuItem.label still in types — migrate in Phase 3 backfill");
  }
}

/** Warn when admin save actions still write titleEn/titleAr instead of EntityTranslation */
function checkTitleEnInSavePaths() {
  console.log("Checking titleEn in feature actions.ts save paths (warn only)...");
  if (!existsSync(FEATURES)) return;

  for (const file of walk(FEATURES)) {
    if (!file.endsWith(`${path.sep}actions.ts`)) continue;
    const content = readFileSync(file, "utf8");
    if (!/\btitleEn\b/.test(content)) continue;

    const rel = path.relative(process.cwd(), file).replace(/\\/g, "/");
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (!/\btitleEn\b/.test(lines[i]!)) continue;
      console.warn(`  WARN: ${rel}:${i + 1} — titleEn in save path; migrate to EntityTranslation`);
      warnings++;
    }
  }

  if (warnings === 0) {
    console.log("  OK: no titleEn in feature actions.ts");
  }
}

function checkHardeningRuntimeTargets() {
  console.log("Checking hardening runtime targets for legacy titleEn/titleAr reads...");
  const forbidden = [/\.\s*titleEn\b/, /\.\s*titleAr\b/, /\.\s*descriptionEn\b/, /\.\s*descriptionAr\b/];
  for (const relPath of HARDED_RUNTIME_FILES) {
    const full = path.join(process.cwd(), relPath);
    if (!existsSync(full)) continue;
    const content = readFileSync(full, "utf8");
    for (const pattern of forbidden) {
      if (!pattern.test(content)) continue;
      console.error(`  VIOLATION: ${relPath} still reads legacy suffixed runtime fields (${pattern})`);
      violations++;
      break;
    }
  }
}

function main() {
  checkRuntimeUiMessageImports();
  checkRequestConfig();
  checkWorkspaceTextKeys();
  checkTitleEnInSavePaths();
  checkHardeningRuntimeTargets();

  if (violations > 0) {
    console.error(`\nArchitecture check failed: ${violations} violation(s).`);
    process.exit(1);
  }
  console.log(
    `\nArchitecture checks passed${warnings > 0 ? ` (${warnings} warning(s)).` : "."}`
  );
}

main();
