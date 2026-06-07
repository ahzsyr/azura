#!/usr/bin/env node
/** Shared Prisma CLI runner for deploy scripts. */
import { spawnSync } from "node:child_process";

export function runPrismaOrExit(args, { env = process.env, cwd = process.cwd() } = {}) {
  const result = spawnSync("npx", ["prisma", ...args], {
    stdio: "inherit",
    shell: false,
    env,
    cwd,
  });
  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}
