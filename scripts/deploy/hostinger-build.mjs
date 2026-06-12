#!/usr/bin/env node
/**
 * Production build: fix Linux permissions after zip extract, then next build.
 * Probes DATABASE_URL; sets BUILD_WITHOUT_DB=1 when MySQL auth fails at build time.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { platform } from "node:os";
import { buildPrismaEnv, sanitizeDatabaseUrl } from "./load-database-url.mjs";
import { runPrismaOrExit } from "./run-prisma.mjs";

function resolvePrismaSchemaFromEnv(env) {
  if (env.PRISMA_SCHEMA === "postgresql") {
    return "prisma/schema.postgresql.prisma";
  }
  const url = sanitizeDatabaseUrl(env.DATABASE_URL ?? "");
  if (/^postgres(ql)?:\/\//i.test(url)) {
    return "prisma/schema.postgresql.prisma";
  }
  return "prisma/schema.prisma";
}

function generatePrismaClient(env = buildPrismaEnv()) {
  const schema = resolvePrismaSchemaFromEnv(env);
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

function run(command, args, env) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: false,
    env,
  });
  return result.status ?? 1;
}

const missingMessages = ["messages/en.json", "messages/ar.json"].filter(
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

if (platform() === "linux") {
  console.log("[hostinger-build] Fixing directory permissions (chmod -R u+rwX)…");
  const chmod = spawnSync("chmod", ["-R", "u+rwX", "."], {
    stdio: "inherit",
    env: process.env,
  });
  if (chmod.status !== 0) {
    console.warn("[hostinger-build] chmod failed — continuing build anyway");
  }
} else {
  console.log("[hostinger-build] Skipping chmod (not Linux)");
}

const prismaEnv = buildPrismaEnv();
const dbProbe = await probeDatabase(prismaEnv);
// #region agent log
fetch('http://127.0.0.1:7876/ingest/6e6c5bde-6579-4633-b8e0-f055b7efa2da',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a14bff'},body:JSON.stringify({sessionId:'a14bff',runId:'build-fail-debug',hypothesisId:'C',location:'scripts/deploy/hostinger-build.mjs:92',message:'database probe result',data:{ok:dbProbe.ok,reason:dbProbe.reason ?? null,hasDatabaseUrl:Boolean(prismaEnv.DATABASE_URL)},timestamp:Date.now()})}).catch(()=>{});
// #endregion
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

console.log("[hostinger-build] Running next build…");
const buildExit = run("npx", ["next", "build"], buildEnv);
// #region agent log
fetch('http://127.0.0.1:7876/ingest/6e6c5bde-6579-4633-b8e0-f055b7efa2da',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a14bff'},body:JSON.stringify({sessionId:'a14bff',runId:'build-fail-debug',hypothesisId:'C',location:'scripts/deploy/hostinger-build.mjs:118',message:'hostinger next build exit',data:{buildExit,buildWithoutDb:buildEnv.BUILD_WITHOUT_DB ?? null},timestamp:Date.now()})}).catch(()=>{});
// #endregion

process.exit(buildExit);
