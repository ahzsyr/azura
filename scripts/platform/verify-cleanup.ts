/**
 * Phase 8 platform cleanup verification.
 * Run: npm run platform:verify
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
let failures = 0;

function fail(message: string) {
  console.error(`  FAIL: ${message}`);
  failures++;
}

function pass(message: string) {
  console.log(`  ok: ${message}`);
}

function runNpmScript(script: string) {
  const result = spawnSync("npm", ["run", script], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });
  if ((result.status ?? 1) !== 0) {
    fail(`${script} failed`);
  } else {
    pass(`${script} passed`);
  }
}

console.log("platform:verify — Phase 8 cleanup guards\n");

const middlewarePath = path.join(ROOT, "src", "middleware.ts");
const middlewareLines = readFileSync(middlewarePath, "utf8").split(/\r?\n/).length;
if (middlewareLines > 80) {
  fail(`src/middleware.ts has ${middlewareLines} lines (budget: 80)`);
} else {
  pass(`middleware entry ${middlewareLines} lines (<= 80)`);
}

const navCheck = spawnSync("node", ["scripts/ci/check-admin-nav-labels.mjs"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
if ((navCheck.status ?? 1) !== 0) {
  fail("banned admin nav labels check");
} else {
  pass("no banned admin nav labels");
}

const mediaCatalogDir = path.join(ROOT, "src", "app", "api", "media", "catalog");
if (existsSync(mediaCatalogDir)) {
  fail("dead media/catalog API routes still exist");
} else {
  pass("no media/catalog alias routes");
}

const adapterDir = path.join(ROOT, "src", "features", "entities", "adapters");
const portalAdapters = ["knowledge.adapter.ts", "team-member.adapter.ts", "partner.adapter.ts", "pricing.adapter.ts"];
for (const file of portalAdapters) {
  const content = readFileSync(path.join(adapterDir, file), "utf8");
  if (/from ["']@\/lib\/prisma["']/.test(content)) {
    fail(`${file} still imports @/lib/prisma`);
  } else if (/from ["']@\/repositories\//.test(content)) {
    pass(`${file} uses repository layer`);
  } else {
    fail(`${file} missing repository import`);
  }
}

const schemaMysql = path.join(ROOT, "prisma", "schema", "mysql");
if (!existsSync(schemaMysql) || readdirSync(schemaMysql).filter((f) => f.endsWith(".prisma")).length < 3) {
  fail("prisma/schema/mysql multi-file schema missing");
} else {
  pass("multi-file Prisma schema present");
}

console.log("\nDependency gates:");
runNpmScript("capabilities:verify");
runNpmScript("profiles:verify");
runNpmScript("custom-entity-types:verify");

console.log(`\nplatform:verify complete — ${failures} failure(s)`);
process.exit(failures > 0 ? 1 : 0);
