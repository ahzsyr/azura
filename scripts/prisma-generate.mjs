#!/usr/bin/env node
/**
 * Generate Prisma client from the MySQL schema (Azura canonical DB).
 */
import { buildPrismaEnv, sanitizeDatabaseUrl } from "./deploy/load-database-url.mjs";
import { assertMysqlDatabaseUrl, resolvePrismaSchemaPath } from "./deploy/resolve-prisma-schema.mjs";
import { runPrismaOrExit } from "./deploy/run-prisma.mjs";

const env = buildPrismaEnv();
const databaseUrl = sanitizeDatabaseUrl(env.DATABASE_URL ?? "");
const schema = resolvePrismaSchemaPath(env);

if (databaseUrl) {
  assertMysqlDatabaseUrl(databaseUrl);
  const safe = databaseUrl.replace(/:([^:@/]+)@/, ":***@");
  console.log(`[prisma-generate] DATABASE_URL: ${safe}`);
} else {
  console.warn("[prisma-generate] DATABASE_URL unset — generating MySQL client.");
}

console.log(`[prisma-generate] Using ${schema}`);

runPrismaOrExit(["generate", "--schema", schema], { env });
