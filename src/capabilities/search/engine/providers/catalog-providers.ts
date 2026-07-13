import { createHash } from "node:crypto";
import { getLocalizedField } from "@/lib/utils";
import type { SearchCardPayload } from "@/capabilities/search/types/search-card";
import { defineSearchProvider } from "@/capabilities/search/engine/providers/search-provider";
import type {
  DiscoveredContentCollection,
  DiscoveredContentType,
} from "@/capabilities/search/engine/discovery/catalog-search-discovery";
import { resolveIndexTitle } from "@/capabilities/search/lib/resolve-index-title";
import type { IndexedProductListingRecord } from "@/features/products/index/product-index-types";
import { isProductPublishedForSearch } from "@/features/products/lib/product-publish-status";
import type { Collection } from "@/features/collections/types";

/** Stable entity id when slug exceeds DB varchar(36). */
export function catalogEntityId(namespace: string, key: string): string {
  const raw = `${namespace}:${key}`;
  if (raw.length <= 36) return raw;
  return createHash("sha256").update(raw).digest("hex").slice(0, 36);
}

export type ContentTypeIndexSource = DiscoveredContentType;

export const contentTypeLandingSearchProvider = defineSearchProvider<ContentTypeIndexSource>({
  kind: "content_type",
  entityType: "CONTENT_TYPE",
  defaultVisibility: "public",
  defaultBoost: 0.85,
  shouldIndex: (type) => type.search.enabled && type.search.indexLandingPage !== false,
  buildRecords(type, ctx) {
    const prefix = type.routePrefix ?? type.slug;
    const title = resolveIndexTitle(getLocalizedField(type, "labelPlural", ctx.urlPrefix), type.slug, {
      entityType: "CONTENT_TYPE",
      entityId: type.id,
      locale: ctx.urlPrefix,
    });
    const body = [
      ...Object.values(type.name ?? {}),
      type.slug,
    ]
      .filter(Boolean)
      .join(" ");
    return [
      {
        entityType: "CONTENT_TYPE",
        entityId: type.id,
        locale: ctx.urlPrefix,
        title,
        body,
        urlPath: `/${ctx.urlPrefix}/${prefix}`,
        kind: "content_type",
        contentTypeSlug: type.slug,
        visibility: "public",
        boost: type.search.boost ?? 1,
        facets: { contentTypeSlug: type.slug },
        metadata: {
          contentTypeSlug: type.slug,
          adminPath: `/admin/content/types/${type.id}`,
        },
      },
    ];
  },
});

export type ContentCollectionIndexSource = DiscoveredContentCollection & {
  routePrefix?: string | null;
};

export const contentCollectionSearchProvider = defineSearchProvider<ContentCollectionIndexSource>({
  kind: "content_collection",
  entityType: "CONTENT_COLLECTION",
  defaultVisibility: "public",
  defaultBoost: 0.9,
  shouldIndex: (col) => col.isPublished,
  buildRecords(col, ctx) {
    const prefix = col.routePrefix ?? col.contentTypeSlug;
    const localizedName = getLocalizedField(col, "name", ctx.urlPrefix);
    const title = resolveIndexTitle(localizedName, col.slug, {
      entityType: "CONTENT_COLLECTION",
      entityId: col.id,
      locale: ctx.urlPrefix,
    });
    const excerpt =
      getLocalizedField(col, "excerpt", ctx.urlPrefix) ||
      localizedName;
    return [
      {
        entityType: "CONTENT_COLLECTION",
        entityId: col.id,
        locale: ctx.urlPrefix,
        title,
        body: excerpt || col.slug,
        urlPath: `/${ctx.urlPrefix}/${prefix}?collection=${col.slug}`,
        kind: "content_collection",
        contentTypeSlug: col.contentTypeSlug,
        visibility: "public",
        boost: 0.9,
        facets: {
          contentTypeSlug: col.contentTypeSlug,
          collectionSlug: col.slug,
        },
        metadata: {
          contentTypeSlug: col.contentTypeSlug,
          collectionSlug: col.slug,
          adminPath: `/admin/content/${col.contentTypeSlug}`,
        },
      },
    ];
  },
});

export type CatalogProductIndexSource = IndexedProductListingRecord & {
  productId?: string;
};

