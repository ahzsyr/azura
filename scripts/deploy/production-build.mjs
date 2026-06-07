#!/usr/bin/env node
/**
 * Production build router: Vercel → prisma generate + next build;
 * Hostinger/other → hostinger-build.mjs (chmod, DB probe, BUILD_WITHOUT_DB).
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

function runNpx(args) {
  const result = spawnSync("npx", args, {
    stdio: "inherit",
    shell: false,
    env: process.env,
    cwd: process.cwd(),
  });
  return result.status ?? 1;
}

if (process.env.VERCEL) {
  console.log(
    "[production-build] Vercel — prisma generate + next build (BUILD_WITHOUT_DB=1)",
  );
  const genExit = runNode("../prisma-generate.mjs");
  if (genExit !== 0) process.exit(genExit);
  const buildEnv = { ...process.env, BUILD_WITHOUT_DB: "1" };
  const buildExit = spawnSync("npx", ["next", "build"], {
    stdio: "inherit",
    shell: false,
    env: buildEnv,
    cwd: process.cwd(),
  }).status ?? 1;
  process.exit(buildExit);
}

console.log("[production-build] Hostinger/local — hostinger-build.mjs");
process.exit(runNode("hostinger-build.mjs"));
