import "server-only";

import { SearchEntityType } from "@prisma/client";
import { cmsRepository } from "@/repositories/cms.repository";
import { loadContentItems } from "@/features/content/content-data.service";
import { resolveRelatedForBlock } from "@/features/builder/blocks/commerce/product-blocks/lib/resolve-related-for-block";
import type { relatedContentPropsSchema } from "@/features/builder/blocks/discovery/schemas/discovery-blocks";
import type { DiscoveryAnchorContext, DiscoveryItem } from "./recently-viewed.types";
import type { z } from "zod";
import { entityTypeBadge } from "@/features/builder/blocks/discovery/lib/entity-labels";
import { loadTranslationsMap, localizedFieldValue } from "@/features/translation/bilingual-serialize";
import { FALLBACK_LOCALES, resolvePrefixToCode } from "@/i18n/locale-config";
import { resolveTranslation } from "@/features/translation/translation-resolver";
import { publicLocalePath } from "@/i18n/url-helpers";
import { localeService } from "@/features/i18n/locale.service";
import { resolveLocaleCandidates } from "@/i18n/locale-resolution";
import { translationService } from "@/features/translation/translation.service";
import { getCmsPagePublicPath } from "@/features/cms/cms-page-path";

type RelatedConfig = z.infer<typeof relatedContentPropsSchema>;

type PostLike = { id: string; slug: string; featuredImage?: { url: string } | null };

async function resolveLocalizedEntitySlug(
  entityType: "Post" | "CmsPage" | "ContentItem",
  entityId: string,
  localeCode: string,
  fallbackSlug: string,
): Promise<string> {
  try {
    const enabled = await localeService.listEnabled();
    const defaultCode = enabled.find((locale) => locale.isDefault)?.code ?? "en";
    const candidates = resolveLocaleCandidates(localeCode, enabled, defaultCode);
    for (const candidate of candidates) {
      const slug = await translationService.getLocalizedSlug(
        entityType,
        entityId,
        candidate,
        "",
      );
      if (slug?.trim()) return slug.trim();
    }
  } catch {
    /* fall through */
  }
  return fallbackSlug;
}

async function mapPostsToDiscovery(
  posts: PostLike[],
  localePrefix: string,
  localeCode: string,
): Promise<DiscoveryItem[]> {
  const translations = await loadTranslationsMap(
    "Post",
    posts.map((p) => p.id),
  );
  const enabled = await localeService.listEnabled().catch(() => FALLBACK_LOCALES);
  const defaultCode = enabled.find((locale) => locale.isDefault)?.code ?? "en";

  return Promise.all(
    posts.map(async (p) => {
      const translationContext = {
        translations: translations.get(p.id) ?? [],
        enabledLocales: enabled,
        defaultCode,
      };
      const title =
        resolveTranslation("title", localeCode, translationContext) ||
        localizedFieldValue(translations.get(p.id) ?? [], "title") ||
        p.slug;
      const localizedSlug = await resolveLocalizedEntitySlug("Post", p.id, localeCode, p.slug);
      return {
        id: `post-${p.id}`,
        entityType: SearchEntityType.POST,
        entityId: p.id,
        title,
        urlPath: publicLocalePath(localePrefix, `/blog/${localizedSlug}`),
        imageUrl: p.featuredImage?.url ?? undefined,
        badge: entityTypeBadge(SearchEntityType.POST, localePrefix),
      };
    }),
  );
}

function productToDiscovery(
  records: Awaited<ReturnType<typeof resolveRelatedForBlock>>,
  localePrefix: string,
): DiscoveryItem[] {
  return records.map((r) => ({
    id: `product-${r.slug}`,
    entityType: SearchEntityType.CATALOG_PRODUCT,
    entityId: r.slug,
    title: r.name,
    urlPath: publicLocalePath(localePrefix, `/products/${r.slug}`),
    imageUrl: r.primary_image,
    badge: entityTypeBadge(SearchEntityType.CATALOG_PRODUCT, localePrefix),
  }));
}

