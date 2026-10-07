import "server-only";

import { prisma } from "@/lib/prisma";
import { loadContentItems } from "@/features/content/content-data.service";
import type { ContentCardData } from "@/features/content/types";
import type { relatedContentPropsSchema } from "@/features/builder/blocks/discovery/schemas/discovery-blocks";
import type { DiscoveryAnchorContext } from "./recently-viewed.types";
import type { z } from "zod";
import { FALLBACK_LOCALES, resolvePrefixToCode } from "@/i18n/locale-config";
import { localeService } from "@/features/i18n/locale.service";
import { resolveLocaleCandidates } from "@/i18n/locale-resolution";
import { translationService } from "@/features/translation/translation.service";
import {
  excludeCurrentRelatedContentItem,
  filterRelatedContentByTaxonomy,
  relatedContentItemPath,
} from "@/features/builder/blocks/discovery/lib/related-content-helpers";

type RelatedConfig = z.infer<typeof relatedContentPropsSchema>;

async function resolveLocalizedContentSlug(
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
        "ContentItem",
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

function collectionSlugsFromConfig(
  config: RelatedConfig,
  anchor?: DiscoveryAnchorContext | null,
): string[] {
  if (config.collectionSlugs.length) return config.collectionSlugs;
  if (config.collectionSlug.trim()) return [config.collectionSlug.trim()];
  if (anchor?.collectionSlug?.trim()) return [anchor.collectionSlug.trim()];
  return [];
}

async function applyLocalizedHrefs(
  items: ContentCardData[],
  contentTypeSlug: string,
  localeCode: string,
): Promise<ContentCardData[]> {
  const type = contentTypeSlug
    ? await prisma.contentType.findUnique({
        where: { slug: contentTypeSlug },
        select: { slug: true, routePrefix: true },
      })
    : null;

  return Promise.all(
    items.map(async (item) => {
      const typeSlug = item.contentTypeSlug || type?.slug || contentTypeSlug;
      const fallbackSlug = item.slug ?? item.id;
      const localizedSlug = await resolveLocalizedContentSlug(item.id, localeCode, fallbackSlug);
      const path = relatedContentItemPath(type?.routePrefix, typeSlug, localizedSlug);
      return {
        ...item,
        slug: localizedSlug,
        href: path ?? item.href,
      };
    }),
  );
}

async function resolveManualContentIds(
  keys: string[],
  contentTypeSlug?: string,
): Promise<string[]> {
  const trimmed = keys.map((key) => key.trim()).filter(Boolean);
  if (!trimmed.length) return [];

  const type = contentTypeSlug?.trim()
    ? await prisma.contentType.findUnique({
        where: { slug: contentTypeSlug.trim() },
        select: { id: true },
      })
    : null;

  const rows = await prisma.contentItem.findMany({
    where: {
      deletedAt: null,
      isVisible: true,
      status: "PUBLISHED",
      ...(type ? { contentTypeId: type.id } : {}),
      OR: [{ id: { in: trimmed } }, { slug: { in: trimmed } }],
    },
    select: { id: true, slug: true },
  });

  const byId = new Map(rows.map((row) => [row.id, row.id]));
  const bySlug = new Map(rows.map((row) => [row.slug ?? "", row.id]));
  const ordered: string[] = [];
  const seen = new Set<string>();
  for (const key of trimmed) {
    const id = byId.get(key) ?? bySlug.get(key);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ordered.push(id);
  }
  return ordered;
}

async function loadCardsForCollections(
  contentTypeSlug: string,
  collectionSlugs: string[],
  limit: number,
  manualIds?: string[],
): Promise<ContentCardData[]> {
  if (manualIds?.length) {
    return loadContentItems({
      contentTypeSlug,
      manualIds,
      limit,
    });
  }

  const collections = collectionSlugs.length ? collectionSlugs : [undefined];
  const batches = await Promise.all(
    collections.map((collectionSlug) =>
      loadContentItems({
        contentTypeSlug,
        collectionSlug,
        limit: limit * 2,
      }),
    ),
  );
  const unique = new Map<string, ContentCardData>();
  for (const item of batches.flat()) {
    if (!unique.has(item.id)) unique.set(item.id, item);
  }
  return [...unique.values()];
}

function filterByTaxonomy(
  items: ContentCardData[],
  config: RelatedConfig,
  anchor?: DiscoveryAnchorContext | null,
): ContentCardData[] {
  const categorySlugs = config.categorySlugs.length
    ? config.categorySlugs
    : (anchor?.categorySlugs ?? []);
  const tags = config.tags.length ? config.tags : (anchor?.tags ?? []);
  return filterRelatedContentByTaxonomy(items, categorySlugs, tags);
}

function excludeCurrent(
  items: ContentCardData[],
  config: RelatedConfig,
  anchor?: DiscoveryAnchorContext | null,
): ContentCardData[] {
  return excludeCurrentRelatedContentItem(items, config.excludeCurrentItem !== false, anchor);
}

/**
 * Resolve Related Content cards. Always returns content items only.
 * `entityTypes` on the config is ignored (retained only for legacy saved props).
 */
export async function resolveRelatedContent(
  localePrefix: string,
  config: RelatedConfig,
  anchor?: DiscoveryAnchorContext | null,
): Promise<ContentCardData[]> {
  const enabled = await localeService.listEnabled().catch(() => FALLBACK_LOCALES);
  const localeCode = resolvePrefixToCode(localePrefix, enabled);
  const limit = Math.min(24, Math.max(1, config.limit ?? 6));

  const activeAnchor: DiscoveryAnchorContext | null =
    config.rule === "anchor" && config.anchorContext !== "page"
      ? {
          context: config.anchorContext === "contentItem" ? "contentItem" : "page",
          id:
            config.anchorId.trim() ||
            (anchor?.context === "contentItem" ? anchor.id : undefined),
          slug:
            config.anchorSlug.trim() ||
            (anchor?.context === "contentItem" ? anchor.slug : undefined),
          categorySlugs: anchor?.context === "contentItem" ? anchor.categorySlugs : undefined,
          tags: anchor?.context === "contentItem" ? anchor.tags : undefined,
          collectionSlug: anchor?.context === "contentItem" ? anchor.collectionSlug : undefined,
          contentTypeSlug: anchor?.context === "contentItem" ? anchor.contentTypeSlug : undefined,
        }
      : (anchor ?? null);

  if (config.rule === "manual") {
    const keys = config.manualItems.map((item) => item.entityId).filter(Boolean);
    const contentTypeSlug =
      config.contentTypeSlug.trim() || activeAnchor?.contentTypeSlug?.trim() || "";
    const manualIds = await resolveManualContentIds(keys, contentTypeSlug || undefined);
    if (!manualIds.length) return [];

    // Prefer selected type when set; otherwise resolve across types via IDs already filtered.
    const typeSlug =
      contentTypeSlug ||
      (
        await prisma.contentItem.findFirst({
          where: { id: manualIds[0] },
          select: { contentType: { select: { slug: true } } },
        })
      )?.contentType?.slug ||
      "";
    if (!typeSlug) return [];

    const cards = await loadCardsForCollections(typeSlug, [], limit, manualIds);
    return applyLocalizedHrefs(cards.slice(0, limit), typeSlug, localeCode);
  }

  const contentTypeSlug =
    config.contentTypeSlug.trim() ||
    (activeAnchor?.context === "contentItem" ? activeAnchor.contentTypeSlug?.trim() : "") ||
    "";
  if (!contentTypeSlug) return [];

  if (config.rule === "anchor") {
    const context = activeAnchor?.context === "contentItem" ? activeAnchor : null;
    if (!context) return [];
    const collectionSlugs = collectionSlugsFromConfig(config, context);
    const cards = await loadCardsForCollections(contentTypeSlug, collectionSlugs, limit);
    const filtered = excludeCurrent(filterByTaxonomy(cards, config, context), config, context);
    return applyLocalizedHrefs(filtered.slice(0, limit), contentTypeSlug, localeCode);
  }

  // Taxonomy (default)
  const collectionSlugs = collectionSlugsFromConfig(config, activeAnchor);
  const cards = await loadCardsForCollections(contentTypeSlug, collectionSlugs, limit);
  const filtered = excludeCurrent(
    filterByTaxonomy(cards, config, activeAnchor),
    config,
    activeAnchor,
  );
  return applyLocalizedHrefs(filtered.slice(0, limit), contentTypeSlug, localeCode);
}
