#!/usr/bin/env node
/**
 * Generate Prisma client from the schema that matches DATABASE_URL.
 * PostgreSQL (Supabase): prisma/schema.postgresql.prisma
 * MySQL (default): prisma/schema.prisma
 */
import { buildPrismaEnv, sanitizeDatabaseUrl } from "./deploy/load-database-url.mjs";
import { runPrismaOrExit } from "./deploy/run-prisma.mjs";

function resolveSchemaPath(databaseUrl) {
  if (process.env.PRISMA_SCHEMA === "postgresql") {
    return "prisma/schema/postgresql/schema.prisma";
  }
  const url = databaseUrl?.trim() ?? "";
  if (/^postgres(ql)?:\/\//i.test(url)) {
    return "prisma/schema/postgresql/schema.prisma";
  }
  return "prisma/schema/mysql/schema.prisma";
}

const env = buildPrismaEnv();
const databaseUrl = sanitizeDatabaseUrl(env.DATABASE_URL ?? "");
const schema = resolveSchemaPath(databaseUrl);

if (!databaseUrl) {
  console.warn("[prisma-generate] DATABASE_URL unset — defaulting to MySQL schema.");
} else {
  const safe = databaseUrl.replace(/:([^:@/]+)@/, ":***@");
  console.log(`[prisma-generate] DATABASE_URL: ${safe}`);
}

console.log(`[prisma-generate] Using ${schema}`);

runPrismaOrExit(["generate", "--schema", schema], { env });
