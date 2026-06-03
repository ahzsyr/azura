import type { ContentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { BUILTIN_CONTENT_TYPES } from "@/features/content/content-type.registry";
import type { ContentBlockConfig, ContentCardData } from "@/features/content/types";
import { contentRepository } from "@/features/content/content.repository";
import { TYPE_TO_LEGACY_SOURCE } from "@/features/content/content-type.registry";

export async function ensureBuiltinContentTypes() {
  for (const def of BUILTIN_CONTENT_TYPES) {
    await prisma.contentType.upsert({
      where: { slug: def.slug },
      update: {
        nameEn: def.nameEn,
        nameAr: def.nameAr,
        labelSingularEn: def.labelSingularEn,
        labelSingularAr: def.labelSingularAr,
        labelPluralEn: def.labelPluralEn,
        labelPluralAr: def.labelPluralAr,
        icon: def.icon,
        routePrefix: def.routePrefix,
        fieldSchema: def.fields,
        displaySchema: def.displayDefaults ?? {},
      },
      create: {
        slug: def.slug,
        nameEn: def.nameEn,
        nameAr: def.nameAr,
        labelSingularEn: def.labelSingularEn,
        labelSingularAr: def.labelSingularAr,
        labelPluralEn: def.labelPluralEn,
        labelPluralAr: def.labelPluralAr,
        icon: def.icon,
        routePrefix: def.routePrefix,
        fieldSchema: def.fields,
        displaySchema: def.displayDefaults ?? {},
        sortOrder: BUILTIN_CONTENT_TYPES.indexOf(def),
      },
    });
  }
}

function itemHref(item: ContentCardSourceItem & { contentType?: { slug: string; routePrefix: string | null } }) {
  const typeSlug = item.contentType?.slug;
  const prefix = item.contentType?.routePrefix;
  const legacy = typeSlug ? TYPE_TO_LEGACY_SOURCE[typeSlug] : undefined;

  if (legacy === "packages" && item.slug) return `/packages/${item.slug}`;
  if (legacy === "services" && item.slug) {
    const attrs = item.attributes as Record<string, unknown>;
    if (typeof attrs.ctaHref === "string" && attrs.ctaHref) return attrs.ctaHref;
  }
  if (prefix) return `/${prefix}`;
  return undefined;
}

type ContentCardSourceItem = {
  id: string;
  slug: string | null;
  titleEn: string;
  titleAr: string;
  excerptEn: string;
  excerptAr: string;
  descriptionEn: string;
  descriptionAr: string;
  attributes: unknown;
  isFeatured: boolean;
  featuredImageUrl?: string | null;
  collection?: { id: string; slug: string; nameEn: string; nameAr: string } | null;
  media?: { url: string; altEn: string; altAr: string }[];
  contentType?: { slug: string; routePrefix: string | null };
};

export function serializeContentCard(item: ContentCardSourceItem): ContentCardData {
  const attrs = (item.attributes ?? {}) as Record<string, unknown>;
  const images = item.media?.length
    ? item.media.map((m: { url: string; altEn: string; altAr: string }) => ({ url: m.url, altEn: m.altEn, altAr: m.altAr }))
    : item.featuredImageUrl
      ? [{ url: item.featuredImageUrl, altEn: "", altAr: "" }]
      : [];

  return {
    id: item.id,
    contentTypeSlug: item.contentType?.slug ?? "",
    slug: item.slug,
    titleEn: item.titleEn,
    titleAr: item.titleAr,
    excerptEn: item.excerptEn,
    excerptAr: item.excerptAr,
    descriptionEn: item.descriptionEn,
    descriptionAr: item.descriptionAr,
    attributes: attrs,
    isFeatured: item.isFeatured,
    collection: item.collection
      ? {
          id: item.collection.id,
          slug: item.collection.slug,
          nameEn: item.collection.nameEn,
          nameAr: item.collection.nameAr,
        }
      : undefined,
    href: itemHref(item),
    images,
  };
}

export async function loadContentItems(config: ContentBlockConfig): Promise<ContentCardData[]> {
  const items = await contentRepository.queryForBlock(config);
  const type = config.contentTypeSlug
    ? await prisma.contentType.findUnique({ where: { slug: config.contentTypeSlug } })
    : null;

  return items.map((item: (typeof items)[number]) =>
    serializeContentCard({
      ...item,
      contentType: type ?? undefined,
    })
  );
}

export function isPublished(item: { status: ContentStatus; isVisible: boolean; deletedAt: Date | null }) {
  return item.status === "PUBLISHED" && item.isVisible && !item.deletedAt;
}
