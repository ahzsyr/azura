#!/usr/bin/env node
/** Test DATABASE_URL. Run: npm run test:db  or  npm run test:db:hostinger */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { buildPrismaEnv } from "./load-database-url.mjs";
import {
  isPostgresDatabaseUrl,
  resolvePrismaSchemaPath,
} from "./resolve-prisma-schema.mjs";

const env = buildPrismaEnv();
const url = env.DATABASE_URL?.trim();
if (!url) {
  console.error("DATABASE_URL is not set (.env.hostinger, .env, or hPanel)");
  process.exit(1);
}

const safe = url.replace(/:([^:@/]+)@/, ":***@");
const schema = resolvePrismaSchemaPath(env);
const isPostgres = isPostgresDatabaseUrl(url);

console.log("Testing:", safe);
console.log("Expected Prisma schema:", schema);

const clientIndex = join(process.cwd(), "node_modules", ".prisma", "client", "index.js");
let currentProvider = null;
if (existsSync(clientIndex)) {
  const match = readFileSync(clientIndex, "utf-8").match(/"activeProvider":\s*"(\w+)"/);
  currentProvider = match?.[1] ?? null;
}
const expectedProvider = isPostgres ? "postgresql" : "mysql";

if (currentProvider !== expectedProvider) {
  console.warn(
    `[test:db] Prisma client is "${currentProvider}" but DATABASE_URL needs "${expectedProvider}". Regenerating…`,
  );
  const gen = spawnSync("npx", ["prisma", "generate", "--schema", schema], {
    stdio: "inherit",
    shell: false,
    env,
  });
  if ((gen.status ?? 1) !== 0) {
    console.error("Stop `npm run dev` if files are locked, then run:");
    console.error(`  npx prisma generate --schema ${schema}`);
    process.exit(gen.status ?? 1);
  }
}

const client = new PrismaClient();
try {
  await client.$queryRaw`SELECT 1`;
  console.log("OK — database credentials work.");

  if (isPostgres) {
    try {
      const tables = await client.$queryRawUnsafe(
        `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'JsonStore'`,
      );
      const hasJsonStore = Array.isArray(tables) && tables.length > 0;
      if (!hasJsonStore) {
        console.warn(
          "WARNING — JsonStore table missing. Import database/postgres/import-blank.sql in Supabase SQL Editor.",
        );
      } else {
        console.log("OK — JsonStore table exists.");
      }
    } catch {
      console.warn("Could not verify JsonStore table (non-fatal).");
    }
  }

  process.exit(0);
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.error("FAILED —", message);
  console.error("\nTips:");
  if (message.includes("mysql://")) {
    console.error("- Prisma client mismatch: run npm run db:generate:hostinger");
  }
  if (message.includes("tenant") || message.includes("ENOTFOUND")) {
    console.error("- Copy DATABASE_URL exactly from Supabase → Database → Connection string → URI");
    console.error("- Reset database password in Supabase if unsure (encode @ as %40)");
  }
  if (message.includes("Can't reach database server")) {
    console.error("- Try pooler URL (port 6543 + ?pgbouncer=true) instead of direct db.*.supabase.co");
  }
  console.error("- Encode @ in password as %40 in DATABASE_URL");
  if (isPostgres) {
    console.error("- Import database/postgres/import-blank.sql in Supabase SQL Editor");
    console.error("- On Hostinger: paste env in hPanel, redeploy, then SSH: npm run test:db");
  }
  process.exit(1);
} finally {
  await client.$disconnect();
}
