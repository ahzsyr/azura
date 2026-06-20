import type { SearchEntityType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { contentPublicService } from "@/features/content/content-public.service";
import { adminLocale } from "@/features/catalog/admin/catalog-admin-config";
import { readSiteSettings } from "@/features/catalog/site-settings.service";
import { resolveAdminSearchSettings } from "@/features/search/settings/resolve-admin-search-settings";
import {
  discoverCatalogSearchSources,
  type CatalogSearchDiscovery,
} from "@/features/search-framework/discovery/catalog-search-discovery";
import { syncCatalogSearchIndexes } from "@/features/search-framework/indexer/catalog-index-sync";
import type { SearchIndexer } from "@/features/search-framework/indexer/search-indexer";
import type { ContentItemDbShape } from "@/features/search-framework/indexing/content-item-index-pipeline";
import { getSearchPerformanceConfig } from "@/features/search-framework/performance/search-performance-config";
import { runWithConcurrency } from "@/features/search-framework/performance/index-concurrency";
import { InvalidSearchIndexRecordError } from "@/features/search-framework/indexer/validate-index-record";
import { purgeInvalidSearchDocuments } from "@/features/search-framework/indexer/purge-invalid-search-documents";

export type RebuildSourceStats = {
  contentItems: number;
  faqs: number;
  testimonials: number;
  pages: number;
  posts: number;
  media: number;
  catalogSync: boolean;
};

export type RebuildResult = {
  documents: number;
  byEntityType: Record<string, number>;
  sources: RebuildSourceStats;
  warnings: string[];
  errors: string[];
};

const MAX_ERRORS = 10;

export async function rebuildFromDiscovery(indexer: SearchIndexer): Promise<RebuildResult> {
  const warnings: string[] = [];
  const errors: string[] = [];

  await contentPublicService.ensureReady();

  const discovery = await discoverCatalogSearchSources();
  const site = await readSiteSettings(adminLocale.code);
  const adminSearch = resolveAdminSearchSettings(site);
  const src = discovery.sources;

  const stats: RebuildSourceStats = {
    contentItems: 0,
    faqs: 0,
    testimonials: 0,
    pages: 0,
    posts: 0,
    media: 0,
    catalogSync: false,
  };

  const enabledTypeIds = [...discovery.enabledContentTypeIds];
  const [contentItems, faqItems, testimonials, pages, posts, media] = await Promise.all([
    enabledTypeIds.length
      ? prisma.contentItem.findMany({
          where: {
            deletedAt: null,
            status: "PUBLISHED",
            isVisible: true,
            contentTypeId: { in: enabledTypeIds },
          },
          include: {
            contentType: {
              select: {
                slug: true,
                routePrefix: true,
                fieldSchema: true,
                adminConfig: true,
                isEnabled: true,
              },
            },
            collection: { select: { id: true, slug: true } },
          },
        })
      : Promise.resolve([]),
    src.faqs
      ? prisma.faqItem.findMany({
          where: { isPublished: true, faqSet: { isPublished: true } },
          include: { faqSet: { select: { slug: true } } },
        })
      : Promise.resolve([]),
    src.testimonials
      ? prisma.testimonial.findMany({ where: { isPublished: true } })
      : Promise.resolve([]),
    src.pages
      ? prisma.cmsPage.findMany({ where: { status: "PUBLISHED" } })
      : Promise.resolve([]),
    src.posts
      ? prisma.post.findMany({ where: { status: "PUBLISHED" } })
      : Promise.resolve([]),
    src.media
      ? prisma.mediaAsset.findMany({ take: adminSearch.performance.mediaIndexLimit || 500 })
      : Promise.resolve([]),
  ]);

  const perf = getSearchPerformanceConfig();

  const captureError = (e: unknown, context: string) => {
    if (errors.length >= MAX_ERRORS) return;
    const msg =
      e instanceof InvalidSearchIndexRecordError
        ? e.message
        : e instanceof Error
          ? `${context}: ${e.message}`
          : `${context}: unknown error`;
    errors.push(msg);
  };

  if (discovery.hasSearchableContentItems && contentItems.length) {
    await runWithConcurrency(
      contentItems,
      async (item) => {
        try {
          await indexer.indexContentItem(
            {
              ...item,
              attributes: item.attributes,
              metadata: item.metadata,
              blocks: item.blocks,
              contentType: item.contentType,
              collection: item.collection,
            } as ContentItemDbShape,
            { revalidate: false }
          );
          stats.contentItems += 1;
        } catch (e) {
          captureError(e, `content item ${item.id}`);
        }
      },
      perf.indexConcurrency
    );
  }

  if (src.faqs && faqItems.length) {
    await runWithConcurrency(
      faqItems,
      async (f) => {
        try {
          await indexer.indexFaqSource(
            { faq: f, faqSetSlug: f.faqSet.slug },
            { revalidate: false }
          );
          stats.faqs += 1;
        } catch (e) {
          captureError(e, `faq ${f.id}`);
        }
      },
      perf.indexConcurrency
    );
  }

  if (src.testimonials && testimonials.length) {
    await runWithConcurrency(
      testimonials,
      async (t) => {
        try {
          await indexer.indexTestimonial(t, { revalidate: false });
          stats.testimonials += 1;
        } catch (e) {
          captureError(e, `testimonial ${t.id}`);
        }
      },
      perf.indexConcurrency
    );
  }

  if (src.pages && pages.length) {
    await runWithConcurrency(
      pages,
      async (p) => {
        try {
          await indexer.indexCmsPage(p, { revalidate: false });
          stats.pages += 1;
        } catch (e) {
          captureError(e, `page ${p.id}`);
        }
      },
      perf.indexConcurrency
    );
  }

  if (src.posts && posts.length) {
    await runWithConcurrency(
      posts,
      async (p) => {
        try {
          await indexer.indexPost(p, { revalidate: false });
          stats.posts += 1;
        } catch (e) {
          captureError(e, `post ${p.id}`);
        }
      },
      perf.indexConcurrency
    );
  }

  if (src.media && media.length) {
    const capped = media.slice(0, adminSearch.performance.mediaIndexLimit);
    await runWithConcurrency(
      capped,
      async (m) => {
        try {
          await indexer.indexMedia(m, { revalidate: false });
          stats.media += 1;
        } catch (e) {
          captureError(e, `media ${m.id}`);
        }
      },
      perf.indexConcurrency
    );
  }

  try {
    await syncCatalogSearchIndexes(indexer, discovery);
    stats.catalogSync = true;
  } catch (e) {
    captureError(e, "catalog sync");
  }

  if (discovery.siteCatalog.products && stats.catalogSync) {
    const productCount = await prisma.searchDocument.count({
      where: { entityType: "CATALOG_PRODUCT" },
    });
    if (productCount === 0) {
      warnings.push(
        "No catalog products indexed — run product index build (npm run catalog:index) if products are enabled."
      );
    }
  }

  const byEntityType = await countByEntityType();
  const documents = Object.values(byEntityType).reduce((a, b) => a + b, 0);

  if (errors.length) {
    throw new AggregateError(
      errors,
      `Search index rebuild completed with ${errors.length} error(s), ${documents} documents indexed.`
    );
  }

  return {
    documents,
    byEntityType,
    sources: stats,
    warnings,
    errors,
  };
}

async function countByEntityType(): Promise<Record<string, number>> {
  await purgeInvalidSearchDocuments();
  const rows = await prisma.searchDocument.groupBy({
    by: ["entityType"],
    _count: { _all: true },
  });
  const out: Record<string, number> = {};
  for (const row of rows) {
    out[row.entityType] = row._count._all;
  }
  return out;
}

export type { CatalogSearchDiscovery };
