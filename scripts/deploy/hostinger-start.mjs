#!/usr/bin/env node
/**
 * Hostinger recommended start for standalone (and Git) deploys.
 * Applies DB migrations/patches, then starts Next (server.js or next start).
 *
 * hPanel start command examples:
 *   node scripts/deploy/hostinger-start.mjs
 *   node scripts/deploy/hostinger-start.mjs --standalone
 *
 * Env:
 *   SKIP_DB_MIGRATE=1  — skip migrate/patches
 *   LOCAL_PUBLIC_DIR   — optional uploads persistence (symlink before start)
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const wantStandalone = args.has("--standalone") || existsSync(join(root, "server.js"));

function runNode(script, { optional = false } = {}) {
  const path = join(root, script);
  if (!existsSync(path)) {
    if (optional) return 0;
    console.error(`[hostinger-start] Missing ${script}`);
    process.exit(1);
  }
  const result = spawnSync(process.execPath, [path], {
    stdio: "inherit",
    shell: false,
    env: process.env,
    cwd: root,
  });
  return result.status ?? 1;
}

if (process.env.LOCAL_PUBLIC_DIR?.trim() || process.env.LOCAL_UPLOADS_DIR?.trim()) {
  const symlinkExit = runNode("scripts/deploy/ensure-uploads-symlink.mjs", { optional: true });
  if (symlinkExit !== 0) {
    console.warn("[hostinger-start] uploads symlink failed — continuing");
  }
}

console.log("[hostinger-start] Applying database migrations / patches…");
const migrateExit = runNode("scripts/deploy/prisma-migrate-deploy.mjs");
if (migrateExit !== 0) {
  console.error(
    "[hostinger-start] DB migrate failed. Fix DATABASE_URL or set SKIP_DB_MIGRATE=1 only if schema is already up to date.",
  );
  process.exit(migrateExit);
}

if (wantStandalone) {
  const serverJs = join(root, "server.js");
  if (!existsSync(serverJs)) {
    console.error("[hostinger-start] server.js not found in cwd");
    process.exit(1);
  }
  console.log("[hostinger-start] Starting standalone server.js…");
  const result = spawnSync(process.execPath, [serverJs], {
    stdio: "inherit",
    shell: false,
    env: { ...process.env, SKIP_PRESTART_PRISMA: "1" },
    cwd: root,
  });
  process.exit(result.status ?? 1);
}

console.log("[hostinger-start] Starting next start…");
const result = spawnSync("npx", ["next", "start"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, SKIP_PRESTART_PRISMA: "1" },
  cwd: root,
});
process.exit(result.status ?? 1);
