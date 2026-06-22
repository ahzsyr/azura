#!/usr/bin/env node
/** Resolve Prisma multi-file schema directory from DATABASE_URL / PRISMA_SCHEMA. */
import { sanitizeDatabaseUrl } from "./load-database-url.mjs";

export function resolvePrismaSchemaPath(env = process.env) {
  if (env.PRISMA_SCHEMA === "postgresql") {
    return "prisma/schema/postgresql";
  }
  const url = sanitizeDatabaseUrl(env.DATABASE_URL ?? "");
  if (/^postgres(ql)?:\/\//i.test(url)) {
    return "prisma/schema/postgresql";
  }
  return "prisma/schema/mysql";
}

export function isPostgresDatabaseUrl(url = process.env.DATABASE_URL ?? "") {
  return /^postgres(ql)?:\/\//i.test(sanitizeDatabaseUrl(url));
}
