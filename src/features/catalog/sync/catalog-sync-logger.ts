import "server-only";

import type { Prisma } from "@prisma/client";

export const CATALOG_SYNC_LOG_NAMESPACE = "catalog-sync-log";
export const CATALOG_SYNC_STATUS_NAMESPACE = "catalog-sync-status";
export const CATALOG_SYNC_STATUS_KEY = "latest";

export type CatalogSyncLogEntry = {
  at: string;
  level: "info" | "warn" | "error";
  operation: string;
  locale?: string;
  slug?: string;
  entityType?: string;
  durationMs?: number;
  message: string;
  error?: string;
};

export type CatalogSyncStatus = {
  lastRunAt: string;
  lastOperation: string;
  locale?: string;
  ok: boolean;
  indexCount?: number;
  searchRemoved?: number;
  errors: string[];
  warnings: string[];
};

const MAX_LOG_ENTRIES = 50;

function consoleLog(entry: CatalogSyncLogEntry): void {
  const prefix = `[catalog-sync] ${entry.operation}`;
  const detail = [entry.locale, entry.slug, entry.message, entry.error].filter(Boolean).join(" — ");
  if (entry.level === "error") console.error(prefix, detail);
  else if (entry.level === "warn") console.warn(prefix, detail);
  else console.log(prefix, detail);
}

async function persistLogEntry(entry: CatalogSyncLogEntry): Promise<void> {
  try {
    const { jsonStoreService } = await import("@/features/storage/json-store.service");
    const existing =
      (await jsonStoreService.get<CatalogSyncLogEntry[]>(
        CATALOG_SYNC_LOG_NAMESPACE,
        "entries",
      )) ?? [];
    const next = [entry, ...existing].slice(0, MAX_LOG_ENTRIES);
    await jsonStoreService.set(
      CATALOG_SYNC_LOG_NAMESPACE,
      "entries",
      next as unknown as Prisma.InputJsonValue,
    );
  } catch {
    /* JsonStore optional */
  }
}

export async function logCatalogSync(entry: Omit<CatalogSyncLogEntry, "at">): Promise<void> {
  const full: CatalogSyncLogEntry = { ...entry, at: new Date().toISOString() };
  consoleLog(full);
  if (entry.level !== "info") {
    await persistLogEntry(full);
  }
}

export async function saveCatalogSyncStatus(status: CatalogSyncStatus): Promise<void> {
  try {
    const { jsonStoreService } = await import("@/features/storage/json-store.service");
    await jsonStoreService.set(
      CATALOG_SYNC_STATUS_NAMESPACE,
      CATALOG_SYNC_STATUS_KEY,
      status as unknown as Prisma.InputJsonValue,
    );
  } catch {
    /* optional */
  }
}

export async function loadCatalogSyncStatus(): Promise<CatalogSyncStatus | null> {
  try {
    const { jsonStoreService } = await import("@/features/storage/json-store.service");
    return await jsonStoreService.get<CatalogSyncStatus>(
      CATALOG_SYNC_STATUS_NAMESPACE,
      CATALOG_SYNC_STATUS_KEY,
    );
  } catch {
    return null;
  }
}

export async function loadCatalogSyncLogEntries(): Promise<CatalogSyncLogEntry[]> {
  try {
    const { jsonStoreService } = await import("@/features/storage/json-store.service");
    return (
      (await jsonStoreService.get<CatalogSyncLogEntry[]>(
        CATALOG_SYNC_LOG_NAMESPACE,
        "entries",
      )) ?? []
    );
  } catch {
    return [];
  }
}
