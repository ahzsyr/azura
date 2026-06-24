import type { ContentStatus, EntityTranslation } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { BUILTIN_CONTENT_TYPES } from "@/features/content/content-type.registry";
import type { ContentBlockConfig, ContentCardData } from "@/features/content/types";
import { contentRepository } from "@/features/content/content.repository";
import { TYPE_TO_LEGACY_SOURCE } from "@/features/content/content-type.registry";
import { resolveTranslation } from "@/features/translation/translation-resolver";
import { FALLBACK_LOCALES } from "@/i18n/locale-config";

const BUILTIN_SLUGS = BUILTIN_CONTENT_TYPES.map((d) => d.slug);
const DEFAULT_LOCALE_CODE = FALLBACK_LOCALES.find((locale) => locale.isDefault)?.code ?? "en";

let ensureBuiltinInflight: Promise<void> | null = null;

async function syncMissingBuiltinContentTypes() {
  const existing = await prisma.contentType.findMany({
    where: { slug: { in: BUILTIN_SLUGS } },
    select: { slug: true },
  });
  const have = new Set(existing.map((row) => row.slug));
  const missing = BUILTIN_CONTENT_TYPES.filter((def) => !have.has(def.slug));
  if (missing.length === 0) return;

  for (const def of missing) {
    await prisma.contentType.create({
      data: {
        slug: def.slug,
        icon: def.icon,
        routePrefix: def.routePrefix,
        fieldSchema: def.fields,
        displaySchema: def.displayDefaults ?? {},
        adminConfig: (def.adminConfig ?? {}) as Prisma.InputJsonValue,
        sortOrder: BUILTIN_CONTENT_TYPES.indexOf(def),
      },
    });
  }
}

/** Ensures built-in types exist once per process; avoids per-request upserts that slow every page. */
export async function ensureBuiltinContentTypes() {
  if (!ensureBuiltinInflight) {
    ensureBuiltinInflight = syncMissingBuiltinContentTypes().catch((err) => {
      ensureBuiltinInflight = null;
      throw err;
    });
  }
  await ensureBuiltinInflight;
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
  attributes: unknown;
  isFeatured: boolean;
  featuredImageUrl?: string | null;
  collection?: { id: string; slug: string } | null;
  media?: { url: string }[];
  contentType?: { slug: string; routePrefix: string | null };
};

export function serializeContentCard(
  item: ContentCardSourceItem,
  translations: EntityTranslation[] = [],
  collectionTranslations: EntityTranslation[] = []
): ContentCardData {
  const ctx = { translations };
  const collectionCtx = { translations: collectionTranslations };
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
  const collectionNameEn = resolveTranslation("name", "en", collectionCtx);
  const collectionNameAr = resolveTranslation("name", "ar", collectionCtx);
  const collectionName =
    resolveTranslation("name", DEFAULT_LOCALE_CODE, collectionCtx) ||
    collectionNameEn ||
    collectionNameAr;
  const attrs = (item.attributes ?? {}) as Record<string, unknown>;
  const images = item.media?.length
    ? item.media.map((m) => ({ url: m.url, altEn: "", altAr: "" }))
    : item.featuredImageUrl
      ? [{ url: item.featuredImageUrl, altEn: "", altAr: "" }]
      : [];

  return {
    id: item.id,
    contentTypeSlug: item.contentType?.slug ?? "",
    slug: item.slug,
    title,
    excerpt,
    description,
    titleEn,
    titleAr,
    excerptEn,
    excerptAr,
    descriptionEn,
    descriptionAr,
    attributes: attrs,
    isFeatured: item.isFeatured,
    collection: item.collection
      ? {
          id: item.collection.id,
          slug: item.collection.slug,
          name: collectionName,
          nameEn: collectionNameEn,
          nameAr: collectionNameAr,
        }
      : undefined,
    href: itemHref(item),
    images: images.map((image) => ({
      ...image,
      alt: image.altEn || image.altAr || "",
    })),
  };
}

export async function loadContentItems(config: ContentBlockConfig): Promise<ContentCardData[]> {
  const items = await contentRepository.queryForBlock(config);
  const type = config.contentTypeSlug
    ? await prisma.contentType.findUnique({ where: { slug: config.contentTypeSlug } })
    : null;

  const itemIds = items.map((i) => i.id);
  const collectionIds = [...new Set(items.map((i) => i.collectionId).filter(Boolean))] as string[];
  const translations = itemIds.length
    ? await prisma.entityTranslation.findMany({
        where: {
          OR: [
            { entityType: "ContentItem", entityId: { in: itemIds } },
            { entityType: "ContentCollection", entityId: { in: collectionIds } },
          ],
        },
      })
    : [];

  const byItem = new Map<string, EntityTranslation[]>();
  const byCollection = new Map<string, EntityTranslation[]>();
  for (const row of translations) {
    const map = row.entityType === "ContentCollection" ? byCollection : byItem;
    const list = map.get(row.entityId) ?? [];
    list.push(row);
    map.set(row.entityId, list);
  }

  return items.map((item: (typeof items)[number]) =>
    serializeContentCard(
      { ...item, contentType: type ?? undefined },
      byItem.get(item.id) ?? [],
      item.collectionId ? byCollection.get(item.collectionId) ?? [] : []
    )
  );
}

export function isPublished(item: { status: ContentStatus; isVisible: boolean; deletedAt: Date | null }) {
  return item.status === "PUBLISHED" && item.isVisible && !item.deletedAt;
}
