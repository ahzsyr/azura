#!/usr/bin/env node
/** Shared Prisma CLI runner for deploy scripts. */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

/** Use the project's prisma@6 CLI — bare `npx prisma` can resolve to Prisma 7. */
function resolvePrismaCli(cwd = process.cwd()) {
  const entry = join(cwd, "node_modules", "prisma", "build", "index.js");
  return existsSync(entry) ? entry : null;
}

export function runPrismaOrExit(args, { env = process.env, cwd = process.cwd() } = {}) {
  const cli = resolvePrismaCli(cwd);
  if (!cli) {
    console.error(
      "[run-prisma] Local prisma package missing — run npm install (project expects prisma@6).",
    );
    process.exit(1);
  }
  const result = spawnSync(process.execPath, [cli, ...args], {
    stdio: "inherit",
    shell: false,
    env,
    cwd,
  });
  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}
