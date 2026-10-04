#!/usr/bin/env node
/** Azura uses MySQL 8.4 only — Prisma schema always resolves to prisma/schema/mysql. */
import { sanitizeDatabaseUrl } from "./load-database-url.mjs";

const MYSQL_SCHEMA = "prisma/schema/mysql";

export function resolvePrismaSchemaPath(_env = process.env) {
  return MYSQL_SCHEMA;
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
