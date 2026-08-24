/**
 * Phase 9 custom entity type verification.
 * Run: npm run custom-entity-types:verify
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
let failures = 0;

function fail(message) {
  console.error(`  FAIL: ${message}`);
  failures += 1;
}

function pass(message) {
  console.log(`  ok: ${message}`);
}

console.log("custom-entity-types:verify — Phase 9 guards\n");

const registry = readFileSync(path.join(ROOT, "src", "templates", "registry.ts"), "utf8");
for (const id of ["entity-card", "entity-detail", "entity-list"]) {
  if (!registry.includes(`id: "${id}"`)) {
    fail(`missing template definition ${id}`);
  } else {
    pass(`template ${id} registered`);
  }
}

const detailPage = readFileSync(
  path.join(ROOT, "src", "features", "content", "components", "content-detail-page.tsx"),
  "utf8",
);
if (detailPage.includes("is not a content preset")) {
  fail("content-detail-page still throws for custom types");
} else {
  pass("content-detail-page supports custom types");
}

const translationRegistry = readFileSync(
  path.join(ROOT, "src", "features", "translation", "content-type-translation-registry.ts"),
  "utf8",
);
if (!translationRegistry.includes("getContentItemTranslatableFields")) {
  fail("missing getContentItemTranslatableFields helper");
} else {
  pass("dynamic ContentItem translation registry present");
}

const exportRoute = path.join(ROOT, "src", "app", "api", "content", "types", "[id]", "export", "route.ts");
const importRoute = path.join(ROOT, "src", "app", "api", "content", "types", "import", "route.ts");
if (!readFileSync(exportRoute, "utf8").includes("exportContentType")) {
  fail("export API missing");
} else {
  pass("export API present");
}
if (!readFileSync(importRoute, "utf8").includes("importContentTypeDocument")) {
  fail("import API missing");
} else {
  pass("import API present");
}

const tests = spawnSync(
  "npm",
  [
    "exec",
    "--",
    "tsx",
    "--test",
    "src/schemas/__tests__/content-type-schema.test.ts",
    "src/features/translation/__tests__/content-type-translation-registry.test.ts",
    "src/features/content/__tests__/generate-search-profile-defaults.test.ts",
  ],
  { stdio: "inherit", shell: process.platform === "win32", cwd: ROOT },
);
if ((tests.status ?? 1) !== 0) {
  fail("phase 9 unit tests failed");
} else {
  pass("phase 9 unit tests passed");
}

console.log("");
if (failures > 0) {
  console.error(`custom-entity-types:verify failed (${failures} issue(s))`);
  process.exit(1);
}
console.log("custom-entity-types:verify passed");