export async function resolveRelatedContent(
  localePrefix: string,
  config: RelatedConfig,
  anchor?: DiscoveryAnchorContext | null,
): Promise<DiscoveryItem[]> {
  const enabled = await localeService.listEnabled().catch(() => FALLBACK_LOCALES);
  const localeCode = resolvePrefixToCode(localePrefix, enabled);
  const defaultCode = enabled.find((locale) => locale.isDefault)?.code ?? "en";
  const limit = Math.min(24, Math.max(1, config.limit ?? 6));
  const types = config.entityTypes;
  const activeAnchor: DiscoveryAnchorContext | null =
    config.rule === "anchor" && config.anchorContext !== "page"
      ? {
          context: config.anchorContext,
          id: config.anchorId.trim() || (anchor?.context === config.anchorContext ? anchor.id : undefined),
          slug: config.anchorSlug.trim() || (anchor?.context === config.anchorContext ? anchor.slug : undefined),
          categorySlugs: anchor?.context === config.anchorContext ? anchor.categorySlugs : undefined,
          tags: anchor?.context === config.anchorContext ? anchor.tags : undefined,
          collectionSlug: anchor?.context === config.anchorContext ? anchor.collectionSlug : undefined,
          contentTypeSlug: anchor?.context === config.anchorContext ? anchor.contentTypeSlug : undefined,
        }
      : anchor ?? null;

  const buckets: DiscoveryItem[][] = [];

  for (const entityType of types) {
    const remaining = limit;

    if (entityType === SearchEntityType.CATALOG_PRODUCT) {
      const anchorSlug =
        config.rule === "anchor"
          ? config.anchorSlug.trim() ||
            (activeAnchor?.context === "product" ? activeAnchor.slug : undefined) ||
            ""
          : "";
      const collectionSlugs = config.collectionSlugs.length
        ? config.collectionSlugs
        : config.collectionSlug ? [config.collectionSlug] : [];
      const productRule = config.rule === "manual"
        ? "manual"
        : config.rule === "anchor" && anchorSlug
          ? "anchor"
          : collectionSlugs.length
            ? "collection"
            : config.tags.length ? "tags" : "collection";
      const productSlugs = config.manualItems
        .filter((m) => m.entityType === SearchEntityType.CATALOG_PRODUCT)
        .map((m) => m.entityId);
      const recordsByCollection = productRule === "collection" && collectionSlugs.length
        ? await Promise.all(collectionSlugs.map((collectionSlug) => resolveRelatedForBlock(localePrefix, {
            rule: productRule,
            anchorSlug,
            collectionSlug,
            brand: "",
            tags: config.tags,
            productSlugs,
            limit: remaining,
          })))
        : [await resolveRelatedForBlock(localePrefix, {
            rule: productRule,
            anchorSlug,
            collectionSlug: collectionSlugs[0] ?? "",
            brand: "",
            tags: config.tags,
            productSlugs,
            limit: remaining,
          })];
      const seenProducts = new Set<string>();
      const records = recordsByCollection.flat().filter((record) => {
        if (seenProducts.has(record.slug)) return false;
        seenProducts.add(record.slug);
        return true;
      }).slice(0, remaining);
      buckets.push(productToDiscovery(records, localePrefix));
      continue;
    }

    if (entityType === SearchEntityType.POST) {
      const items = await resolveRelatedPosts(localePrefix, localeCode, config, activeAnchor, remaining);
      buckets.push(items);
      continue;
    }

    if (entityType === SearchEntityType.CONTENT_ITEM) {
      const items = await resolveRelatedContentItems(localePrefix, localeCode, config, activeAnchor, remaining);
      buckets.push(items);
      continue;
    }

    if (entityType === SearchEntityType.CMS_PAGE && config.rule === "manual") {
      const manuals = config.manualItems.filter(
        (m) => m.entityType === SearchEntityType.CMS_PAGE,
      );
      const pages = (
        await Promise.all(
          manuals.map((m) => cmsRepository.getPageBySlug(m.entityId, true).catch(() => null)),
        )
      ).filter((p): p is NonNullable<typeof p> => Boolean(p));
      const translations = await loadTranslationsMap(
        "CmsPage",
        pages.map((p) => p.id),
      );
      for (const page of pages) {
        const translationContext = {
          translations: translations.get(page.id) ?? [],
          enabledLocales: enabled,
          defaultCode,
        };
        const title =
          resolveTranslation("title", localeCode, translationContext) ||
          resolveTranslation("title", defaultCode, translationContext);
        const localizedSlug = await resolveLocalizedEntitySlug(
          "CmsPage",
          page.id,
          localeCode,
          page.slug,
        );
        const canonicalPath = getCmsPagePublicPath(page.slug);
        const publicPath = canonicalPath.startsWith("/pages/")
          ? `/pages/${localizedSlug}`
          : canonicalPath;
        buckets[types.indexOf(entityType)] ??= [];
        buckets[types.indexOf(entityType)].push({
          id: `page-${page.id}`,
          entityType: SearchEntityType.CMS_PAGE,
          entityId: page.id,
          title: title || page.slug,
          urlPath: publicLocalePath(localePrefix, publicPath),
          badge: entityTypeBadge(SearchEntityType.CMS_PAGE, localePrefix),
        });
      }
    }
  }

  // Interleave per-type results so the first configured entity does not fill the whole block.
  const out: DiscoveryItem[] = [];
  const seen = new Set<string>();
  for (let index = 0; out.length < limit; index += 1) {
    let found = false;
    for (const bucket of buckets) {
      const item = bucket?.[index];
      if (!item) continue;
      found = true;
      const itemAnchorContext = item.entityType === SearchEntityType.CATALOG_PRODUCT ? "product"
        : item.entityType === SearchEntityType.POST ? "post"
          : item.entityType === SearchEntityType.CONTENT_ITEM ? "contentItem" : "page";
      const current = config.excludeCurrentItem !== false && (
        (activeAnchor?.context === itemAnchorContext && activeAnchor.id && item.entityId === activeAnchor.id) ||
        (activeAnchor?.context === itemAnchorContext && activeAnchor.slug && item.entityId === activeAnchor.slug)
      );
      if (current || seen.has(item.id)) continue;
      seen.add(item.id);
      out.push(item);
      if (out.length >= limit) break;
    }
    if (!found) break;
  }
  return out;
}

