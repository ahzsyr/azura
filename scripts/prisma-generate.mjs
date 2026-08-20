#!/usr/bin/env node
/**
 * Generate Prisma client from the schema that matches DATABASE_URL.
 * PostgreSQL (Supabase): prisma/schema/postgresql
 * MySQL (default): prisma/schema/mysql
 */
import { buildPrismaEnv, sanitizeDatabaseUrl } from "./deploy/load-database-url.mjs";
import { resolvePrismaSchemaPath } from "./deploy/resolve-prisma-schema.mjs";
import { runPrismaOrExit } from "./deploy/run-prisma.mjs";

const env = buildPrismaEnv();
const databaseUrl = sanitizeDatabaseUrl(env.DATABASE_URL ?? "");
const schema = resolvePrismaSchemaPath(env);

if (!databaseUrl) {
  console.warn("[prisma-generate] DATABASE_URL unset — defaulting to MySQL schema.");
} else {
  const safe = databaseUrl.replace(/:([^:@/]+)@/, ":***@");
  console.log(`[prisma-generate] DATABASE_URL: ${safe}`);
}

console.log(`[prisma-generate] Using ${schema}`);

runPrismaOrExit(["generate", "--schema", schema], { env });
