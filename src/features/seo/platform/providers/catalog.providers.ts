import "server-only";

import { buildProductListingCatalog } from "@/features/products/listing/catalog";
import {
  findBrandBySlug,
  loadBrandAndTagEntries,
} from "@/features/catalog/brand-tag-pages.service";
import { collectionsDataService } from "@/features/collections/collections-data.service";
import type { SeoEntityProvider } from "../types/entity-provider";
import type { SeoEntityDescriptor } from "../types/entity-descriptor";
import type { BulkEntityFilter } from "../types/autofill";
import { emptyDraft } from "../layers/content/snapshot-builder";

const BILINGUAL_DESCRIPTOR_COUNT = 2;

function localePrefix(descriptor: SeoEntityDescriptor): string {
  return descriptor.locale === "ar" ? "ar" : "en";
}

export const brandEntityProvider: SeoEntityProvider = {
  kind: "brand",
  async buildSnapshot(descriptor) {
    const prefix = localePrefix(descriptor);
    const listing = await buildProductListingCatalog(prefix);
    const { brands } = await loadBrandAndTagEntries(prefix, listing.records);
    const brand = findBrandBySlug(brands, descriptor.id);
    const title = brand ? `${brand.name} Products` : descriptor.id;
    const description = brand
      ? `Browse ${brand.name} products and related catalog items.`
      : "";
    return {
      ...emptyDraft(title),
      paragraphs: description ? [description] : [],
      metadata: Object.freeze({
        brand: brand?.name,
        productCount: brand?.productCount,
        logoUrl: brand?.profile?.logoUrl,
      }),
    };
  },
  async *listEntities(filter: BulkEntityFilter = {}) {
    const prefix = "en";
    const listing = await buildProductListingCatalog(prefix);
    const { brands } = await loadBrandAndTagEntries(prefix, listing.records);
    for (const brand of brands) {
      if (filter.search && !brand.name.toLowerCase().includes(filter.search.toLowerCase())) continue;
      yield Object.freeze({
        kind: "brand" as const,
        id: brand.slug,
        locale: "en",
        routingKey: `brand:${brand.slug}`,
      });
      yield Object.freeze({
        kind: "brand" as const,
        id: brand.slug,
        locale: "ar",
        routingKey: `brand:${brand.slug}`,
      });
    }
  },
  async countEntities(filter = {}) {
    const listing = await buildProductListingCatalog("en");
    const { brands } = await loadBrandAndTagEntries("en", listing.records);
    if (!filter.search) return brands.length * BILINGUAL_DESCRIPTOR_COUNT;
    const q = filter.search.toLowerCase();
    return brands.filter((b) => b.name.toLowerCase().includes(q)).length * BILINGUAL_DESCRIPTOR_COUNT;
  },
  displayName(descriptor) {
    return `Brand ${descriptor.id}`;
  },
  routing(descriptor) {
    return { publicPath: `/brands/${descriptor.id}` };
  },
};

export const collectionEntityProvider: SeoEntityProvider = {
  kind: "collection",
  async buildSnapshot(descriptor) {
    const prefix = localePrefix(descriptor);
    const col = await collectionsDataService.loadBySlug({ localePrefix: prefix }, descriptor.id);
    if (!col) return emptyDraft(descriptor.id);
    const title = col.name ?? descriptor.id;
    const description = col.description ?? col.seo?.metaDescription ?? "";
    const images = [];
    if (col.coverImage) images.push({ src: col.coverImage, alt: title });
    return {
      title,
      headings: [{ level: 1, text: title }],
      paragraphs: description ? [description] : [],
      tables: [],
      images,
      links: { internal: [], external: [] },
      faq: [],
      products: [],
      language: descriptor.locale,
      metadata: Object.freeze({
        parentSlug: col.parentSlug,
        badge: col.badge,
      }),
    };
  },
  async *listEntities(filter: BulkEntityFilter = {}) {
    const cols = await collectionsDataService.loadAll({ localePrefix: "en" });
    for (const col of cols) {
      if (filter.search && !col.slug.toLowerCase().includes(filter.search.toLowerCase())) continue;
      yield Object.freeze({
        kind: "collection" as const,
        id: col.slug,
        locale: "en",
        routingKey: `collection:${col.slug}`,
      });
      yield Object.freeze({
        kind: "collection" as const,
        id: col.slug,
        locale: "ar",
        routingKey: `collection:${col.slug}`,
      });
    }
  },
  async countEntities(filter = {}) {
    const cols = await collectionsDataService.loadAll({ localePrefix: "en" });
    if (!filter.search) return cols.length * BILINGUAL_DESCRIPTOR_COUNT;
    const q = filter.search.toLowerCase();
    return cols.filter((c) => c.slug.toLowerCase().includes(q)).length * BILINGUAL_DESCRIPTOR_COUNT;
  },
  displayName(descriptor) {
    return `Collection ${descriptor.id}`;
  },
  routing(descriptor) {
    return { publicPath: `/collections/${descriptor.id}` };
  },
};

export const categoryEntityProvider: SeoEntityProvider = {
  kind: "category",
  async buildSnapshot(descriptor) {
    const title = descriptor.id;
    return {
      ...emptyDraft(title),
      metadata: Object.freeze({ category: title }),
    };
  },
  async *listEntities() {
    // Categories are derived; bulk iteration uses product listing facets in future
  },
  async countEntities() {
    return 0;
  },
  displayName(descriptor) {
    return `Category ${descriptor.id}`;
  },
};

export const packageEntityProvider: SeoEntityProvider = {
  kind: "package",
  async buildSnapshot(descriptor) {
    return emptyDraft(descriptor.id);
  },
  async *listEntities(filter: BulkEntityFilter = {}) {
    if (!filter.selectedIds?.length) return;
    for (const id of filter.selectedIds) {
      yield Object.freeze({ kind: "package" as const, id, locale: "en" });
    }
  },
  async countEntities(filter = {}) {
    return filter.selectedIds?.length ?? 0;
  },
  displayName(descriptor) {
    return `Package ${descriptor.id}`;
  },
};
