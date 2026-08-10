"use server";

import { requireAdmin } from "@/features/auth/guards";
import { orderCollectionsHierarchy } from "@/features/collections/collection-hierarchy";
import { collectionsDataService } from "@/features/collections/collections-data.service";
import { localeService } from "@/features/i18n/locale.service";
import { productsDataService } from "@/features/products/products-data.service";
import type { CollectionBuilderOption, ProductBuilderOption } from "./types";

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
