#!/usr/bin/env node
/** `next build` with BUILD_WITHOUT_DB=1 (avoids Supabase pool exhaustion in compile workers). */
import { spawnSync } from "node:child_process";

const genExit =
  spawnSync(process.execPath, ["scripts/prisma-generate.mjs"], {
    stdio: "inherit",
    env: process.env,
    cwd: process.cwd(),
  }).status ?? 1;
if (genExit !== 0) process.exit(genExit);

const buildExit =
  spawnSync("npx", ["next", "build"], {
    stdio: "inherit",
    shell: false,
    env: { ...process.env, BUILD_WITHOUT_DB: "1" },
    cwd: process.cwd(),
  }).status ?? 1;
process.exit(buildExit);
