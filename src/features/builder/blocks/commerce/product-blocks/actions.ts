"use server";

import { requireAdmin } from "@/features/auth/guards";
import { orderCollectionsHierarchy } from "@/features/collections/collection-hierarchy";
import { collectionsDataService } from "@/features/collections/collections-data.service";
import { localeService } from "@/features/i18n/locale.service";
import { productsDataService } from "@/features/products/products-data.service";
import { loadProductOrderingSettings } from "@/features/products/ordering/load-product-ordering";
import type {
  CollectionBuilderOption,
  OrderingProfileBuilderOption,
  ProductBuilderOption,
} from "./types";

async function defaultLocalePrefix(): Promise<string> {
  const locales = await localeService.listEnabled();
  return locales.find((l) => l.isDefault)?.urlPrefix ?? "en";
}

export async function fetchCollectionsForBuilder(): Promise<CollectionBuilderOption[]> {
  await requireAdmin();
  try {
    const localePrefix = await defaultLocalePrefix();
    const collections = await collectionsDataService.loadAll({ localePrefix });
    const ordered = orderCollectionsHierarchy(collections);
    return ordered.map((c) => ({
      slug: c.slug,
      label: c.name?.trim() || c.slug,
      visible: c.visible !== false,
      parentSlug: c.parentSlug?.trim() || undefined,
    }));
  } catch {
    return [];
  }
}

export async function fetchProductsForBuilder(limit = 500): Promise<ProductBuilderOption[]> {
  await requireAdmin();
  try {
    const localePrefix = await defaultLocalePrefix();
    const entries = await productsDataService.listProductPickerEntries(localePrefix, limit);
    return entries.map((e) => ({
      slug: e.slug,
      label: e.name?.trim() || e.slug,
    }));
  } catch {
    return [];
  }
}

export async function fetchOrderingProfilesForBuilder(): Promise<OrderingProfileBuilderOption[]> {
  await requireAdmin();
  try {
    const localePrefix = await defaultLocalePrefix();
    const settings = await loadProductOrderingSettings(localePrefix);
    return settings.profiles
      .filter((p) => p.enabled)
      .map((p) => ({
        id: p.id,
        label: p.name.trim() || p.id,
        scopeType: p.scope.type,
        isGlobal: p.scope.type === "GLOBAL",
      }));
  } catch {
    return [];
  }
}
