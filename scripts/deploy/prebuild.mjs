#!/usr/bin/env node
/**
 * Prebuild hook: rebuild product indexes when catalog source is present.
 * Skips when committed products-index manifest already has products.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

if (process.env.SKIP_CATALOG_PREBUILD === "1") {
  console.log("[prebuild] SKIP_CATALOG_PREBUILD=1 — using committed src/data/products-index");
  process.exit(0);
}

if (process.env.VERCEL) {
  console.log("[prebuild] Vercel — using committed src/data/products-index (skip catalog:index)");
  process.exit(0);
}

const catalogDirs = ["src/data/en-us/products", "src/data/ar-ae/products"];
const hasCatalogSource = catalogDirs.some((dir) => existsSync(join(process.cwd(), dir)));

const manifestPath = join(process.cwd(), "src/data/products-index/manifest.json");
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

if (hasCatalogSource && manifestCounts > 0) {
  console.log(
    "[prebuild] Committed products-index manifest has " +
      `${manifestCounts} products — skipping catalog:index (use catalog:index:force to rebuild).`,
  );
  process.exit(0);
}

const requiredMessages = ["messages/en.json", "messages/ar.json"];
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
