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
import { ensureSelectedDeploymentProfile } from "./ensure-selected-deployment-profile.mjs";
import { buildPrismaEnv } from "./load-database-url.mjs";
import { resolvePrismaSchemaPath } from "./resolve-prisma-schema.mjs";
import { runBuildGenerators } from "./run-build-generators.mjs";
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
    const { createPrismaClient } = await import("../lib/create-prisma-client.mjs");
    const client = createPrismaClient(url);
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

// M2.1: fail-closed selected profile before engines / DB / Prisma / Next.
// Intentional deploy-policy change — typo'd AZURA_PROFILE now blocks the ship path.
// M8 measure twin may set AZURA_MEASURE_SKIP_PROFILE_ENSURE=1 after compiling an
// ephemeral artifact (production never sets this; twin assert already ran).
if (process.env.AZURA_MEASURE_SKIP_PROFILE_ENSURE === "1") {
  console.warn(
    "[hostinger-build] AZURA_MEASURE_SKIP_PROFILE_ENSURE=1 — skipping ensure (measure twin only).",
  );
} else {
  const profileEnsure = ensureSelectedDeploymentProfile({ env: process.env });
  if (!profileEnsure.ok) {
    console.error(`[hostinger-build] ${profileEnsure.reason}`);
    console.error(
      "[hostinger-build] Rollback: fix AZURA_PROFILE in the environment (or unset for default enterprise). Do not bypass this gate.",
    );
    process.exit(profileEnsure.code);
  }
}

// M2.3: hard-run prisma-metadata then middleware before standalone / engines / DB / Next.
// Hard-fail = generator exit nonzero. Middleware may write fallback without DB (exit 0 = OK).
const generators = runBuildGenerators({ env: process.env });
if (!generators.ok) {
  console.error(
    `[hostinger-build] ${generators.failedStep} failed — aborting (exit ${generators.code}).`,
  );
  process.exit(generators.code);
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

const measureNoDb = process.env.AZURA_MEASURE_NO_DB === "1";
const prismaEnv = measureNoDb
  ? (() => {
      const env = { ...process.env };
      delete env.DATABASE_URL;
      delete env.DIRECT_URL;
      delete env.POSTGRES_PRISMA_URL;
      delete env.POSTGRES_URL;
      delete env.POSTGRES_URL_NON_POOLING;
      console.warn(
        "[hostinger-build] AZURA_MEASURE_NO_DB=1 — skipping env-file DATABASE_URL and migrate probe.",
      );
      return env;
    })()
  : buildPrismaEnv();
const dbProbe = measureNoDb
  ? { ok: false, reason: "AZURA_MEASURE_NO_DB=1" }
  : await probeDatabase(prismaEnv);
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
console.log(
  "[hostinger-build] Running next build --webpack (1 page-data worker — Hostinger thread limit)…",
);
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

const assetGateExit =
  spawnSync(process.execPath, ["scripts/ci/verify-next-static-assets.mjs"], {
    stdio: "inherit",
    shell: false,
    env: buildEnv,
    cwd: process.cwd(),
  }).status ?? 1;
if (assetGateExit !== 0) {
  console.error(
    "[hostinger-build] Static asset integrity gate failed — refusing to treat this build as deployable.",
  );
  process.exit(assetGateExit);
}

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
