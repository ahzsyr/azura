import type { Prisma } from "@prisma/client";
import type { PageBlocks } from "@/types/builder";
import { prisma } from "@/lib/prisma";
import { resolveEntityByLocalizedSlug } from "@/features/translation/translation-bundle";
import { resolveFieldSchema } from "@/features/content/content-type.registry";
import { ensureContentPlatformReady } from "@/features/content/content.service";
import { createCached, CACHE_TAGS } from "@/services/cache";
import { REVALIDATE } from "@/lib/config/performance";
import { cache } from "react";
import { FALLBACK_LOCALES } from "@/i18n/locale-config";
import type {
  ContentCollectionView,
  ContentItemView,
  ContentRouteResolution,
  ContentTypeView,
  LegacyHotelView,
  LegacyPackageView,
  LegacyServiceView,
} from "@/features/content/content-public.types";
import { resolveTranslation } from "@/features/translation/translation-resolver";
import type { EntityTranslation } from "@prisma/client";

const PUBLISHED_WHERE: Prisma.ContentItemWhereInput = {
  deletedAt: null,
  isVisible: true,
  status: "PUBLISHED",
};

const DEFAULT_LOCALE_CODE = FALLBACK_LOCALES.find((locale) => locale.isDefault)?.code ?? "en";

function parseBlocks(raw: unknown): PageBlocks {
  if (Array.isArray(raw)) return raw as PageBlocks;
  return [];
}

