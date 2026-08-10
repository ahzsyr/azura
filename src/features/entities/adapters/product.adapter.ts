import "server-only";

import { collectionsDataService } from "@/features/collections/collections-data.service";
import { contentRepository } from "@/features/content/content.repository";
import { contentPublicService } from "@/features/content/content-public.service";
import { isEntityReadContentEnabled } from "@/features/entities/entity-flags";
import { FALLBACK_LOCALES } from "@/i18n/locale-config";
import { productsDataService } from "@/features/products/products-data.service";
import type {
  Collection,
  EntityGetOptions,
  EntityListOptions,
  EntityListRow,
  EntityPresetId,
  EntityRecord,
} from "@/features/entities/types";
import {
  mapContentItemViewToEntityRecord,
  mapContentListItemToEntityListRow,
  mapProductSummaryToEntityListRow,
  mapProductToEntityRecord,
} from "@/features/entities/adapters/normalize";
import type { EntityStorageAdapter } from "@/features/entities/adapters/types";

function resolveLocalePrefix(options?: EntityListOptions | EntityGetOptions): string {
  const fromOptions = options?.locale?.trim();
  if (fromOptions) return fromOptions;
  return FALLBACK_LOCALES.find((locale) => locale.isDefault)?.urlPrefix ?? "en";
}

export function createProductAdapter(
  presetId: EntityPresetId,
  contentTypeSlug: string,
): EntityStorageAdapter {
  const readContentFirst = () => isEntityReadContentEnabled();

  return {
    async list(options?: EntityListOptions): Promise<EntityListRow[]> {
      if (readContentFirst()) {
        const rows = await contentRepository.listItemsAsListRows(contentTypeSlug, {
          search: options?.search,
          status: options?.status,
          collectionSlug: options?.collectionSlug,
          includeDeleted: options?.includeDeleted,
        });
        let mapped = rows.map((row) => mapContentListItemToEntityListRow(presetId, row));
        if (options?.limit != null && options.limit > 0) {
          mapped = mapped.slice(0, options.limit);
        }
        if (mapped.length > 0) return mapped;
      }

      const localePrefix = resolveLocalePrefix(options);
      const limit = options?.limit ?? 400;

      if (options?.search?.trim()) {
        const { products } = await productsDataService.getAllProducts(localePrefix);
        const query = options.search.trim().toLowerCase();
        const filtered = products.filter((product) => {
          const haystack = [product.name, product.slug, product.brand, product.category]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return haystack.includes(query);
        });
        return filtered
          .slice(0, limit)
          .map((summary) => mapProductSummaryToEntityListRow(presetId, summary));
      }

      const pickerEntries = await productsDataService.listProductPickerEntries(
        localePrefix,
        limit,
      );
      return pickerEntries.map((entry) =>
        mapProductSummaryToEntityListRow(presetId, {
          id: entry.slug,
          slug: entry.slug,
          name: entry.name,
          price: { value: 0, currency: "USD" },
        }),
      );
    },

    async get(idOrSlug: string, options?: EntityGetOptions): Promise<EntityRecord | null> {
      const key = idOrSlug.trim();
      if (!key) return null;

      if (readContentFirst()) {
        const contentAdapter = await import("@/features/entities/adapters/content-item.adapter");
        const adapter = contentAdapter.createContentItemAdapter(presetId, contentTypeSlug);
        const fromContent = await adapter.get(key, options);
        if (fromContent) return fromContent;

        const view = await contentPublicService.getItemByTypeAndSlug(contentTypeSlug, key);
        if (view) return mapContentItemViewToEntityRecord(presetId, view);
      }

      const localePrefix = resolveLocalePrefix(options);
      const result = await productsDataService.getProduct(localePrefix, key);
      if (!result?.product) return null;

      return mapProductToEntityRecord(presetId, result.product, key);
    },

    async listCollections(options?: EntityListOptions): Promise<Collection[]> {
      const localePrefix = resolveLocalePrefix(options);
      const rows = await collectionsDataService.loadAll({ localePrefix });
      return rows.map((row, index) => ({
        id: row.id,
        slug: row.slug,
        title: row.name || row.slug,
        presetId,
        sortOrder: index,
      }));
    },
  };
}
