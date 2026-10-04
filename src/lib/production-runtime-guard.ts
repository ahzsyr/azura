import "server-only";

import { resolve, sep } from "node:path";
import { useDatabaseOnlyCatalog } from "@/features/catalog/catalog-data-source";
import { isMysqlDatabaseUrl } from "@/lib/database-url";

const DATA_PATH_PREFIXES = [
  resolve(process.cwd(), "src", "data"),
  resolve(process.cwd(), "data", "search-analytics"),
];

let runtimeAsserted = false;

/** Explicit filesystem catalog/media dev mode. */
export function isFilesystemDevMode(): boolean {
  return (
    process.env.CATALOG_DATA_SOURCE === "filesystem" ||
    process.env.CATALOG_PRODUCTS_SOURCE === "filesystem"
  );
}

/**
 * True when catalog/product JSON on disk should not be used
 * (MySQL-backed catalog). Local MEDIA_STORAGE remains allowed.
 */
export function isDatabaseBackedCatalog(): boolean {
  if (isFilesystemDevMode()) return false;
  if (useDatabaseOnlyCatalog()) return true;
  return isMysqlDatabaseUrl(process.env.DATABASE_URL);
}

/** @deprecated Use isDatabaseBackedCatalog — Hostinger-only production. */
export function isCloudNativeProduction(): boolean {
  return isDatabaseBackedCatalog();
}

/** Production requires MySQL. Does not ban local media storage. */
export function assertProductionRuntime(): void {
  if (process.env.NODE_ENV !== "production") return;
  if (runtimeAsserted) return;
  runtimeAsserted = true;

  const dbUrl = process.env.DATABASE_URL ?? "";
  if (!isMysqlDatabaseUrl(dbUrl)) {
    throw new Error(
      "Hostinger production requires a MySQL DATABASE_URL (mysql://…). PostgreSQL is not supported.",
    );
  }
}

/** @deprecated Use assertProductionRuntime */
export function assertCloudNativeRuntime(): void {
  assertProductionRuntime();
}

export function assertFilesystemPersistenceAllowed(operation: string): void {
  if (!isDatabaseBackedCatalog()) return;
  throw new Error(
    `Filesystem catalog persistence is disabled (${operation}). Use MySQL / Prisma.`,
  );
}

export function assertNoDataFilesystemWrite(absPath: string): void {
  if (!isDatabaseBackedCatalog()) return;
  const normalized = resolve(absPath);
  for (const prefix of DATA_PATH_PREFIXES) {
    if (normalized === prefix || normalized.startsWith(prefix + sep)) {
      assertFilesystemPersistenceAllowed(`write to ${normalized}`);
    }
  }
}
