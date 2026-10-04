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
  const types =
    config.entityTypes.length > 0
      ? config.entityTypes
      : [
          SearchEntityType.CATALOG_PRODUCT,
          SearchEntityType.POST,
          SearchEntityType.CONTENT_ITEM,
        ];

  const out: DiscoveryItem[] = [];

  for (const entityType of types) {
    if (out.length >= limit) break;
    const remaining = limit - out.length;

    if (entityType === SearchEntityType.CATALOG_PRODUCT) {
      const anchorSlug =
        config.rule === "anchor"
          ? config.anchorSlug.trim() ||
            (anchor?.context === "product" ? anchor.slug : undefined) ||
            ""
          : "";
      const records = await resolveRelatedForBlock(localePrefix, {
        rule:
          config.rule === "manual"
            ? "manual"
            : config.rule === "anchor" && anchorSlug
              ? "anchor"
              : config.collectionSlug
                ? "collection"
                : config.tags.length
                  ? "tags"
                  : "collection",
        anchorSlug,
        collectionSlug: config.collectionSlug,
        brand: "",
        tags: config.tags,
        productSlugs: config.manualItems
          .filter((m) => m.entityType === SearchEntityType.CATALOG_PRODUCT)
          .map((m) => m.entityId),
        limit: remaining,
      });
      out.push(...productToDiscovery(records, localePrefix));
      continue;
    }

    if (entityType === SearchEntityType.POST) {
      const items = await resolveRelatedPosts(localePrefix, localeCode, config, anchor, remaining);
      out.push(...items);
      continue;
    }

    if (entityType === SearchEntityType.CONTENT_ITEM) {
      const items = await resolveRelatedContentItems(localePrefix, localeCode, config, remaining);
      out.push(...items);
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
        if (out.length >= limit) break;
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
        out.push({
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

  return out.slice(0, limit);
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

  const excludeId = anchor?.context === "post" ? anchor.id : undefined;
  const slice = filtered.filter((p) => p.id !== excludeId).slice(0, limit);
  return mapPostsToDiscovery(slice, localePrefix, localeCode);
}

async function resolveRelatedContentItems(
  localePrefix: string,
  localeCode: string,
  config: RelatedConfig,
  limit: number,
): Promise<DiscoveryItem[]> {
  const slug = config.contentTypeSlug.trim() || "catalog-items";
  const items = await loadContentItems({
    contentTypeSlug: slug,
    collectionSlug: config.collectionSlug || undefined,
    limit: limit * 2,
  });

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

  const catSet = new Set(config.categorySlugs.map((c) => c.toLowerCase()));
  const filtered =
    catSet.size > 0
      ? items.filter((i) => {
          const cats = (i.attributes?.categories as string[] | undefined) ?? [];
          return cats.some((c) => catSet.has(String(c).toLowerCase()));
        })
      : items;

  return Promise.all(
    filtered.slice(0, limit).map((i) => contentItemToDiscovery(i, localePrefix, localeCode)),
  );
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
