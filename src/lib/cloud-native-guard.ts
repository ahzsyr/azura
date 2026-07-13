import "server-only";

import { resolve, sep } from "node:path";
import { useDatabaseOnlyCatalog } from "@/features/catalog/catalog-data-source";

const DATA_PATH_PREFIXES = [
  resolve(process.cwd(), "src", "data"),
  resolve(process.cwd(), "public", "uploads"),
  resolve(process.cwd(), "data", "search-analytics"),
];

let runtimeAsserted = false;

function isPostgresDatabaseUrl(url: string | undefined): boolean {
  return !!url && /^postgres(ql)?:\/\//i.test(url);
}

/** True when local filesystem catalog/media dev mode is explicitly enabled. */
export function isFilesystemDevMode(): boolean {
  return (
    process.env.CATALOG_DATA_SOURCE === "filesystem" ||
    process.env.CATALOG_PRODUCTS_SOURCE === "filesystem" ||
    process.env.MEDIA_STORAGE === "local"
  );
}

/**
 * Production / cloud-native deployments: Postgres catalog + Supabase Storage only.
 * Local dev may opt out via CATALOG_DATA_SOURCE=filesystem or MEDIA_STORAGE=local.
 */
export function isCloudNativeProduction(): boolean {
  if (process.env.CATALOG_DATA_SOURCE === "filesystem") return false;
  if (process.env.CATALOG_PRODUCTS_SOURCE === "filesystem") return false;
  if (process.env.MEDIA_STORAGE === "local") return false;
  if (process.env.VERCEL) return true;
  if (useDatabaseOnlyCatalog()) return true;
  return isPostgresDatabaseUrl(process.env.DATABASE_URL);
}

export function assertCloudNativeRuntime(): void {
  if (!isCloudNativeProduction()) return;
  if (runtimeAsserted) return;
  runtimeAsserted = true;

  const dbUrl = process.env.DATABASE_URL ?? "";
  if (!isPostgresDatabaseUrl(dbUrl)) {
    throw new Error(
      "Cloud-native mode requires a PostgreSQL DATABASE_URL (Supabase pooler URI).",
    );
  }

  if (process.env.MEDIA_STORAGE !== "supabase" && process.env.VERCEL) {
    throw new Error(
      "Cloud-native mode on Vercel requires MEDIA_STORAGE=supabase and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  if (
    (process.env.MEDIA_STORAGE === "supabase" || process.env.VERCEL) &&
    !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  ) {
    throw new Error(
      "Cloud-native media requires SUPABASE_SERVICE_ROLE_KEY. Set MEDIA_STORAGE=supabase in production.",
    );
  }
}

export function assertFilesystemPersistenceAllowed(operation: string): void {
  if (!isCloudNativeProduction()) return;
  throw new Error(
    `Filesystem persistence is disabled in cloud-native mode (${operation}). Use database or Supabase Storage.`,
  );
}

/** Block writes to runtime data directories in cloud-native production. */
export function assertNoDataFilesystemWrite(absPath: string): void {
  if (!isCloudNativeProduction()) return;
  const normalized = resolve(absPath);
  for (const prefix of DATA_PATH_PREFIXES) {
    if (normalized === prefix || normalized.startsWith(prefix + sep)) {
      assertFilesystemPersistenceAllowed(`write to ${normalized}`);
    }
  }
}

/** Fail loudly when production code attempts a runtime filesystem read from catalog data paths. */
export function assertNoRuntimeDataFsRead(caller: string): void {
  if (isCloudNativeProduction()) {
    throw new Error(`Filesystem read from src/data is disabled (${caller})`);
  }
}
