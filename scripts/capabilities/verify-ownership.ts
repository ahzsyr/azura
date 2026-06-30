/**
 * Fitness guards for capability ownership (Phase 6).
 * Run: npm run capabilities:verify
 */
import { readFileSync, readdirSync, statSync } from "fs";
import path from "path";

const ROOT = path.join(process.cwd(), "src");
const GUARDED_DIRS = ["presets", "modules", "templates"].map((d) => path.join(ROOT, d));
const SKIP_DIRS = new Set(["node_modules", ".next", "dist"]);
const CAPABILITY_SEARCH = path.join(ROOT, "capabilities", "search");
const CAPABILITY_AI = path.join(ROOT, "capabilities", "ai");

let violations = 0;

function walk(dir: string, files: string[] = []): string[] {
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) return files;
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, files);
    else if (/\.(ts|tsx)$/.test(name)) files.push(full);
  }
  return files;
}

function rel(file: string) {
  return path.relative(process.cwd(), file).replace(/\\/g, "/");
}

function checkFt3AiImports() {
  console.log("FT3: AI provider imports outside capabilities/ai...");
  const patterns = [
    /from ["']@\/features\/translation\/openai/,
    /from ["']openai["']/,
    /TranslationMemory/,
    /getDefaultTranslationProvider/,
  ];
  for (const dir of GUARDED_DIRS) {
    for (const file of walk(dir)) {
      const content = readFileSync(file, "utf8");
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          console.error(`  VIOLATION: ${rel(file)} matches ${pattern}`);
          violations++;
          break;
        }
      }
    }
  }
}

function checkFt3SearchIndexerImports() {
  console.log("FT3: search indexer imports outside capabilities/search...");
  const pattern = /searchIndexer|frameworkSearchIndexer/;
  for (const dir of GUARDED_DIRS) {
    for (const file of walk(dir)) {
      const content = readFileSync(file, "utf8");
      if (!pattern.test(content)) continue;
      if (content.includes("@/capabilities/search")) continue;
      console.error(`  VIOLATION: ${rel(file)} references search indexer outside capability`);
      violations++;
    }
  }
}

function checkCapabilityRootsExist() {
  console.log("Checking capability package roots...");
  for (const dir of [CAPABILITY_SEARCH, CAPABILITY_AI]) {
    if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) {
      console.error(`  VIOLATION: missing ${rel(dir)}`);
      violations++;
    }
  }
}

function main() {
  checkCapabilityRootsExist();
  checkFt3AiImports();
  checkFt3SearchIndexerImports();

  if (violations > 0) {
    console.error(`\ncapabilities:verify failed with ${violations} violation(s).`);
    process.exit(1);
  }

  console.log("\ncapabilities:verify passed.");
}

main();
