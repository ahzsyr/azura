#!/usr/bin/env node
/**
 * Production build: Prisma engines + next build --webpack (Hostinger 15m cap).
 * Probes DATABASE_URL; BUILD_WITHOUT_DB=1 during compile.
 */
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { platform } from "node:os";
import { ensurePrismaEnginesExecutable } from "./ensure-prisma-engines-executable.mjs";
import { buildPrismaEnv } from "./load-database-url.mjs";
import { resolvePrismaSchemaPath } from "./resolve-prisma-schema.mjs";
import { runPrismaOrExit } from "./run-prisma.mjs";

function generatePrismaClient(env = buildPrismaEnv()) {
  const schema = resolvePrismaSchemaPath(env);
  console.log(`[hostinger-build] prisma generate --schema ${schema}`);
  runPrismaOrExit(["generate", "--schema", schema], { env });
}

async function probeDatabase(env = buildPrismaEnv()) {
  const url = env.DATABASE_URL?.trim();
  if (!url) {
    return { ok: false, reason: "DATABASE_URL unset" };
  }
  try {
    const { PrismaClient } = await import("@prisma/client");
    const client = new PrismaClient({
      datasources: { db: { url } },
    });
    await client.$queryRaw`SELECT 1`;
    await client.$disconnect();
    return { ok: true, reason: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: message.slice(0, 200) };
  }
}

function withBuildNodeOptions(env) {
  const extra = "--max-old-space-size=4096";
  const existing = env.NODE_OPTIONS?.trim() ?? "";
  if (existing.includes("max-old-space-size")) return env;
  return { ...env, NODE_OPTIONS: existing ? `${existing} ${extra}` : extra };
}

function run(command, args, env) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: withBuildNodeOptions(env),
  });
  return result.status ?? 1;
}

const missingMessages = ["messages/en.json"].filter(
  (p) => !existsSync(join(process.cwd(), p)),
);

if (missingMessages.length > 0) {
  console.error(
    "[hostinger-build] Missing i18n files:",
    missingMessages.join(", "),
    "— add the `messages/` folder to your deployment.",
  );
  process.exit(1);
}

if (process.env.OUTPUT_STANDALONE === "1") {
  const standaloneDir = join(process.cwd(), ".next", "standalone");
  rmSync(standaloneDir, { recursive: true, force: true });
  mkdirSync(standaloneDir, { recursive: true });
  console.log("[hostinger-build] Ensured standalone output directory exists before Next build");
}

if (platform() === "linux") {
  ensurePrismaEnginesExecutable();
}

const prismaEnv = buildPrismaEnv();
const dbProbe = await probeDatabase(prismaEnv);
const buildEnv = { ...prismaEnv };

// Next.js page-data collection spawns 60+ workers; Supabase session pooler caps at ~15
// connections (EMAXCONNSESSION). Stub Prisma during compile; CMS paths render at runtime (ISR).
buildEnv.BUILD_WITHOUT_DB = "1";

if (dbProbe.ok) {
  console.log("[hostinger-build] Database credentials verified.");
} else {
  console.warn(
    "[hostinger-build] Database not available at build time:",
    dbProbe.reason ?? "unknown",
  );
  console.warn(
    "[hostinger-build] Fix DATABASE_URL in hPanel — required for the live site after deploy.",
  );
}
console.warn(
  "[hostinger-build] BUILD_WITHOUT_DB=1 during compile — avoids Supabase pool limit; static CMS paths generated at runtime.",
);

generatePrismaClient(prismaEnv);
// generate may unpack engines without +x on Hostinger extracts
ensurePrismaEnginesExecutable();

if (dbProbe.ok) {
  console.log("[hostinger-build] Applying database migrations / patches…");
  const migrateExit = spawnSync(process.execPath, ["scripts/deploy/prisma-migrate-deploy.mjs"], {
    stdio: "inherit",
    shell: false,
    env: prismaEnv,
    cwd: process.cwd(),
  }).status ?? 1;
  if (migrateExit !== 0) process.exit(migrateExit);
}

const nextBin = join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
console.log("[hostinger-build] Running next build --webpack…");
const webpackEnv = withBuildNodeOptions({
  ...buildEnv,
  AZURA_WEBPACK_BUILD: "1",
});
const buildExit = existsSync(nextBin)
  ? spawnSync(process.execPath, [nextBin, "build", "--webpack"], {
      stdio: "inherit",
      shell: false,
      env: webpackEnv,
      cwd: process.cwd(),
    }).status ?? 1
  : run("npx", ["next", "build", "--webpack"], webpackEnv);
if (buildExit !== 0) process.exit(buildExit);

const symlinkExit =
  spawnSync(process.execPath, ["scripts/deploy/ensure-uploads-symlink.mjs"], {
    stdio: "inherit",
    shell: false,
    env: buildEnv,
    cwd: process.cwd(),
  }).status ?? 1;
if (symlinkExit !== 0) process.exit(symlinkExit);

console.log("[hostinger-build] Build completed successfully");
process.exit(0);
