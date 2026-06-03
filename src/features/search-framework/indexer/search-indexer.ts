import { prisma } from "@/lib/prisma";
import type { Prisma, SearchEntityType } from "@prisma/client";
import { forEachIndexerLocale } from "@/i18n/indexer-locales";
import { revalidateSearch } from "@/services/cache";
import { contentPublicService } from "@/features/content/content-public.service";
import { adminPathFor } from "@/features/search/constants";
import { resolveContentTypeSearchConfig } from "@/features/search-framework/schema/content-type-search-config";
import { syncCatalogSearchIndexes } from "@/features/search-framework/indexer/catalog-index-sync";
import {
  cmsPageSearchProvider,
  contentItemSearchProvider,
  faqSearchProvider,
  mediaSearchProvider,
  postSearchProvider,
  testimonialSearchProvider,
  type FaqIndexSource,
} from "@/features/search-framework/providers/builtin-providers";
import {
  composeContentItemForLocale,
  dbContentItemToSearchSource,
  enrichContentItemSearchSource,
  type ContentItemDbShape,
} from "@/features/search-framework/indexing/content-item-index-pipeline";
import type { ContentItemSearchSource } from "@/features/search-framework/indexing/search-index-types";
import type { SearchIndexRecord } from "@/features/search-framework/types";
import { getSearchPerformanceConfig } from "@/features/search-framework/performance/search-performance-config";
import {
  buildIndexExcerpt,
  truncateIndexBody,
} from "@/features/search-framework/performance/index-body-truncate";
import { runWithConcurrency } from "@/features/search-framework/performance/index-concurrency";
import { clearSearchQueryCache } from "@/features/search-framework/performance/search-query-cache";
import {
  normalizeIndexRecord,
  validateIndexRecord,
} from "@/features/search-framework/indexer/validate-index-record";
import { rebuildFromDiscovery, type RebuildResult } from "@/features/search-framework/indexer/rebuild-from-discovery";

export type UpsertRecordOptions = {
  /** When false, skips cache tag revalidation (bulk rebuild). Default true. */
  revalidate?: boolean;
};

