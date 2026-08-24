import "server-only";

import type { SearchEntityType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCmsPagePublicPath } from "@/features/cms/cms-page-path";
import { catalogEntityId } from "@/capabilities/search/engine/providers/catalog-providers";
import { discoverCatalogSearchSources } from "@/capabilities/search/engine/discovery/catalog-search-discovery";
import { loadListingRecords } from "@/features/products/index/product-index-loader";
import { collectionsDataService } from "@/features/collections/collections-data.service";
import { isProductPublishedForSearch } from "@/features/products/lib/product-publish-status";
import {
  contentCollectionSearchPath,
  contentItemSearchPath,
  contentTypeSearchPath,
  isAdminSearchUrlPath,
  normalizeSearchPublicPath,
} from "@/capabilities/search/lib/search-public-path";
import { firstCmsBlockTitle } from "@/capabilities/search/lib/cms-page-index-text";
import { isPackagesContentTypeSlug } from "@/capabilities/search/settings/search-sources";
import { translationService } from "@/features/translation/translation.service";
import { toLocalizedRecord } from "@/features/translation/translation-resolver";
import { getLocalizedField } from "@/lib/utils";
import {
  countCatalogItemPublicDuplicates,
  type IndexedContentItemRow,
} from "@/capabilities/search/engine/indexer/search-index-consistency-checks";

type ConsistencyIssue = {
  level: "error" | "warn";
  code: string;
  message: string;
};

export type ExpectedSearchDoc = {
  key: string;
  entityType: SearchEntityType;
  entityId: string;
  locale: string;
  urlPath?: string;
  visibility: "public" | "admin";
  expectedTitle?: string;
  expectedContentTypeSlug?: string;
};

function docKey(entityType: string, entityId: string, locale: string): string {
  return `${entityType}:${entityId}:${locale}`;
}

function localizedTitle(
  map: Record<string, string>,
  urlPrefix: string
): string {
  return getLocalizedField({ title: map }, "title", urlPrefix).trim();
}

