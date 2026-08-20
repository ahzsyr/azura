#!/usr/bin/env tsx
/**
 * Orchestrator: seed all catalog data into PostgreSQL (Supabase).
 *
 * Usage:
 *   npm run catalog:seed-all
 *   npm run catalog:seed-all -- --dry-run
 */
import { spawnSync } from "node:child_process";

const dryRun = process.argv.includes("--dry-run");
const extra = dryRun ? ["--dry-run"] : [];

const steps = [
  ["catalog:seed-collections", "CatalogCollection"],
  ["catalog:seed-db", "Product"],
  ["catalog:seed-site-settings", "SiteSettings"],
  ["catalog:seed-theme-presets", "ThemePresets (JsonStore)"],
];

for (const [script, label] of steps) {
  console.log(`\n==> Seeding ${label} (npm run ${script})`);
  const result = spawnSync("npm", ["run", script, "--", ...extra], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    console.error(`Seed step failed: ${script}`);
    process.exit(result.status ?? 1);
  }
}

console.log("\nAll catalog seeds completed.");
