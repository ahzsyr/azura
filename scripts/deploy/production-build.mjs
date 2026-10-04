#!/usr/bin/env node
/**
 * Production build router — Hostinger is the sole production target.
 * Delegates to hostinger-build.mjs (chmod, DB probe, BUILD_WITHOUT_DB).
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));

function runNode(script, extraArgs = []) {
  const result = spawnSync(process.execPath, [join(root, script), ...extraArgs], {
    stdio: "inherit",
    env: process.env,
    cwd: process.cwd(),
  });
  return result.status ?? 1;
}

console.log("[production-build] Hostinger — hostinger-build.mjs");
process.exit(runNode("hostinger-build.mjs"));
