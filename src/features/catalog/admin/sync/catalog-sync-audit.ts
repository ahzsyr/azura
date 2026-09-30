import "server-only";

import type { Prisma } from "@prisma/client";
import { jsonStoreService } from "@/features/storage/json-store.service";

export const CATALOG_SYNC_AUDIT_NAMESPACE = "catalog-sync-audit";
export const CATALOG_SYNC_AUDIT_KEY = "runs";
export const CATALOG_SYNC_AUDIT_MAX = 25;

export type CatalogSyncAuditEntry = {
  id: string;
  timestamp: string;
  locale: string;
  totalProducts: number;
  totalCollections: number;
  orphanProducts: number;
  ambiguousMatches: number;
  warningsCount: number;
  newCollectionsCreated: number;
  indexesRebuilt?: boolean;
};

type AuditPayload = {
  runs: CatalogSyncAuditEntry[];
};

export async function loadCatalogSyncAudit(limit = CATALOG_SYNC_AUDIT_MAX): Promise<CatalogSyncAuditEntry[]> {
  const stored = await jsonStoreService.get<AuditPayload>(
    CATALOG_SYNC_AUDIT_NAMESPACE,
    CATALOG_SYNC_AUDIT_KEY,
  );
  const runs = stored?.runs ?? [];
  return runs.slice(0, limit);
}

export async function appendCatalogSyncAudit(
  entry: Omit<CatalogSyncAuditEntry, "id"> & { id?: string },
): Promise<CatalogSyncAuditEntry[]> {
  const nextEntry: CatalogSyncAuditEntry = {
    id: entry.id ?? `sync-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: entry.timestamp,
    locale: entry.locale,
    totalProducts: entry.totalProducts,
    totalCollections: entry.totalCollections,
    orphanProducts: entry.orphanProducts,
    ambiguousMatches: entry.ambiguousMatches,
    warningsCount: entry.warningsCount,
    newCollectionsCreated: entry.newCollectionsCreated,
    indexesRebuilt: entry.indexesRebuilt,
  };

  const existing = await loadCatalogSyncAudit(CATALOG_SYNC_AUDIT_MAX);
  const runs = [nextEntry, ...existing].slice(0, CATALOG_SYNC_AUDIT_MAX);
  await jsonStoreService.set(
    CATALOG_SYNC_AUDIT_NAMESPACE,
    CATALOG_SYNC_AUDIT_KEY,
    { runs } as unknown as Prisma.InputJsonValue,
    { revalidate: true },
  );
  return runs;
}