export class SearchIndexer {
  async upsertRecord(record: SearchIndexRecord, options?: UpsertRecordOptions) {
    const normalized = normalizeIndexRecord(record);
    validateIndexRecord(normalized);

    const perf = getSearchPerformanceConfig();
    const body = truncateIndexBody(normalized.body, perf.indexBodyMaxChars);
    const indexExcerpt = buildIndexExcerpt(body);

    const adminPath =
      (typeof normalized.metadata.adminPath === "string" && normalized.metadata.adminPath) ||
      adminPathFor(normalized.entityType, normalized.entityId, normalized.metadata);

    const { entityType: _stripEntityType, ...metaRest } = normalized.metadata as Record<
      string,
      unknown
    > & { entityType?: unknown };

    const metadata = {
      ...metaRest,
      kind: normalized.kind,
      contentTypeSlug: normalized.contentTypeSlug,
      facets: normalized.facets,
      searchBoost: normalized.boost,
      visibility: normalized.visibility,
      indexExcerpt,
      adminPath,
    };

    await prisma.searchDocument.upsert({
      where: {
        entityType_entityId_locale: {
          entityType: normalized.entityType,
          entityId: normalized.entityId,
          locale: normalized.locale,
        },
      },
      create: {
        entityType: normalized.entityType,
        entityId: normalized.entityId,
        locale: normalized.locale,
        title: normalized.title,
        body,
        urlPath: normalized.urlPath,
        metadata: metadata as Prisma.InputJsonValue,
      },
      update: {
        title: normalized.title,
        body,
        urlPath: normalized.urlPath,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
    if (options?.revalidate !== false) {
      revalidateSearch();
      clearSearchQueryCache();
    }
  }

  async upsertRecords(records: SearchIndexRecord[], options?: UpsertRecordOptions) {
    for (const record of records) {
      await this.upsertRecord(record, { revalidate: false, ...options });
    }
    if (options?.revalidate !== false) {
      revalidateSearch();
      clearSearchQueryCache();
    }
  }

  async remove(entityType: SearchEntityType, entityId: string) {
    await prisma.searchDocument.deleteMany({ where: { entityType, entityId } });
    revalidateSearch();
  }

  async indexContentItem(
    item: ContentItemDbShape | ContentItemSearchSource,
    options?: UpsertRecordOptions
  ) {
    const source =
      "contentType" in item && (item as ContentItemDbShape).contentType
        ? dbContentItemToSearchSource(item as ContentItemDbShape)
        : (item as ContentItemSearchSource);

    const ok = contentItemSearchProvider.shouldIndex(source);
    if (!ok) {
      await this.remove("CONTENT_ITEM", source.id);
      return;
    }
    const enriched = await enrichContentItemSearchSource(source);
    await forEachIndexerLocale(async ({ urlPrefix, code }) => {
      const withCompose = await composeContentItemForLocale(enriched, {
        urlPrefix,
        code,
      });
      const records = contentItemSearchProvider.buildRecords(withCompose, {
        urlPrefix,
        code,
      });
      for (const record of records) {
        await this.upsertRecord(record, { revalidate: false, ...options });
      }
    });
    if (options?.revalidate !== false) {
      revalidateSearch();
      clearSearchQueryCache();
    }
  }

  /** @deprecated Use indexFaqSource */
  async indexFaqItem(
    faq: FaqIndexSource["faq"],
    faqSetSlug: string,
    options?: UpsertRecordOptions
  ) {
    return this.indexFaqSource({ faq, faqSetSlug }, options);
  }

  /** Index a FAQ using the canonical provider source shape. */
  async indexFaqSource(source: FaqIndexSource, options?: UpsertRecordOptions) {
    if (!faqSearchProvider.shouldIndex(source)) {
      await this.remove("FAQ", source.faq.id);
      return;
    }
    await forEachIndexerLocale(async ({ urlPrefix, code }) => {
      for (const record of faqSearchProvider.buildRecords(source, {
        urlPrefix,
        code,
      })) {
        await this.upsertRecord(record, { revalidate: false });
      }
    });
    if (options?.revalidate !== false) {
      revalidateSearch();
      clearSearchQueryCache();
    }
  }

  async indexTestimonial(
    t: {
      id: string;
      name: string;
      contentEn: string;
      contentAr: string;
      isPublished?: boolean;
    },
    options?: UpsertRecordOptions
  ) {
    if (!testimonialSearchProvider.shouldIndex(t)) {
      await this.remove("TESTIMONIAL", t.id);
      return;
    }
    await forEachIndexerLocale(async ({ urlPrefix, code }) => {
      for (const record of testimonialSearchProvider.buildRecords(t, {
        urlPrefix,
        code,
      })) {
        await this.upsertRecord(record, { revalidate: false });
      }
    });
    if (options?.revalidate !== false) {
      revalidateSearch();
      clearSearchQueryCache();
    }
  }

  async indexCmsPage(
    page: {
      id: string;
      slug: string;
      titleEn: string;
      titleAr: string;
      excerptEn: string | null;
      excerptAr: string | null;
      status?: string;
    },
    options?: UpsertRecordOptions
  ) {
    if (!cmsPageSearchProvider.shouldIndex(page)) {
      await this.remove("CMS_PAGE", page.id);
      return;
    }
    await forEachIndexerLocale(async ({ urlPrefix, code }) => {
      for (const record of cmsPageSearchProvider.buildRecords(page, {
        urlPrefix,
        code,
      })) {
        await this.upsertRecord(record, { revalidate: false });
      }
    });
    if (options?.revalidate !== false) {
      revalidateSearch();
      clearSearchQueryCache();
    }
  }

  async indexPost(
    post: {
      id: string;
      slug: string;
      titleEn: string;
      titleAr: string;
      excerptEn: string | null;
      excerptAr: string | null;
      contentEn: string | null;
      contentAr: string | null;
      status?: string;
    },
    options?: UpsertRecordOptions
  ) {
    if (!postSearchProvider.shouldIndex(post)) {
      await this.remove("POST", post.id);
      return;
    }
    await forEachIndexerLocale(async ({ urlPrefix, code }) => {
      for (const record of postSearchProvider.buildRecords(post, {
        urlPrefix,
        code,
      })) {
        await this.upsertRecord(record, { revalidate: false });
      }
    });
    if (options?.revalidate !== false) {
      revalidateSearch();
      clearSearchQueryCache();
    }
  }

  async indexMedia(
    asset: { id: string; filename: string; altEn: string; altAr: string },
    options?: UpsertRecordOptions
  ) {
    await forEachIndexerLocale(async ({ urlPrefix, code }) => {
      for (const record of mediaSearchProvider.buildRecords(asset, {
        urlPrefix,
        code,
      })) {
        await this.upsertRecord(record, { revalidate: false });
      }
    });
    if (options?.revalidate !== false) {
      revalidateSearch();
      clearSearchQueryCache();
    }
  }

  async rebuildAll(): Promise<RebuildResult> {
    const result = await rebuildFromDiscovery(this);
    revalidateSearch();
    clearSearchQueryCache();
    return result;
  }

  /** Sync JSON catalog (products, collections, categories) into SearchDocument. */
  async syncCatalogIndexes() {
    await syncCatalogSearchIndexes(this);
    revalidateSearch();
    clearSearchQueryCache();
  }

  async reindexContentType(typeId: string) {
    const type = await prisma.contentType.findUnique({ where: { id: typeId } });
    if (!type) return;
    const search = resolveContentTypeSearchConfig(type.adminConfig, type.isEnabled);
    if (!search.enabled) {
      await prisma.searchDocument.deleteMany({
        where: { entityType: "CONTENT_TYPE", entityId: typeId },
      });
      const itemIds = await prisma.contentItem.findMany({
        where: { contentTypeId: typeId },
        select: { id: true },
      });
      if (itemIds.length) {
        await prisma.searchDocument.deleteMany({
          where: {
            entityType: "CONTENT_ITEM",
            entityId: { in: itemIds.map((i) => i.id) },
          },
        });
      }
      return;
    }
    const discovered = {
      id: type.id,
      slug: type.slug,
      nameEn: type.nameEn,
      nameAr: type.nameAr,
      labelPluralEn: type.labelPluralEn,
      labelPluralAr: type.labelPluralAr,
      routePrefix: type.routePrefix,
      icon: type.icon,
      search,
    };
    const { contentTypeLandingSearchProvider } = await import(
      "@/features/search-framework/providers/catalog-providers"
    );
    const { forEachIndexerLocale } = await import("@/i18n/indexer-locales");
    if (contentTypeLandingSearchProvider.shouldIndex(discovered)) {
      await forEachIndexerLocale(async ({ urlPrefix, code }) => {
        for (const record of contentTypeLandingSearchProvider.buildRecords(discovered, {
          urlPrefix,
          code,
        })) {
          await this.upsertRecord(record, { revalidate: false });
        }
      });
    }
    const items = await prisma.contentItem.findMany({
      where: { contentTypeId: typeId, deletedAt: null, status: "PUBLISHED", isVisible: true },
      include: {
        contentType: {
          select: { slug: true, routePrefix: true, fieldSchema: true, adminConfig: true, isEnabled: true },
        },
        collection: { select: { id: true, slug: true, nameEn: true, nameAr: true } },
      },
    });
    const perf = getSearchPerformanceConfig();
    await runWithConcurrency(
      items,
      async (item) => {
        await this.indexContentItem({
          ...item,
          attributes: item.attributes,
          metadata: item.metadata,
          blocks: item.blocks,
          contentType: item.contentType,
          collection: item.collection,
        } as ContentItemDbShape);
      },
      perf.indexConcurrency
    );
    revalidateSearch();
    clearSearchQueryCache();
  }
}

export const frameworkSearchIndexer = new SearchIndexer();