export async function collectExpectedSearchDocuments(): Promise<ExpectedSearchDoc[]> {
  const discovery = await discoverCatalogSearchSources();
  const locales = discovery.indexerLocales;
  const src = discovery.sources;
  const expected: ExpectedSearchDoc[] = [];

  const push = (
    entityType: SearchEntityType,
    entityId: string,
    locale: string,
    extras?: Partial<
      Pick<ExpectedSearchDoc, "urlPath" | "visibility" | "expectedTitle" | "expectedContentTypeSlug">
    >
  ) => {
    expected.push({
      key: docKey(entityType, entityId, locale),
      entityType,
      entityId,
      locale,
      visibility: extras?.visibility ?? "public",
      urlPath: extras?.urlPath,
      expectedTitle: extras?.expectedTitle,
      expectedContentTypeSlug: extras?.expectedContentTypeSlug,
    });
  };

  const enabledTypeIds = [...discovery.enabledContentTypeIds];
  const [contentItems, pages, posts, faqs, testimonials] = await Promise.all([
    enabledTypeIds.length
      ? prisma.contentItem.findMany({
          where: {
            deletedAt: null,
            status: "PUBLISHED",
            isVisible: true,
            contentTypeId: { in: enabledTypeIds },
          },
          select: {
            id: true,
            slug: true,
            contentType: { select: { slug: true, routePrefix: true } },
          },
        })
      : Promise.resolve([]),
    src.pages
      ? prisma.cmsPage.findMany({
          where: { status: "PUBLISHED" },
          select: { id: true, slug: true, blocks: true },
        })
      : Promise.resolve([]),
    src.posts
      ? prisma.post.findMany({
          where: { status: "PUBLISHED" },
          select: { id: true, slug: true },
        })
      : Promise.resolve([]),
    src.faqs
      ? prisma.faqItem.findMany({
          where: { isPublished: true, faqSet: { isPublished: true } },
          select: { id: true, faqSet: { select: { slug: true } } },
        })
      : Promise.resolve([]),
    src.testimonials
      ? prisma.testimonial.findMany({
          where: { isPublished: true },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  const contentItemIds = contentItems.map((item) => item.id);
  const pageIds = pages.map((page) => page.id);
  const postIds = posts.map((post) => post.id);
  const faqIds = faqs.map((faq) => faq.id);

  const [itemTitleMaps, pageTitleMaps, postTitleMaps, faqTitleMaps] = await Promise.all([
    contentItemIds.length
      ? translationService.getForEntities("ContentItem", contentItemIds)
      : Promise.resolve(new Map()),
    pageIds.length
      ? translationService.getForEntities("CmsPage", pageIds)
      : Promise.resolve(new Map()),
    postIds.length
      ? translationService.getForEntities("Post", postIds)
      : Promise.resolve(new Map()),
    faqIds.length
      ? translationService.getForEntities("FaqItem", faqIds)
      : Promise.resolve(new Map()),
  ]);

  for (const { urlPrefix } of locales) {
    for (const item of contentItems) {
      const titleMap = toLocalizedRecord(itemTitleMaps.get(item.id) ?? [], "title");
      push("CONTENT_ITEM", item.id, urlPrefix, {
        urlPath: contentItemSearchPath(
          urlPrefix,
          item.contentType.routePrefix,
          item.contentType.slug,
          item.slug
        ),
        expectedTitle: localizedTitle(titleMap, urlPrefix) || undefined,
        expectedContentTypeSlug: item.contentType.slug,
      });
    }
    if (src.contentTypeLandings) {
      for (const type of discovery.contentTypes) {
        if (type.search.indexLandingPage === false) continue;
        push("CONTENT_TYPE", type.id, urlPrefix, {
          urlPath: contentTypeSearchPath(urlPrefix, type.routePrefix, type.slug),
          expectedContentTypeSlug: type.slug,
        });
      }
    }
    for (const col of discovery.contentCollections) {
      const type = discovery.contentTypes.find((t) => t.id === col.contentTypeId);
      push("CONTENT_COLLECTION", col.id, urlPrefix, {
        urlPath: contentCollectionSearchPath(
          urlPrefix,
          type?.routePrefix ?? col.contentTypeSlug,
          col.slug,
          col.contentTypeSlug
        ),
        expectedContentTypeSlug: col.contentTypeSlug,
      });
    }
    for (const page of pages) {
      const titleMap = toLocalizedRecord(pageTitleMaps.get(page.id) ?? [], "title");
      const fromBlocks = firstCmsBlockTitle(page.blocks, urlPrefix);
      push("CMS_PAGE", page.id, urlPrefix, {
        urlPath: `/${urlPrefix}${getCmsPagePublicPath(page.slug)}`,
        expectedTitle: localizedTitle(titleMap, urlPrefix) || fromBlocks || undefined,
      });
    }
    for (const post of posts) {
      const titleMap = toLocalizedRecord(postTitleMaps.get(post.id) ?? [], "title");
      push("POST", post.id, urlPrefix, {
        urlPath: `/${urlPrefix}/blog/${post.slug}`,
        expectedTitle: localizedTitle(titleMap, urlPrefix) || undefined,
      });
    }
    for (const faq of faqs) {
      const questionMap = toLocalizedRecord(faqTitleMaps.get(faq.id) ?? [], "question");
      push("FAQ", faq.id, urlPrefix, {
        urlPath: `/${urlPrefix}/faq/${faq.faqSet.slug}`,
        expectedTitle:
          getLocalizedField({ question: questionMap }, "question", urlPrefix).trim() || undefined,
      });
    }
    for (const t of testimonials) {
      push("TESTIMONIAL", t.id, urlPrefix, {
        urlPath: `/${urlPrefix}/testimonials`,
        expectedTitle: t.name || undefined,
      });
    }
    if (discovery.siteCatalog.products) {
      const records = await loadListingRecords(urlPrefix);
      for (const record of records) {
        if (!isProductPublishedForSearch(record.status)) continue;
        push("CATALOG_PRODUCT", catalogEntityId("product", record.slug), urlPrefix, {
          urlPath: `/${urlPrefix}/products/${record.slug}`,
          expectedTitle: record.name || undefined,
        });
      }
    }
    if (discovery.siteCatalog.collections) {
      const cols = await collectionsDataService.loadAll({ localePrefix: urlPrefix });
      for (const col of cols) {
        if (col.visible === false) continue;
        push("CATALOG_COLLECTION", catalogEntityId("pcol", col.slug), urlPrefix, {
          urlPath: `/${urlPrefix}/categories/${col.slug}`,
          expectedTitle: col.name || undefined,
        });
      }
    }
    if (discovery.siteCatalog.categories) {
      const records = await loadListingRecords(urlPrefix);
      const seen = new Set<string>();
      for (const record of records) {
        for (const cat of record.categories ?? []) {
          if (!cat || seen.has(cat)) continue;
          seen.add(cat);
          push("CATALOG_CATEGORY", catalogEntityId("pcat", cat), urlPrefix, {
            urlPath: `/${urlPrefix}/products?category=${encodeURIComponent(cat)}`,
          });
        }
      }
    }
  }

  return expected;
}

export type SearchIndexConsistencyReport = {
  generatedAt: string;
  errors: ConsistencyIssue[];
  warnings: ConsistencyIssue[];
  staleCatalogDocs: number;
  staleDocs: number;
  missingDocs: number;
  missingPages: number;
  missingContentItems: number;
  adminUrlOnPublicDocs: number;
  urlMismatches: number;
  contentTypeSlugMismatches: number;
  titleMismatches: number;
  catalogItemPublicDuplicates: number;
};

export async function validateFullSearchIndexConsistency(): Promise<SearchIndexConsistencyReport> {
  const errors: ConsistencyIssue[] = [];
  const warnings: ConsistencyIssue[] = [];
  let staleDocs = 0;
  let staleCatalogDocs = 0;
  let missingDocs = 0;
  let missingPages = 0;
  let missingContentItems = 0;
  let adminUrlOnPublicDocs = 0;
  let urlMismatches = 0;
  let contentTypeSlugMismatches = 0;
  let titleMismatches = 0;
  let catalogItemPublicDuplicates = 0;

  try {
    const expected = await collectExpectedSearchDocuments();
    const expectedByKey = new Map(expected.map((doc) => [doc.key, doc]));
    const checkedTypes = [
      ...new Set<SearchEntityType>([
        "CONTENT_ITEM",
        "CONTENT_TYPE",
        "CONTENT_COLLECTION",
        "CMS_PAGE",
        "POST",
        "FAQ",
        "TESTIMONIAL",
        "CATALOG_PRODUCT",
        "CATALOG_COLLECTION",
        "CATALOG_CATEGORY",
        ...expected.map((doc) => doc.entityType),
      ]),
    ];

    const existing = checkedTypes.length
      ? await prisma.searchDocument.findMany({
          where: { entityType: { in: checkedTypes } },
          select: {
            entityType: true,
            entityId: true,
            locale: true,
            urlPath: true,
            title: true,
            metadata: true,
          },
        })
      : [];

    const indexedContentItems: IndexedContentItemRow[] = [];
    const indexedByKey = new Map<string, IndexedContentItemRow & { title: string }>();
    const existingKeys = new Set<string>();

    for (const row of existing) {
      const key = docKey(row.entityType, row.entityId, row.locale);
      existingKeys.add(key);
      const meta = (row.metadata ?? {}) as Record<string, unknown>;
      const contentTypeSlug =
        typeof meta.contentTypeSlug === "string" ? meta.contentTypeSlug : undefined;
      const indexedRow = {
        entityId: row.entityId,
        locale: row.locale,
        title: row.title,
        urlPath: row.urlPath,
        contentTypeSlug,
      };
      indexedByKey.set(key, indexedRow);
      if (row.entityType === "CONTENT_ITEM") {
        indexedContentItems.push(indexedRow);
      }

      const isAdmin =
        row.entityType === "MEDIA" ||
        row.entityType === "ICON" ||
        meta.adminOnly === true ||
        meta.visibility === "admin";
      if (!isAdmin && isAdminSearchUrlPath(row.urlPath)) {
        adminUrlOnPublicDocs += 1;
      }

      const want = expectedByKey.get(key);
      if (!want) {
        staleDocs += 1;
        if (
          row.entityType === "CATALOG_PRODUCT" ||
          row.entityType === "CATALOG_COLLECTION" ||
          row.entityType === "CATALOG_CATEGORY"
        ) {
          staleCatalogDocs += 1;
        }
        continue;
      }
      if (
        want.urlPath &&
        normalizeSearchPublicPath(row.urlPath) !== normalizeSearchPublicPath(want.urlPath)
      ) {
        urlMismatches += 1;
      }
      if (
        want.expectedContentTypeSlug &&
        contentTypeSlug &&
        contentTypeSlug !== want.expectedContentTypeSlug
      ) {
        contentTypeSlugMismatches += 1;
      }
      if (want.expectedTitle && want.expectedTitle.trim()) {
        const liveNorm = want.expectedTitle.trim().toLowerCase().replace(/\s+/g, " ");
        const indexedNorm = row.title.trim().toLowerCase().replace(/\s+/g, " ");
        if (liveNorm && indexedNorm !== liveNorm) {
          titleMismatches += 1;
        }
      }
    }

    for (const doc of expected) {
      if (existingKeys.has(doc.key)) continue;
      missingDocs += 1;
      if (doc.entityType === "CMS_PAGE") missingPages += 1;
      if (doc.entityType === "CONTENT_ITEM") missingContentItems += 1;
    }

    const preferredDocs: Array<{ title: string; urlPath: string; locale: string }> = [];

    for (const doc of expected) {
      if (
        doc.entityType === "CONTENT_ITEM" &&
        doc.expectedContentTypeSlug &&
        !isPackagesContentTypeSlug(doc.expectedContentTypeSlug)
      ) {
        preferredDocs.push({
          title: doc.expectedTitle ?? "",
          urlPath: doc.urlPath ?? "",
          locale: doc.locale,
        });
      }
      if (doc.entityType === "CMS_PAGE") {
        preferredDocs.push({
          title: doc.expectedTitle ?? "",
          urlPath: doc.urlPath ?? "",
          locale: doc.locale,
        });
      }
    }

    catalogItemPublicDuplicates = countCatalogItemPublicDuplicates({
      catalogItemDocs: indexedContentItems.filter((doc) =>
        isPackagesContentTypeSlug(doc.contentTypeSlug ?? "")
      ),
      preferredDocs,
    });

    if (missingPages > 0) {
      warnings.push({
        level: "warn",
        code: "MISSING_CMS_PAGES",
        message: `${missingPages} published page(s) are not in the search index — run Rebuild index`,
      });
    }
    if (missingContentItems > 0) {
      warnings.push({
        level: "warn",
        code: "MISSING_CONTENT_ITEMS",
        message: `${missingContentItems} published content item(s) are not in the search index — run Rebuild index`,
      });
    }
    if (missingDocs > missingPages + missingContentItems) {
      warnings.push({
        level: "warn",
        code: "MISSING_SEARCH_DOCS",
        message: `${missingDocs} expected search document(s) are missing`,
      });
    }
    if (staleDocs > 0) {
      warnings.push({
        level: "warn",
        code: "STALE_SEARCH_DOCS",
        message: `${staleDocs} stale SearchDocument row(s) — run validate with fix or Rebuild index`,
      });
    }
    if (adminUrlOnPublicDocs > 0) {
      warnings.push({
        level: "warn",
        code: "ADMIN_URL_IN_PUBLIC_INDEX",
        message: `${adminUrlOnPublicDocs} public search document(s) point at /admin — rebuild to refresh URLs`,
      });
    }
    if (urlMismatches > 0) {
      warnings.push({
        level: "warn",
        code: "SEARCH_URL_MISMATCH",
        message: `${urlMismatches} indexed URL(s) do not match the live public path — run Rebuild index`,
      });
    }
    if (contentTypeSlugMismatches > 0) {
      warnings.push({
        level: "warn",
        code: "CONTENT_TYPE_SLUG_MISMATCH",
        message: `${contentTypeSlugMismatches} search document(s) have the wrong content type slug — run Rebuild index`,
      });
    }
    if (titleMismatches > 0) {
      warnings.push({
        level: "warn",
        code: "SEARCH_TITLE_MISMATCH",
        message: `${titleMismatches} indexed title(s) do not match live content — run Rebuild index`,
      });
    }
    if (catalogItemPublicDuplicates > 0) {
      warnings.push({
        level: "warn",
        code: "CATALOG_ITEM_PUBLIC_DUPLICATE",
        message: `${catalogItemPublicDuplicates} Catalog item hit(s) duplicate a public service/page — run Rebuild index`,
      });
    }
  } catch (e) {
    errors.push({
      level: "error",
      code: "SEARCH_VALIDATE_FAILED",
      message: e instanceof Error ? e.message : String(e),
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    errors,
    warnings,
    staleCatalogDocs,
    staleDocs,
    missingDocs,
    missingPages,
    missingContentItems,
    adminUrlOnPublicDocs,
    urlMismatches,
    contentTypeSlugMismatches,
    titleMismatches,
    catalogItemPublicDuplicates,
  };
}

export async function reconcileStaleSearchDocuments(): Promise<{ removed: number }> {
  const expected = await collectExpectedSearchDocuments();
  const valid = new Set(expected.map((doc) => doc.key));
  const checkedTypes = [
    ...new Set<SearchEntityType>([
      "CONTENT_ITEM",
      "CONTENT_TYPE",
      "CONTENT_COLLECTION",
      "CMS_PAGE",
      "POST",
      "FAQ",
      "TESTIMONIAL",
      "CATALOG_PRODUCT",
      "CATALOG_COLLECTION",
      "CATALOG_CATEGORY",
      ...expected.map((doc) => doc.entityType),
    ]),
  ];
  if (checkedTypes.length === 0) return { removed: 0 };

  const existing = await prisma.searchDocument.findMany({
    where: { entityType: { in: checkedTypes } },
    select: { id: true, entityType: true, entityId: true, locale: true },
  });

  const staleIds = existing
    .filter((row) => !valid.has(docKey(row.entityType, row.entityId, row.locale)))
    .map((row) => row.id);

  if (staleIds.length === 0) return { removed: 0 };

  const batchSize = 500;
  for (let i = 0; i < staleIds.length; i += batchSize) {
    const batch = staleIds.slice(i, i + batchSize);
    await prisma.searchDocument.deleteMany({ where: { id: { in: batch } } });
  }
  return { removed: staleIds.length };
}
