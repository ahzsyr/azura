#!/usr/bin/env node
/**
 * Prebuild hook: rebuild product indexes when catalog source is present.
 * Skips when committed products-index manifest already has products.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

function refreshBuildManifests() {
  for (const script of ["middleware:manifest", "profile:generate", "prisma-metadata:generate"]) {
    const result = spawnSync("npm", ["run", script], {
      stdio: "inherit",
      shell: process.platform === "win32",
      env: process.env,
    });
    if ((result.status ?? 1) !== 0) {
      console.warn(`[prebuild] ${script} failed; continuing with bundled fallback.`);
    }
  }
}

refreshBuildManifests();

if (process.env.SKIP_CATALOG_PREBUILD === "1") {
  console.log("[prebuild] SKIP_CATALOG_PREBUILD=1 — using committed seeds/catalog/products-index");
  process.exit(0);
}

if (process.env.VERCEL) {
  console.log("[prebuild] Vercel — skip catalog:index (DB-only indexes at runtime)");
  process.exit(0);
}

if (
  process.env.CATALOG_PRODUCTS_SOURCE === "db" ||
  process.env.PRISMA_SCHEMA === "postgresql" ||
  /^postgres(ql)?:\/\//i.test(process.env.DATABASE_URL ?? "")
) {
  console.log("[prebuild] Database catalog mode — skip filesystem product index build");
  process.exit(0);
}

const catalogDirs = ["seeds/catalog/en-us/products"];

function countProductJsonFiles(dir) {
  let count = 0;
  if (!existsSync(dir)) return 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      count += countProductJsonFiles(full);
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      count += 1;
    }
  }
  return count;
}

const catalogDirPaths = catalogDirs.map((dir) => join(process.cwd(), dir));
const hasCatalogSource = catalogDirPaths.some((dir) => existsSync(dir));
const catalogDirsExist = catalogDirPaths.every((dir) => existsSync(dir));
const totalProductJsonFiles = catalogDirPaths.reduce(
  (sum, dir) => sum + countProductJsonFiles(dir),
  0,
);

const manifestPath = join(process.cwd(), "seeds/catalog/products-index/manifest.json");
let manifestCounts = 0;
if (existsSync(manifestPath)) {
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    manifestCounts = Object.values(manifest.counts ?? {}).reduce(
      (sum, n) => sum + (typeof n === "number" ? n : 0),
      0,
    );
  } catch {
    /* run catalog:index */
  }
}

if (!hasCatalogSource && manifestCounts > 0) {
  console.warn(
    "[prebuild] Catalog source folders missing; keeping committed products-index (" +
      `${manifestCounts} products in manifest).`,
  );
  process.exit(0);
}

if (catalogDirsExist && totalProductJsonFiles === 0 && manifestCounts > 0) {
  console.log(
    "[prebuild] Catalog dirs exist but contain 0 product JSON files — forcing catalog:index to clear stale index (" +
      `${manifestCounts} products in manifest).`,
  );
  const result = spawnSync("npm", ["run", "catalog:index:force"], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, SKIP_SEARCH_INDEX_SYNC: "1" },
  });
  process.exit(result.status ?? 1);
}

if (catalogDirsExist && totalProductJsonFiles > 0 && manifestCounts === 0) {
  console.log(
    "[prebuild] Product JSON files exist (" +
      `${totalProductJsonFiles}) but products-index manifest is empty — forcing catalog:index:force.`,
  );
  const result = spawnSync("npm", ["run", "catalog:index:force"], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, SKIP_SEARCH_INDEX_SYNC: "1" },
  });
  process.exit(result.status ?? 1);
}

if (hasCatalogSource && manifestCounts > 0) {
  console.log(
    "[prebuild] Committed products-index manifest has " +
      `${manifestCounts} products — skipping catalog:index (use catalog:index:force to rebuild).`,
  );
  process.exit(0);
}

const requiredMessages = ["messages/en.json"];
const missingMessages = requiredMessages.filter((p) => !existsSync(join(process.cwd(), p)));

if (missingMessages.length > 0) {
  console.error(
    "[prebuild] Missing required i18n files: " +
      missingMessages.join(", ") +
      ". Include the project `messages/` folder in your Hostinger deploy zip.",
  );
  process.exit(1);
}

const result = spawnSync("npm", ["run", "catalog:index"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, SKIP_SEARCH_INDEX_SYNC: "1" },
});

process.exit(result.status ?? 1);
