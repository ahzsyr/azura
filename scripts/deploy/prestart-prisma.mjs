#!/usr/bin/env node
/**
 * Prisma checks on npm start — skip when using standalone + node server.js (SKIP_PRESTART_PRISMA=1).
 */
import { spawnSync } from "node:child_process";

if (process.env.SKIP_PRESTART_PRISMA === "1") {
  console.log("[prestart] SKIP_PRESTART_PRISMA=1 — skipping Prisma generate/ensure");
  process.exit(0);
}

function run(script) {
  const result = spawnSync("node", [script], {
    stdio: "inherit",
    shell: false,
    env: process.env,
  });
  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}

run("scripts/prisma-generate.mjs");
run("scripts/deploy/ensure-prisma-client.mjs");
