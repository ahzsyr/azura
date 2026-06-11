import type { Prisma } from "@prisma/client";
import type { PageBlocks } from "@/types/builder";
import { prisma } from "@/lib/prisma";
import { resolveEntityByLocalizedSlug } from "@/features/translation/translation-bundle";
import { resolveFieldSchema } from "@/features/content/content-type.registry";
import { ensureContentPlatformReady } from "@/features/content/content.service";
import { createCached, CACHE_TAGS } from "@/services/cache";
import { REVALIDATE } from "@/lib/config/performance";
import { cache } from "react";
import type {
  ContentCollectionView,
  ContentItemView,
  ContentRouteResolution,
  ContentTypeView,
  LegacyHotelView,
  LegacyPackageView,
  LegacyServiceView,
} from "@/features/content/content-public.types";

const PUBLISHED_WHERE: Prisma.ContentItemWhereInput = {
  deletedAt: null,
  isVisible: true,
  status: "PUBLISHED",
};

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

function serializeType(row: {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  routePrefix: string | null;
  fieldSchema: unknown;
  adminConfig: unknown;
}): ContentTypeView {
  return {
    id: row.id,
    slug: row.slug,
    nameEn: row.nameEn,
    nameAr: row.nameAr,
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

export function serializeContentItem(row: {
  id: string;
  slug: string | null;
  titleEn: string;
  titleAr: string;
  excerptEn: string;
  excerptAr: string;
  descriptionEn: string;
  descriptionAr: string;
  attributes: unknown;
  blocks: unknown;
  displaySettings: unknown;
  status: ContentItemView["status"];
  isFeatured: boolean;
  isVisible: boolean;
  sortOrder: number;
  contentType: { slug: string; routePrefix: string | null };
  collection: ContentCollectionView | null;
  media: {
    id: string;
    url: string;
    altEn: string;
    altAr: string;
    captionEn: string;
    captionAr: string;
    sortOrder: number;
    isCover: boolean;
  }[];
  featuredImageUrl?: string | null;
}): ContentItemView {
  const routePrefix = row.contentType.routePrefix;
  const media =
    row.media.length > 0
      ? row.media
      : row.featuredImageUrl
        ? [
            {
              id: "featured",
              url: row.featuredImageUrl,
              altEn: "",
              altAr: "",
              captionEn: "",
              captionAr: "",
              sortOrder: 0,
              isCover: true,
            },
          ]
        : [];

  return {
    id: row.id,
    contentTypeSlug: row.contentType.slug,
    routePrefix,
    slug: row.slug,
    titleEn: row.titleEn,
    titleAr: row.titleAr,
    excerptEn: row.excerptEn,
    excerptAr: row.excerptAr,
    descriptionEn: row.descriptionEn,
    descriptionAr: row.descriptionAr,
    attributes: (row.attributes ?? {}) as Record<string, unknown>,
    blocks: parseBlocks(row.blocks),
    displaySettings: (row.displaySettings ?? {}) as Record<string, unknown>,
    status: row.status,
    isFeatured: row.isFeatured,
    isVisible: row.isVisible,
    sortOrder: row.sortOrder,
    collection: row.collection,
    media,
    href: publicPath(routePrefix, row.slug),
  };
}

const itemInclude = {
  contentType: { select: { slug: true, routePrefix: true, nameEn: true, nameAr: true, fieldSchema: true, adminConfig: true } },
  collection: { select: { id: true, slug: true, nameEn: true, nameAr: true } },
  media: {
    where: { isPublished: true, isHidden: false },
    orderBy: { sortOrder: "asc" as const },
  },
} satisfies Prisma.ContentItemInclude;

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

  let items = rows.map(serializeContentItem);
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
        select: { id: true, slug: true, nameEn: true, nameAr: true },
        orderBy: { sortOrder: "asc" },
      });
    },
    ["content-collections", typeSlug],
    {
      tags: [CACHE_TAGS.contentList(typeSlug), CACHE_TAGS.marketing],
      revalidate: REVALIDATE.packages,
    }
  )();
}

export const contentPublicService = {
  async ensureReady() {
    await ensureContentPlatformReady();
  },

  async getTypeBySlug(typeSlug: string) {
    const row = await prisma.contentType.findFirst({
      where: { slug: typeSlug, isEnabled: true },
    });
    return row ? serializeType(row) : null;
  },

  async getTypeByRoutePrefix(routePrefix: string) {
    const row = await prisma.contentType.findFirst({
      where: { routePrefix, isEnabled: true },
    });
    return row ? serializeType(row) : null;
  },

  async listEnabledTypes() {
    const rows = await prisma.contentType.findMany({
      where: { isEnabled: true },
      orderBy: { sortOrder: "asc" },
    });
    return rows.map(serializeType);
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
    return row ? serializeContentItem(row) : null;
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
        if (byId) return serializeContentItem(byId);
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
    return row ? serializeContentItem(row) : null;
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
  const category = item.collection ?? {
    id: "uncategorized",
    slug: "all",
    nameEn: "General",
    nameAr: "عام",
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
    city: (attrs.city as string) ?? "MAKKAH",
    stars: Number(attrs.stars ?? 4),
    excerptEn: item.excerptEn,
    excerptAr: item.excerptAr,
    descriptionEn: item.descriptionEn,
    descriptionAr: item.descriptionAr,
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
