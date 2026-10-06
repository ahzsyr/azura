#!/usr/bin/env node
/**
 * Azura uses MySQL 8.4 only.
 *
 * - Datamodel (generate / db push / migrate diff): prisma/schema/mysql
 * - Migrate history (deploy / status / dev): prisma/schema.prisma
 *   so Prisma resolves migrations from prisma/migrations (sibling of schema.prisma).
 *   Pointing migrate at prisma/schema/mysql looks for prisma/schema/migrations and
 *   reports "No migration found".
 */
import { sanitizeDatabaseUrl } from "./load-database-url.mjs";

const MYSQL_DATAMODEL = "prisma/schema/mysql";
const MYSQL_MIGRATE_SCHEMA = "prisma/schema.prisma";

/** Full MySQL datamodel folder (multi-file schema). */
export function resolvePrismaSchemaPath(_env = process.env) {
  return MYSQL_DATAMODEL;
}

/** Schema entry used for `prisma migrate *` (migration history location). */
export function resolvePrismaMigrateSchemaPath(_env = process.env) {
  return MYSQL_MIGRATE_SCHEMA;
}

/** @deprecated PostgreSQL is not supported; always false. Kept for call-site compatibility. */
export function isPostgresDatabaseUrl(url = process.env.DATABASE_URL ?? "") {
  return /^postgres(ql)?:\/\//i.test(sanitizeDatabaseUrl(url));
}

export function assertMysqlDatabaseUrl(url = process.env.DATABASE_URL ?? "") {
  const sanitized = sanitizeDatabaseUrl(url);
  if (sanitized && isPostgresDatabaseUrl(sanitized)) {
    throw new Error(
      "PostgreSQL DATABASE_URL is not supported. Azura uses MySQL 8.4 only. Set DATABASE_URL to a mysql://… URI.",
    );
  }
}
