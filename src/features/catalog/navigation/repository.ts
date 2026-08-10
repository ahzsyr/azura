import "server-only";

import type { Prisma } from "@prisma/client";
import { jsonStoreService } from "@/features/storage/json-store.service";
import {
  catalogNavigationSchema,
  catalogNavigationStoreSchema,
  type CatalogNavigationStore,
} from "./schema";
import { emptyCatalogNavigation } from "./resolve";
import type { CatalogNavigation, CatalogNavigationScopeType } from "./types";

export const CATALOG_NAVIGATION_NAMESPACE = "catalog-navigation";
export const CATALOG_NAVIGATION_KEY = "default";

function scopeKey(scopeType: CatalogNavigationScopeType, scopeId: string | null): string {
  return `${scopeType}:${scopeId ?? ""}`;
}

async function loadStore(): Promise<CatalogNavigationStore> {
  const raw = await jsonStoreService.get<unknown>(
    CATALOG_NAVIGATION_NAMESPACE,
    CATALOG_NAVIGATION_KEY,
  );
  if (!raw) return { navigations: [] };
  const parsed = catalogNavigationStoreSchema.safeParse(raw);
  if (!parsed.success) return { navigations: [] };
  return parsed.data;
}

async function saveStore(store: CatalogNavigationStore): Promise<void> {
  const parsed = catalogNavigationStoreSchema.parse(store);
  await jsonStoreService.set(
    CATALOG_NAVIGATION_NAMESPACE,
    CATALOG_NAVIGATION_KEY,
    parsed as unknown as Prisma.InputJsonValue,
    { revalidate: true },
  );
}

export async function listCatalogNavigations(): Promise<CatalogNavigation[]> {
  const store = await loadStore();
  return store.navigations;
}

export async function getCatalogNavigation(
  scopeType: CatalogNavigationScopeType,
  scopeId: string | null = null,
): Promise<CatalogNavigation> {
  const store = await loadStore();
  const found = store.navigations.find(
    (n) => n.scopeType === scopeType && (n.scopeId ?? null) === (scopeId ?? null),
  );
  return found ?? emptyCatalogNavigation(scopeType, scopeId);
}

export async function saveCatalogNavigation(
  navigation: CatalogNavigation,
): Promise<CatalogNavigation> {
  const parsed = catalogNavigationSchema.parse(navigation);
  const store = await loadStore();
  const key = scopeKey(parsed.scopeType, parsed.scopeId);
  const navigations = [
    parsed,
    ...store.navigations.filter(
      (n) => scopeKey(n.scopeType, n.scopeId) !== key,
    ),
  ];
  await saveStore({ navigations });
  return parsed;
}

export async function deleteCatalogNavigation(
  scopeType: CatalogNavigationScopeType,
  scopeId: string | null = null,
): Promise<void> {
  const store = await loadStore();
  const key = scopeKey(scopeType, scopeId);
  await saveStore({
    navigations: store.navigations.filter(
      (n) => scopeKey(n.scopeType, n.scopeId) !== key,
    ),
  });
}
