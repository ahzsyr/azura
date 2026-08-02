import { prisma } from "@/lib/prisma";
import type { Prisma, SearchEntityType } from "@prisma/client";
import { forEachIndexerLocale } from "@/i18n/indexer-locales";
import { revalidateSearch } from "@/services/cache";
import { contentPublicService } from "@/features/content/content-public.service";
import { adminPathFor } from "@/capabilities/search/constants";
import { resolveContentTypeSearchConfig } from "@/capabilities/search/engine/schema/content-type-search-config";
import { syncCatalogSearchIndexes } from "@/capabilities/search/engine/indexer/catalog-index-sync";
import {
  cmsPageSearchProvider,
  contentItemSearchProvider,
  faqSearchProvider,
  mediaSearchProvider,
  postSearchProvider,
  testimonialSearchProvider,
  type FaqIndexSource,
} from "@/capabilities/search/engine/providers/builtin-providers";
import {
  teamMemberSearchProvider,
  partnerSearchProvider,
} from "@/capabilities/search/engine/providers/portal-providers";
import {
  composeContentItemForLocale,
  dbContentItemToSearchSource,
  enrichContentItemSearchSource,
  type ContentItemDbShape,
} from "@/capabilities/search/engine/indexing/content-item-index-pipeline";
import type { ContentItemSearchSource } from "@/capabilities/search/engine/indexing/search-index-types";
import type { SearchIndexRecord } from "@/capabilities/search/engine/types";
import { getSearchPerformanceConfig } from "@/capabilities/search/engine/performance/search-performance-config";
import {
  buildIndexExcerpt,
  truncateIndexBody,
} from "@/capabilities/search/engine/performance/index-body-truncate";
import { runWithConcurrency } from "@/capabilities/search/engine/performance/index-concurrency";
import { clearSearchQueryCache } from "@/capabilities/search/engine/performance/search-query-cache";
import { clearMaterializedAutocomplete } from "@/capabilities/search/service/autocomplete-index";
import {
  normalizeIndexRecord,
  validateIndexRecord,
} from "@/capabilities/search/engine/indexer/validate-index-record";
import { rebuildFromDiscovery, type RebuildResult } from "@/capabilities/search/engine/indexer/rebuild-from-discovery";
import { withLocalizedSearchFields } from "@/capabilities/search/engine/indexing/search-localized-source";
import type { LocalizedValueMap } from "@/features/translation/types";

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
      clearMaterializedAutocomplete();
    }
  }

  async upsertRecords(records: SearchIndexRecord[], options?: UpsertRecordOptions) {
    const perf = getSearchPerformanceConfig();
    await runWithConcurrency(
      records,
      async (record) => {
        await this.upsertRecord(record, { ...options, revalidate: false });
      },
      perf.indexConcurrency,
    );
    if (options?.revalidate !== false) {
      revalidateSearch();
      clearSearchQueryCache();
      clearMaterializedAutocomplete();
    }
  }

  async remove(entityType: SearchEntityType, entityId: string, options?: UpsertRecordOptions) {
    await prisma.searchDocument.deleteMany({ where: { entityType, entityId } });
    if (options?.revalidate !== false) {
      revalidateSearch();
    }
  }

  async indexContentItem(
    item: ContentItemDbShape | ContentItemSearchSource,
    options?: UpsertRecordOptions
  ) {
    const source =
      "contentType" in item && (item as ContentItemDbShape).contentType
        ? await dbContentItemToSearchSource(item as ContentItemDbShape)
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
      clearMaterializedAutocomplete();
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
  async indexFaqSource(
    source:
      | FaqIndexSource
      | {
          faq: {
            id: string;
            isPublished?: boolean;
            question?: import("@/features/translation/types").LocalizedValueMap;
            answer?: import("@/features/translation/types").LocalizedValueMap;
          };
          faqSetSlug: string;
        },
    options?: UpsertRecordOptions
  ) {
    const localized =
      "question" in source.faq
        ? source
        : {
            faq: await withLocalizedSearchFields("FaqItem", source.faq, ["question", "answer"]),
            faqSetSlug: source.faqSetSlug,
          };
    const normalized: FaqIndexSource = {
      faq: {
        id: localized.faq.id,
        isPublished: localized.faq.isPublished,
        question: (localized.faq.question ?? {}) as LocalizedValueMap,
        answer: (localized.faq.answer ?? {}) as LocalizedValueMap,
      },
      faqSetSlug: localized.faqSetSlug,
    };
    if (!faqSearchProvider.shouldIndex(normalized)) {
      await this.remove("FAQ", normalized.faq.id);
      return;
    }
    await forEachIndexerLocale(async ({ urlPrefix, code }) => {
      for (const record of faqSearchProvider.buildRecords(normalized, {
        urlPrefix,
        code,
      })) {
        await this.upsertRecord(record, { revalidate: false });
      }
    });
    if (options?.revalidate !== false) {
      revalidateSearch();
      clearSearchQueryCache();
      clearMaterializedAutocomplete();
    }
  }

  async indexTestimonial(
    t: {
      id: string;
      name: string;
      isPublished?: boolean;
      quote?: import("@/features/translation/types").LocalizedValueMap;
    },
    options?: UpsertRecordOptions
  ) {
    const localized = await withLocalizedSearchFields("Testimonial", t, ["quote"]);
    const normalized = {
      ...localized,
      quote: (localized.quote ?? {}) as LocalizedValueMap,
    };
    if (!testimonialSearchProvider.shouldIndex(normalized)) {
      await this.remove("TESTIMONIAL", t.id);
      return;
    }
    await forEachIndexerLocale(async ({ urlPrefix, code }) => {
      for (const record of testimonialSearchProvider.buildRecords(normalized, {
        urlPrefix,
        code,
      })) {
        await this.upsertRecord(record, { revalidate: false });
      }
    });
    if (options?.revalidate !== false) {
      revalidateSearch();
      clearSearchQueryCache();
      clearMaterializedAutocomplete();
    }
  }

  async indexCmsPage(
    page: {
      id: string;
      slug: string;
      status?: string;
    },
    options?: UpsertRecordOptions
  ) {
    const localized = await withLocalizedSearchFields("CmsPage", page, [
      "title",
      "excerpt",
      "description",
    ]);
    const normalized = {
      ...localized,
      title: (localized.title ?? {}) as LocalizedValueMap,
    };
    if (!cmsPageSearchProvider.shouldIndex(normalized)) {
      await this.remove("CMS_PAGE", page.id);
      return;
    }
    await forEachIndexerLocale(async ({ urlPrefix, code }) => {
      for (const record of cmsPageSearchProvider.buildRecords(normalized, {
        urlPrefix,
        code,
      })) {
        await this.upsertRecord(record, { revalidate: false });
      }
    });
    if (options?.revalidate !== false) {
      revalidateSearch();
      clearSearchQueryCache();
      clearMaterializedAutocomplete();
    }
  }

  async indexPost(
    post: {
      id: string;
      slug: string;
      status?: string;
    },
    options?: UpsertRecordOptions
  ) {
    const localized = await withLocalizedSearchFields("Post", post, [
      "title",
      "excerpt",
      "featuredImageAlt",
      "featuredImageCaption",
    ]);
    const normalized = {
      ...localized,
      title: (localized.title ?? {}) as LocalizedValueMap,
    };
    if (!postSearchProvider.shouldIndex(normalized)) {
      await this.remove("POST", post.id);
      return;
    }
    await forEachIndexerLocale(async ({ urlPrefix, code }) => {
      for (const record of postSearchProvider.buildRecords(normalized, {
        urlPrefix,
        code,
      })) {
        await this.upsertRecord(record, { revalidate: false });
      }
    });
    if (options?.revalidate !== false) {
      revalidateSearch();
      clearSearchQueryCache();
      clearMaterializedAutocomplete();
    }
  }

  async indexMedia(
    asset: { id: string; filename: string; alt?: import("@/features/translation/types").LocalizedValueMap },
    options?: UpsertRecordOptions
  ) {
    const localized = await withLocalizedSearchFields("MediaAsset", asset, ["alt"]);
    const normalized = {
      ...localized,
      alt: (localized.alt ?? {}) as LocalizedValueMap,
    };
    await forEachIndexerLocale(async ({ urlPrefix, code }) => {
      for (const record of mediaSearchProvider.buildRecords(normalized, {
        urlPrefix,
        code,
      })) {
        await this.upsertRecord(record, { revalidate: false });
      }
    });
    if (options?.revalidate !== false) {
      revalidateSearch();
      clearSearchQueryCache();
      clearMaterializedAutocomplete();
    }
  }

  async indexTeamMember(
    member: {
      id: string;
      directoryId: string;
      directorySlug: string;
      departmentId?: string | null;
      email?: string;
      phone?: string;
      skills?: unknown;
      imageUrl?: string;
      isPublished?: boolean;
    },
    options?: UpsertRecordOptions
  ) {
    const localized = await withLocalizedSearchFields("TeamMember", member, [
      "name",
      "role",
      "bio",
      "location",
    ]);
    const normalized = {
      ...localized,
      directorySlug: member.directorySlug,
      skills: Array.isArray(member.skills) ? member.skills : [],
      name: (localized.name ?? {}) as LocalizedValueMap,
      role: (localized.role ?? {}) as LocalizedValueMap,
      bio: (localized.bio ?? {}) as LocalizedValueMap,
      location: (localized.location ?? {}) as LocalizedValueMap,
    };
    if (!teamMemberSearchProvider.shouldIndex(normalized)) {
      await this.remove("TEAM_MEMBER", member.id);
      return;
    }
    await forEachIndexerLocale(async ({ urlPrefix, code }) => {
      for (const record of teamMemberSearchProvider.buildRecords(normalized, {
        urlPrefix,
        code,
      })) {
        await this.upsertRecord(record, { revalidate: false });
      }
    });
    if (options?.revalidate !== false) {
      revalidateSearch();
      clearSearchQueryCache();
      clearMaterializedAutocomplete();
    }
  }

  async indexPartner(
    partner: {
      id: string;
      programId: string;
      programSlug: string;
      categoryId?: string | null;
      categorySlug?: string | null;
      logoUrl?: string;
      websiteUrl?: string;
      profileUrl?: string;
      email?: string;
      phone?: string;
      certifications?: unknown;
      isPublished?: boolean;
    },
    options?: UpsertRecordOptions
  ) {
    const localized = await withLocalizedSearchFields("Partner", partner, [
      "name",
      "description",
      "location",
    ]);
    const normalized = {
      ...localized,
      programSlug: partner.programSlug,
      categorySlug: partner.categorySlug ?? null,
      certifications: Array.isArray(partner.certifications) ? partner.certifications : [],
      name: (localized.name ?? {}) as LocalizedValueMap,
      description: (localized.description ?? {}) as LocalizedValueMap,
      location: (localized.location ?? {}) as LocalizedValueMap,
    };
    if (!partnerSearchProvider.shouldIndex(normalized)) {
      await this.remove("PARTNER", partner.id);
      return;
    }
    await forEachIndexerLocale(async ({ urlPrefix, code }) => {
      for (const record of partnerSearchProvider.buildRecords(normalized, {
        urlPrefix,
        code,
      })) {
        await this.upsertRecord(record, { revalidate: false });
      }
    });
    if (options?.revalidate !== false) {
      revalidateSearch();
      clearSearchQueryCache();
      clearMaterializedAutocomplete();
    }
  }

  async rebuildAll(): Promise<RebuildResult> {
    const result = await rebuildFromDiscovery(this);
    revalidateSearch();
    clearSearchQueryCache();
    clearMaterializedAutocomplete();
    return result;
  }

  /** Sync JSON catalog (products, collections, categories) into SearchDocument. */
  async syncCatalogIndexes() {
    await syncCatalogSearchIndexes(this);
    revalidateSearch();
    clearSearchQueryCache();
    clearMaterializedAutocomplete();
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
    const { localizedField, loadBundleForRefs } = await import(
      "@/features/portal/lib/portal-translation"
    );
    const bundle = await loadBundleForRefs([{ entityType: "ContentType", entityId: type.id }]);
    const discovered = {
      id: type.id,
      slug: type.slug,
      name: localizedField(bundle, "ContentType", type.id, "name"),
      labelPlural: localizedField(bundle, "ContentType", type.id, "labelPlural"),
      routePrefix: type.routePrefix,
      icon: type.icon,
      search,
    };
    const { contentTypeLandingSearchProvider } = await import(
      "@/capabilities/search/engine/providers/catalog-providers"
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
        collection: { select: { id: true, slug: true } },
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
    clearMaterializedAutocomplete();
  }
}

export const frameworkSearchIndexer = new SearchIndexer();
