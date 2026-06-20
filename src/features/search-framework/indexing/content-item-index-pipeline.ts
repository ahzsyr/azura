import "server-only";

import { resolveContentTypeSearchConfig } from "@/features/search-framework/schema/content-type-search-config";
import { resolveSearchIndexProfile } from "@/features/search-framework/indexing/search-index-profile";
import { resolveFieldSchema } from "@/features/content/content-type.registry";
import type { SearchableFieldDefinition } from "@/features/search-framework/schema/search-field-schema";
import { searchIndexComposer } from "@/features/search-framework/indexing/search-index-composer";
import { loadSeoForContentItem, loadSeoBatchForContentItems } from "@/features/search-framework/indexing/seo-index-loader";
import type {
  ComposedSearchIndexPayload,
  ContentItemSearchSource,
} from "@/features/search-framework/indexing/search-index-types";
import type { ContentItemIndexSource } from "@/features/search-framework/providers/builtin-providers";
import type { SearchProviderContext } from "@/features/search-framework/providers/search-provider";
import { translationService } from "@/features/translation/translation.service";
import { toLocalizedRecord } from "@/features/translation/translation-resolver";

export type ContentItemDbShape = {
  id: string;
  slug: string | null;
  attributes: unknown;
  metadata?: unknown;
  blocks?: unknown;
  status: string;
  isVisible: boolean;
  isFeatured?: boolean;
  publishedAt?: Date | string | null;
  contentType: {
    slug: string;
    routePrefix: string | null;
    fieldSchema: unknown;
    adminConfig: unknown;
    isEnabled: boolean;
  };
  collection?: {
    id: string;
    slug: string;
  } | null;
};

export async function dbContentItemToSearchSource(
  item: ContentItemDbShape,
  extras?: { seo?: ContentItemSearchSource["seo"]; searchEnabled?: boolean; searchBoost?: number }
): Promise<ContentItemSearchSource> {
  const [itemTranslations, collectionTranslations] = await Promise.all([
    translationService.getForEntity("ContentItem", item.id),
    item.collection
      ? translationService.getForEntity("ContentCollection", item.collection.id)
      : Promise.resolve([]),
  ]);
  const typeSearch = resolveContentTypeSearchConfig(
    item.contentType.adminConfig,
    item.contentType.isEnabled
  );
  const fieldSchema = resolveFieldSchema(
    { fieldSchema: item.contentType.fieldSchema },
    item.contentType.slug
  ) as SearchableFieldDefinition[];

  const attrs = (item.attributes ?? {}) as Record<string, unknown>;
  const meta = (item.metadata ?? {}) as Record<string, unknown>;

  return {
    id: item.id,
    slug: item.slug,
    title: toLocalizedRecord(itemTranslations, "title"),
    excerpt: toLocalizedRecord(itemTranslations, "excerpt"),
    description: toLocalizedRecord(itemTranslations, "description"),
    attributes: attrs,
    metadata: meta,
    blocks: item.blocks,
    status: item.status,
    isVisible: item.isVisible,
    routePrefix: item.contentType.routePrefix,
    contentTypeSlug: item.contentType.slug,
    fieldSchema: item.contentType.fieldSchema,
    resolvedFieldSchema: fieldSchema,
    adminConfig: item.contentType.adminConfig,
    searchEnabled: extras?.searchEnabled ?? typeSearch.enabled,
    searchBoost: extras?.searchBoost ?? typeSearch.boost,
    indexProfile: resolveSearchIndexProfile(item.contentType.adminConfig, fieldSchema),
    collection: item.collection
      ? {
          id: item.collection.id,
          slug: item.collection.slug,
          name: toLocalizedRecord(collectionTranslations, "name"),
        }
      : null,
    seo: extras?.seo ?? null,
    tags: normalizeTagsFromSource(attrs, meta),
    categories: normalizeCategoriesFromSource(attrs, meta),
    isFeatured: item.isFeatured === true,
    publishedAt: item.publishedAt ?? null,
  };
}

function normalizeTagsFromSource(
  attrs: Record<string, unknown>,
  meta: Record<string, unknown>
): string[] {
  const raw = [attrs.tags, meta.tags].filter(Boolean);
  const out = new Set<string>();
  for (const r of raw) {
    if (Array.isArray(r)) r.forEach((t) => out.add(String(t)));
    else if (typeof r === "string")
      r.split(/[,;|]/).forEach((t) => out.add(t.trim()));
  }
  return [...out].filter(Boolean);
}

function normalizeCategoriesFromSource(
  attrs: Record<string, unknown>,
  meta: Record<string, unknown>
): string[] {
  const out = new Set<string>();
  for (const r of [attrs.categories, attrs.category, meta.categories]) {
    if (Array.isArray(r)) r.forEach((t) => out.add(String(t)));
    else if (typeof r === "string" && r) out.add(r);
  }
  return [...out].filter(Boolean);
}

export async function enrichContentItemSearchSource(
  source: ContentItemSearchSource
): Promise<ContentItemSearchSource> {
  if (!source.seo) {
    source.seo = await loadSeoForContentItem(source.id);
  }
  return source;
}

export async function composeContentItemForLocale(
  source: ContentItemSearchSource,
  providerContext: SearchProviderContext
): Promise<ContentItemIndexSource> {
  const enriched = await enrichContentItemSearchSource(source);
  const composed = await searchIndexComposer.composeContentItem(enriched, providerContext);
  return { ...enriched, composed };
}

export async function loadSeoMapForItems(
  itemIds: string[]
): Promise<Map<string, ContentItemSearchSource["seo"]>> {
  return loadSeoBatchForContentItems(itemIds);
}

export type { ComposedSearchIndexPayload };