async function resolveRelatedPosts(
  localePrefix: string,
  localeCode: string,
  config: RelatedConfig,
  anchor: DiscoveryAnchorContext | null | undefined,
  limit: number,
): Promise<DiscoveryItem[]> {
  if (config.rule === "manual") {
    const ids = config.manualItems
      .filter((m) => m.entityType === SearchEntityType.POST)
      .map((m) => m.entityId);
    const posts = await Promise.all(
      ids.map((id) => cmsRepository.getPostById(id).catch(() => null)),
    );
    const published = posts
      .filter((p) => p && p.status === "PUBLISHED")
      .slice(0, limit) as NonNullable<(typeof posts)[number]>[];
    return mapPostsToDiscovery(published, localePrefix, localeCode);
  }

  if (config.rule === "anchor" && anchor?.context === "post" && anchor.id) {
    const related = await cmsRepository.getRelatedPosts(anchor.id, limit);
    return mapPostsToDiscovery(related, localePrefix, localeCode);
  }

  const categorySlug = config.categorySlugs[0] ?? anchor?.categorySlugs?.[0];
  const posts = await cmsRepository.listPublishedPosts(categorySlug);
  const tagSet = new Set(config.tags.map((t) => t.toLowerCase()));
  const filtered =
    tagSet.size > 0
      ? posts.filter((p) => p.tags.some((t) => tagSet.has(t.tag.slug.toLowerCase())))
      : posts;

  const excludeId = config.excludeCurrentItem !== false && anchor?.context === "post" ? anchor.id : undefined;
  const slice = filtered.filter((p) => p.id !== excludeId).slice(0, limit);
  return mapPostsToDiscovery(slice, localePrefix, localeCode);
}

async function resolveRelatedContentItems(
  localePrefix: string,
  localeCode: string,
  config: RelatedConfig,
  anchor: DiscoveryAnchorContext | null,
  limit: number,
): Promise<DiscoveryItem[]> {
  const slug = config.contentTypeSlug.trim() || anchor?.contentTypeSlug || "catalog-items";
  const collectionSlugs = config.collectionSlugs.length
    ? config.collectionSlugs
    : config.collectionSlug ? [config.collectionSlug] : anchor?.collectionSlug ? [anchor.collectionSlug] : [];
  const collections = collectionSlugs.length ? collectionSlugs : [undefined];
  const itemsByCollection = await Promise.all(collections.map((collectionSlug) => loadContentItems({
    contentTypeSlug: slug,
    collectionSlug,
    limit: limit * 2,
  })));
  const uniqueItems = new Map(itemsByCollection.flat().map((item) => [item.id, item]));
  const items = [...uniqueItems.values()];

  if (config.rule === "manual") {
    const ids = new Set(
      config.manualItems
        .filter((m) => m.entityType === SearchEntityType.CONTENT_ITEM)
        .map((m) => m.entityId),
    );
    return Promise.all(
      items
        .filter((i) => ids.has(i.id))
        .slice(0, limit)
        .map((i) => contentItemToDiscovery(i, localePrefix, localeCode)),
    );
  }

  const catSet = new Set((config.categorySlugs.length ? config.categorySlugs : anchor?.categorySlugs ?? []).map((c) => c.toLowerCase()));
  const filtered =
    catSet.size > 0
      ? items.filter((i) => {
          const cats = (i.attributes?.categories as string[] | undefined) ?? [];
          return cats.some((c) => catSet.has(String(c).toLowerCase()));
        })
      : items;

  const related = config.excludeCurrentItem !== false && anchor?.context === "contentItem"
    ? filtered.filter((item) => item.id !== anchor.id && item.slug !== anchor.slug)
    : filtered;
  return Promise.all(related.slice(0, limit).map((i) => contentItemToDiscovery(i, localePrefix, localeCode)));
}

async function contentItemToDiscovery(
  item: { id: string; slug?: string | null; title?: string; attributes?: Record<string, unknown> },
  localePrefix: string,
  localeCode: string,
): Promise<DiscoveryItem> {
  const fallbackSlug = item.slug ?? item.id;
  const localizedSlug = await resolveLocalizedEntitySlug(
    "ContentItem",
    item.id,
    localeCode,
    fallbackSlug,
  );
  const title =
    (item.title as string) ||
    (item.attributes?.name as string) ||
    fallbackSlug;
  const image =
    (item.attributes?.image as string) ||
    (item.attributes?.thumbnail as string) ||
    undefined;
  return {
    id: `content-${item.id}`,
    entityType: SearchEntityType.CONTENT_ITEM,
    entityId: item.id,
    title: String(title),
    urlPath: publicLocalePath(localePrefix, `/content/${localizedSlug}`),
    imageUrl: image,
    badge: entityTypeBadge(SearchEntityType.CONTENT_ITEM, localePrefix),
  };
}