function parseAdminConfig(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

function serializeType(
  row: {
    id: string;
    slug: string;
    routePrefix: string | null;
    fieldSchema: unknown;
    adminConfig: unknown;
  },
  translations: EntityTranslation[] = []
): ContentTypeView {
  const ctx = { translations };
  const name =
    resolveTranslation("name", DEFAULT_LOCALE_CODE, ctx) ||
    resolveTranslation("name", "en", ctx) ||
    resolveTranslation("name", "ar", ctx);
  return {
    id: row.id,
    slug: row.slug,
    name,
    nameEn: resolveTranslation("name", "en", ctx),
    nameAr: resolveTranslation("name", "ar", ctx),
    routePrefix: row.routePrefix,
    fieldSchema: resolveFieldSchema({ fieldSchema: row.fieldSchema }, row.slug),
    adminConfig: parseAdminConfig(row.adminConfig),
  };
}

function publicPath(routePrefix: string | null, slug?: string | null): string {
  const prefix = routePrefix ?? "content";
  if (slug) return `/${prefix}/${slug}`;
  return `/${prefix}`;
}

function serializeCollection(
  row: { id: string; slug: string },
  translations: EntityTranslation[] = []
): ContentCollectionView {
  const ctx = { translations };
  const name =
    resolveTranslation("name", DEFAULT_LOCALE_CODE, ctx) ||
    resolveTranslation("name", "en", ctx) ||
    resolveTranslation("name", "ar", ctx);
  return {
    id: row.id,
    slug: row.slug,
    name,
    nameEn: resolveTranslation("name", "en", ctx),
    nameAr: resolveTranslation("name", "ar", ctx),
  };
}

export function serializeContentItem(
  row: {
    id: string;
    slug: string | null;
    attributes: unknown;
    blocks: unknown;
    displaySettings: unknown;
    status: ContentItemView["status"];
    isFeatured: boolean;
    isVisible: boolean;
    sortOrder: number;
    contentType: { slug: string; routePrefix: string | null };
    collection: { id: string; slug: string } | null;
    media: {
      id: string;
      url: string;
      sortOrder: number;
      isCover: boolean;
    }[],
    featuredImageUrl?: string | null;
  },
  translations: EntityTranslation[] = [],
  collectionTranslations: EntityTranslation[] = [],
  mediaTranslations: Map<string, EntityTranslation[]> = new Map()
): ContentItemView {
  const ctx = { translations };
  const routePrefix = row.contentType.routePrefix;
  const media =
    row.media.length > 0
      ? row.media
      : row.featuredImageUrl
        ? [
            {
              id: "featured",
              url: row.featuredImageUrl,



              sortOrder: 0,
              isCover: true,
            },
          ]
        : [];

  const titleEn = resolveTranslation("title", "en", ctx);
  const titleAr = resolveTranslation("title", "ar", ctx);
  const excerptEn = resolveTranslation("excerpt", "en", ctx);
  const excerptAr = resolveTranslation("excerpt", "ar", ctx);
  const descriptionEn = resolveTranslation("description", "en", ctx);
  const descriptionAr = resolveTranslation("description", "ar", ctx);
  const title =
    resolveTranslation("title", DEFAULT_LOCALE_CODE, ctx) || titleEn || titleAr;
  const excerpt =
    resolveTranslation("excerpt", DEFAULT_LOCALE_CODE, ctx) || excerptEn || excerptAr;
  const description =
    resolveTranslation("description", DEFAULT_LOCALE_CODE, ctx) || descriptionEn || descriptionAr;

  return {
    id: row.id,
    contentTypeSlug: row.contentType.slug,
    routePrefix,
    slug: row.slug,
    title,
    excerpt,
    description,
    titleEn,
    titleAr,
    excerptEn,
    excerptAr,
    descriptionEn,
    descriptionAr,
    attributes: (row.attributes ?? {}) as Record<string, unknown>,
    blocks: parseBlocks(row.blocks),
    displaySettings: (row.displaySettings ?? {}) as Record<string, unknown>,
    status: row.status,
    isFeatured: row.isFeatured,
    isVisible: row.isVisible,
    sortOrder: row.sortOrder,
    collection: row.collection
      ? serializeCollection(row.collection, collectionTranslations)
      : null,
    media: media.map((m) => {
      const mediaCtx = { translations: mediaTranslations.get(m.id) ?? [] };
      return {
        id: m.id,
        url: m.url,
        sortOrder: m.sortOrder,
        isCover: m.isCover,
        alt:
          resolveTranslation("alt", DEFAULT_LOCALE_CODE, mediaCtx) ||
          resolveTranslation("alt", "en", mediaCtx) ||
          resolveTranslation("alt", "ar", mediaCtx),
        caption:
          resolveTranslation("caption", DEFAULT_LOCALE_CODE, mediaCtx) ||
          resolveTranslation("caption", "en", mediaCtx) ||
          resolveTranslation("caption", "ar", mediaCtx),
        altEn: resolveTranslation("alt", "en", mediaCtx),
        altAr: resolveTranslation("alt", "ar", mediaCtx),
        captionEn: resolveTranslation("caption", "en", mediaCtx),
        captionAr: resolveTranslation("caption", "ar", mediaCtx),
      };
    }),
    href: publicPath(routePrefix, row.slug),
  };
}

const itemInclude = {
  contentType: { select: { slug: true, routePrefix: true, fieldSchema: true, adminConfig: true } },
  collection: { select: { id: true, slug: true } },
  media: {
    where: { isPublished: true, isHidden: false },
    orderBy: { sortOrder: "asc" as const },
  },
} satisfies Prisma.ContentItemInclude;

type ContentItemPublicRow = Prisma.ContentItemGetPayload<{ include: typeof itemInclude }>;

async function loadItemTranslationMaps(rows: { id: string; collectionId: string | null; media?: { id: string }[] }[]) {
  const itemIds = rows.map((r) => r.id);
  const collectionIds = [...new Set(rows.map((r) => r.collectionId).filter(Boolean))] as string[];
  const mediaIds = rows.flatMap((r) => r.media?.map((m) => m.id) ?? []);
  if (itemIds.length === 0) {
    return {
      byItem: new Map<string, EntityTranslation[]>(),
      byCollection: new Map<string, EntityTranslation[]>(),
      byMedia: new Map<string, EntityTranslation[]>(),
    };
  }
  const translations = await prisma.entityTranslation.findMany({
    where: {
      OR: [
        { entityType: "ContentItem", entityId: { in: itemIds } },
        { entityType: "ContentCollection", entityId: { in: collectionIds } },
        ...(mediaIds.length
          ? [{ entityType: "ContentItemMedia", entityId: { in: mediaIds } }]
          : []),
      ],
    },
  });
  const byItem = new Map<string, EntityTranslation[]>();
  const byCollection = new Map<string, EntityTranslation[]>();
  const byMedia = new Map<string, EntityTranslation[]>();
  for (const row of translations) {
    const map =
      row.entityType === "ContentCollection"
        ? byCollection
        : row.entityType === "ContentItemMedia"
          ? byMedia
          : byItem;
    const list = map.get(row.entityId) ?? [];
    list.push(row);
    map.set(row.entityId, list);
  }
  return { byItem, byCollection, byMedia };
}

function serializeRowsWithTranslations(
  rows: ContentItemPublicRow[],
  byItem: Map<string, EntityTranslation[]>,
  byCollection: Map<string, EntityTranslation[]>,
  byMedia: Map<string, EntityTranslation[]>
) {
  return rows.map((row) =>
    serializeContentItem(
      row,
      byItem.get(row.id) ?? [],
      row.collectionId ? byCollection.get(row.collectionId) ?? [] : [],
      byMedia
    )
  );
}

function listItemsCacheKey(
  typeSlug: string,
  filters?: { collectionSlug?: string; featuredOnly?: boolean; city?: string; offeringType?: string }
) {
  return [
    typeSlug,
    filters?.collectionSlug ?? "",
    filters?.featuredOnly ? "1" : "0",
    filters?.city ?? "",
    filters?.offeringType ?? "",
  ];
}

async function listItemsByTypeSlugUncached(
  typeSlug: string,
  filters?: { collectionSlug?: string; featuredOnly?: boolean; city?: string; offeringType?: string }
) {
  const rows = await prisma.contentItem.findMany({
    where: {
      ...PUBLISHED_WHERE,
      contentType: { slug: typeSlug, isEnabled: true },
      ...(filters?.collectionSlug ? { collection: { slug: filters.collectionSlug } } : {}),
      ...(filters?.featuredOnly ? { isFeatured: true } : {}),
    },
    include: {
      ...itemInclude,
      media: { where: { isPublished: true, isHidden: false }, orderBy: { sortOrder: "asc" }, take: 1 },
    },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
  });

  const { byItem, byCollection, byMedia } = await loadItemTranslationMaps(rows);
  let items = serializeRowsWithTranslations(rows, byItem, byCollection, byMedia);
  if (filters?.city) {
    items = items.filter((i) => i.attributes.city === filters.city);
  }
  if (filters?.offeringType) {
    items = items.filter((i) => i.attributes.offeringType === filters.offeringType);
  }
  return items;
}

const listItemsByTypeSlugRequestCached = cache(
  (typeSlug: string, collectionSlug: string, featuredOnly: string, city: string, offeringType: string) =>
    createCached(
      () =>
        listItemsByTypeSlugUncached(typeSlug, {
          collectionSlug: collectionSlug || undefined,
          featuredOnly: featuredOnly === "1" ? true : undefined,
          city: city || undefined,
          offeringType: offeringType || undefined,
        }),
      ["content-items", typeSlug, collectionSlug, featuredOnly, city, offeringType],
      {
        tags: [CACHE_TAGS.contentList(typeSlug, collectionSlug || undefined), CACHE_TAGS.marketing],
        revalidate: REVALIDATE.packages,
      }
    )()
);

function fetchCollectionsForType(typeSlug: string): Promise<ContentCollectionView[]> {
  return createCached(
    async () => {
      const type = await prisma.contentType.findUnique({ where: { slug: typeSlug } });
      if (!type) return [];
      return prisma.contentCollection.findMany({
        where: { contentTypeId: type.id, isPublished: true },
        select: { id: true, slug: true },
        orderBy: { sortOrder: "asc" },
      }).then(async (collections) => {
        const ids = collections.map((c) => c.id);
        const translations = ids.length
          ? await prisma.entityTranslation.findMany({
              where: { entityType: "ContentCollection", entityId: { in: ids } },
            })
          : [];
        const byCollection = new Map<string, EntityTranslation[]>();
        for (const row of translations) {
          const list = byCollection.get(row.entityId) ?? [];
          list.push(row);
          byCollection.set(row.entityId, list);
        }
        return collections.map((c) => serializeCollection(c, byCollection.get(c.id) ?? []));
      });
    },
    ["content-collections", typeSlug],
    {
      tags: [CACHE_TAGS.contentList(typeSlug), CACHE_TAGS.marketing],
      revalidate: REVALIDATE.packages,
    }
  )();
}

async function serializeContentItemWithTranslations(row: ContentItemPublicRow) {
  const [itemTranslations, collectionTranslations, mediaTranslations] = await Promise.all([
    prisma.entityTranslation.findMany({
      where: { entityType: "ContentItem", entityId: row.id },
    }),
    row.collectionId
      ? prisma.entityTranslation.findMany({
          where: { entityType: "ContentCollection", entityId: row.collectionId },
        })
      : Promise.resolve([]),
    row.media?.length
      ? prisma.entityTranslation.findMany({
          where: {
            entityType: "ContentItemMedia",
            entityId: { in: row.media.map((m) => m.id) },
          },
        })
      : Promise.resolve([]),
  ]);
  const byMedia = new Map<string, EntityTranslation[]>();
  for (const t of mediaTranslations) {
    const list = byMedia.get(t.entityId) ?? [];
    list.push(t);
    byMedia.set(t.entityId, list);
  }
  return serializeContentItem(row, itemTranslations, collectionTranslations, byMedia);
}

export const contentPublicService = {
  async ensureReady() {
    await ensureContentPlatformReady();
  },

  async getTypeBySlug(typeSlug: string) {
    const row = await prisma.contentType.findFirst({
      where: { slug: typeSlug, isEnabled: true },
    });
    if (!row) return null;
    const translations = await prisma.entityTranslation.findMany({
      where: { entityType: "ContentType", entityId: row.id },
    });
    return serializeType(row, translations);
  },

  async getTypeByRoutePrefix(routePrefix: string) {
    const row = await prisma.contentType.findFirst({
      where: { routePrefix, isEnabled: true },
    });
    if (!row) return null;
    const translations = await prisma.entityTranslation.findMany({
      where: { entityType: "ContentType", entityId: row.id },
    });
    return serializeType(row, translations);
  },

  async listEnabledTypes() {
    const rows = await prisma.contentType.findMany({
      where: { isEnabled: true },
      orderBy: { sortOrder: "asc" },
    });
    const ids = rows.map((r) => r.id);
    const translations = ids.length
      ? await prisma.entityTranslation.findMany({
          where: { entityType: "ContentType", entityId: { in: ids } },
        })
      : [];
    const byType = new Map<string, EntityTranslation[]>();
    for (const row of translations) {
      const list = byType.get(row.entityId) ?? [];
      list.push(row);
      byType.set(row.entityId, list);
    }
    return rows.map((row) => serializeType(row, byType.get(row.id) ?? []));
  },

  async getItemByTypeAndSlug(typeSlug: string, slug: string) {
    const row = await prisma.contentItem.findFirst({
      where: {
        ...PUBLISHED_WHERE,
        slug,
        contentType: { slug: typeSlug, isEnabled: true },
      },
      include: itemInclude,
    });
    return row ? serializeContentItemWithTranslations(row) : null;
  },

  async getItemByRoutePrefixAndSlug(routePrefix: string, slug: string, languageCode?: string) {
    if (languageCode) {
      const localized = await resolveEntityByLocalizedSlug("ContentItem", slug, languageCode);
      if (localized) {
        const byId = await prisma.contentItem.findFirst({
          where: {
            ...PUBLISHED_WHERE,
            id: localized.entityId,
            contentType: { routePrefix, isEnabled: true },
          },
          include: itemInclude,
        });
        if (byId) return serializeContentItemWithTranslations(byId);
      }
    }

    const row = await prisma.contentItem.findFirst({
      where: {
        ...PUBLISHED_WHERE,
        slug,
        contentType: { routePrefix, isEnabled: true },
      },
      include: itemInclude,
    });
    return row ? serializeContentItemWithTranslations(row) : null;
  },

  async listItemsByTypeSlug(
    typeSlug: string,
    filters?: { collectionSlug?: string; featuredOnly?: boolean; city?: string; offeringType?: string }
  ) {
    const key = listItemsCacheKey(typeSlug, filters);
    return listItemsByTypeSlugRequestCached(key[0], key[1], key[2], key[3], key[4]);
  },

  async listItemsByRoutePrefix(
    routePrefix: string,
    filters?: { collectionSlug?: string; featuredOnly?: boolean }
  ) {
    const type = await this.getTypeByRoutePrefix(routePrefix);
    if (!type) return [];
    return this.listItemsByTypeSlug(type.slug, filters);
  },

  async listCollections(typeSlug: string): Promise<ContentCollectionView[]> {
    return fetchCollectionsForType(typeSlug);
  },

  async resolveRoute(segments: string[], languageCode?: string): Promise<ContentRouteResolution> {
    const [segment, slug] = segments;
    if (!segment) return { kind: "notFound" };

    const contentType = await this.getTypeByRoutePrefix(segment);
    if (!contentType) return { kind: "notFound" };

    if (!slug) {
      const collections = await this.listCollections(contentType.slug);
      return { kind: "list", contentType, collections };
    }

    const item = await this.getItemByRoutePrefixAndSlug(segment, slug, languageCode);
    if (!item) return { kind: "notFound" };
    return { kind: "detail", contentType, item };
  },

  publicPath,
};

export function toLegacyPackageView(item: ContentItemView): LegacyPackageView {
  const attrs = item.attributes;
  const category: ContentCollectionView = item.collection ?? {
    id: "uncategorized",
    slug: "all",
    name: "All",
    nameEn: "All",
    nameAr: "الكل",
  };
  return {
    id: item.id,
    contentItemId: item.id,
    slug: item.slug ?? item.id,
    nameEn: item.titleEn,
    nameAr: item.titleAr,
    excerptEn: item.excerptEn,
    excerptAr: item.excerptAr,
    descriptionEn: item.descriptionEn,
    descriptionAr: item.descriptionAr,
    price: attrs.price ?? 0,
    currency: (attrs.currency as string) ?? "USD",
    duration: Number(attrs.duration ?? 0),
    travelDates: attrs.travelDates ?? [],
    facilitiesEn: attrs.facilitiesEn ?? [],
    facilitiesAr: attrs.facilitiesAr ?? [],
    featuresEn: attrs.featuresEn ?? [],
    featuresAr: attrs.featuresAr ?? [],
    itineraryEn: attrs.itineraryEn ?? [],
    itineraryAr: attrs.itineraryAr ?? [],
    hotelInfoEn: (attrs.hotelInfoEn as string) ?? "",
    hotelInfoAr: (attrs.hotelInfoAr as string) ?? "",
    airlineInfoEn: (attrs.airlineInfoEn as string) ?? "",
    airlineInfoAr: (attrs.airlineInfoAr as string) ?? "",
    isFeatured: item.isFeatured,
    isPublished: true,
    sortOrder: item.sortOrder,
    category,
    images: item.media.map((m) => ({
      id: m.id,
      url: m.url,
      altEn: m.altEn,
      altAr: m.altAr,
      sortOrder: m.sortOrder,
    })),
  };
}

export function toLegacyHotelView(item: ContentItemView): LegacyHotelView {
  const attrs = item.attributes;
  return {
    id: item.id,
    contentItemId: item.id,
    nameEn: item.titleEn,
    nameAr: item.titleAr,
    excerptEn: item.excerptEn,
    excerptAr: item.excerptAr,
    descriptionEn: item.descriptionEn,
    descriptionAr: item.descriptionAr,
    city: (attrs.city as string) ?? "MAKKAH",
    stars: Number(attrs.stars ?? 4),




    imageUrl: item.media[0]?.url ?? null,
    sortOrder: item.sortOrder,
  };
}

export function toLegacyServiceView(item: ContentItemView): LegacyServiceView {
  const attrs = item.attributes;
  return {
    id: item.id,
    contentItemId: item.id,
    slug: item.slug ?? item.id,
    type: (attrs.offeringType as string) ?? "OTHER",
    titleEn: item.titleEn,
    titleAr: item.titleAr,
    excerptEn: item.excerptEn,
    excerptAr: item.excerptAr,
    descriptionEn: item.descriptionEn,
    descriptionAr: item.descriptionAr,
    icon: (attrs.icon as string) ?? "compass",
    imageUrl: item.media[0]?.url ?? null,
    ctaLabelEn: (attrs.ctaLabelEn as string) ?? "",
    ctaLabelAr: (attrs.ctaLabelAr as string) ?? "",
    ctaHref: (attrs.ctaHref as string) ?? "",
    sortOrder: item.sortOrder,
  };
}