export const catalogProductSearchProvider = defineSearchProvider<CatalogProductIndexSource>({
  kind: "catalog_product",
  entityType: "CATALOG_PRODUCT",
  defaultVisibility: "public",
  defaultBoost: 1,
  shouldIndex: (record) => isProductPublishedForSearch(record.status),
  buildRecords(record, ctx) {
    const catalogProductId =
      record.productId != null && record.productId !== ""
        ? String(record.productId).trim()
        : undefined;
    // Always derive from slug — catalog SKUs can use slug-length ids (>36 chars) which
    // exceed SearchDocument.entityId and break Prisma upsert matching.
    const entityId = catalogEntityId("product", record.slug);
    const body = [record.searchText, record.brand, record.mpn, ...record.tags, ...record.categories]
      .filter(Boolean)
      .join(" ");
    const title = resolveIndexTitle(record.name, record.slug, {
      entityType: "CATALOG_PRODUCT",
      entityId,
      locale: ctx.urlPrefix,
    });

    const cardDisplay = record.searchCardDisplay;
    const showRating =
      cardDisplay?.showRating &&
      record.rating != null &&
      record.rating > 0;
    const card: SearchCardPayload = {
      slug: record.slug,
      ...(cardDisplay?.showImage && record.primary_image
        ? { imageUrl: record.primary_image }
        : {}),
      ...(cardDisplay?.showBrand && record.brand ? { brand: record.brand } : {}),
      inStock: record.in_stock,
      ...(cardDisplay?.showPrice
        ? {
            price: {
              min: record.priceMin,
              max: record.priceMax !== record.priceMin ? record.priceMax : undefined,
              currency: record.price?.currency,
            },
          }
        : {}),
      ...(showRating
        ? { rating: { value: record.rating!, count: record.reviews_count ?? 0 } }
        : {}),
    };

    return [
      {
        entityType: "CATALOG_PRODUCT",
        entityId,
        locale: ctx.urlPrefix,
        title,
        body,
        urlPath: `/${ctx.urlPrefix}/products/${record.slug}`,
        kind: "catalog_product",
        visibility: "public",
        boost: 1,
        facets: {
          brand: record.brand ?? "",
          categories: record.categories,
          tags: record.tags,
          price: record.priceMin,
          priceMin: record.priceMin,
          priceMax: record.priceMax,
        },
        metadata: {
          slug: record.slug,
          ...(catalogProductId ? { catalogProductId } : {}),
          adminPath: "/admin/products",
          card,
          displaySnippet: record.displaySnippet ?? "",
          cardDisplay,
        },
      },
    ];
  },
});

export type CatalogCollectionIndexSource = Collection;

export const catalogCollectionSearchProvider = defineSearchProvider<CatalogCollectionIndexSource>({
  kind: "catalog_collection",
  entityType: "CATALOG_COLLECTION",
  defaultVisibility: "public",
  defaultBoost: 0.95,
  shouldIndex: (col) => col.visible !== false,
  buildRecords(col, ctx) {
    const entityId = catalogEntityId("pcol", col.slug);
    const title = resolveIndexTitle(col.name, col.slug, {
      entityType: "CATALOG_COLLECTION",
      entityId,
      locale: ctx.urlPrefix,
    });
    const card: SearchCardPayload = {
      slug: col.slug,
      imageUrl: col.coverImage ?? col.iconImage,
    };
    return [
      {
        entityType: "CATALOG_COLLECTION",
        entityId,
        locale: ctx.urlPrefix,
        title,
        body: [col.description, col.slug, ...(col.conditions?.rules?.map((r) => r.value) ?? [])]
          .filter(Boolean)
          .join(" "),
        urlPath: `/${ctx.urlPrefix}/collections/${col.slug}`,
        kind: "catalog_collection",
        visibility: "public",
        boost: 0.95,
        facets: { collectionSlug: col.slug },
        metadata: {
          slug: col.slug,
          adminPath: "/admin/products",
          card,
        },
      },
    ];
  },
});

export type CatalogCategoryIndexSource = {
  slug: string;
  label: string;
  productCount: number;
};

export const catalogCategorySearchProvider = defineSearchProvider<CatalogCategoryIndexSource>({
  kind: "catalog_category",
  entityType: "CATALOG_CATEGORY",
  defaultVisibility: "public",
  defaultBoost: 0.85,
  shouldIndex: () => true,
  buildRecords(cat, ctx) {
    const entityId = catalogEntityId("pcat", cat.slug);
    const title = resolveIndexTitle(cat.label, cat.slug, {
      entityType: "CATALOG_CATEGORY",
      entityId,
      locale: ctx.urlPrefix,
    });
    const card: SearchCardPayload = {
      slug: cat.slug,
      productCount: cat.productCount,
    };
    return [
      {
        entityType: "CATALOG_CATEGORY",
        entityId,
        locale: ctx.urlPrefix,
        title,
        body: cat.slug,
        urlPath: `/${ctx.urlPrefix}/products?category=${encodeURIComponent(cat.slug)}`,
        kind: "catalog_category",
        visibility: "public",
        boost: 0.85,
        facets: { categorySlug: cat.slug },
        metadata: {
          slug: cat.slug,
          adminPath: "/admin/products",
          card,
        },
      },
    ];
  },
});

export const CATALOG_SEARCH_PROVIDERS = [
  contentTypeLandingSearchProvider,
  contentCollectionSearchProvider,
  catalogProductSearchProvider,
  catalogCollectionSearchProvider,
  catalogCategorySearchProvider,
] as const;
