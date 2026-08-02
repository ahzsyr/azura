import { getCmsPagePublicPath } from "@/features/cms/cms-page-path";
import type { LocalizedValueMap } from "@/features/translation/types";
import { estimateReadTimeMinutes } from "@/capabilities/search/lib/humanize-slug";
import { resolveIndexTitle } from "@/capabilities/search/lib/resolve-index-title";
import type { SearchCardPayload } from "@/capabilities/search/types/search-card";
import { getLocalizedField } from "@/lib/utils";
import { defineSearchProvider } from "@/capabilities/search/engine/providers/search-provider";
import type { SearchIndexRecord } from "@/capabilities/search/engine/types";
import type {
  ComposedSearchIndexPayload,
  ContentItemSearchSource,
} from "@/capabilities/search/engine/indexing/search-index-types";
import { composedPayloadToIndexText } from "@/capabilities/search/engine/indexing/search-index-composer";
import {
  buildRankingSignalsFromComposed,
  buildRankingSignalsFromRow,
} from "@/capabilities/search/engine/indexing/ranking-signals-snapshot";
import { buildProductContentSearchMetadata } from "@/features/entities/search/product-content-search-metadata";

export type ContentItemIndexSource = ContentItemSearchSource & {
  /** Pre-composed by SearchIndexer pipeline (Phase 4 indexing). */
  composed?: ComposedSearchIndexPayload;
};

export const contentItemSearchProvider = defineSearchProvider<ContentItemIndexSource>({
  kind: "content_item",
  entityType: "CONTENT_ITEM",
  defaultVisibility: "public",
  defaultBoost: 1,
  shouldIndex: (item) =>
    item.status === "PUBLISHED" &&
    item.isVisible !== false &&
    item.searchEnabled !== false,
  buildRecords(item, ctx) {
    const prefix = item.routePrefix ?? "content";
    const slug = item.slug;
    const adminPath = item.contentTypeSlug
      ? `/admin/content/${item.contentTypeSlug}/${item.id}`
      : `/admin/content`;

    const composed = item.composed;
    const composedText = composed ? composedPayloadToIndexText(composed) : null;
    const rawTitle = composedText
      ? composedText.title
      : getLocalizedField(item, "title", ctx.urlPrefix);
    const title = resolveIndexTitle(rawTitle, item.slug ?? item.id, {
      entityType: "CONTENT_ITEM",
      entityId: item.id,
      locale: ctx.urlPrefix,
    });
    const body =
      composedText?.body ??
      (getLocalizedField(item, "excerpt", ctx.urlPrefix) ||
        getLocalizedField(item, "description", ctx.urlPrefix) ||
        "");

    const productMetadata = buildProductContentSearchMetadata(item);

    const record: SearchIndexRecord = {
      entityType: "CONTENT_ITEM",
      entityId: item.id,
      locale: ctx.urlPrefix,
      title,
      body,
      urlPath: slug ? `/${ctx.urlPrefix}/${prefix}/${slug}` : `/${ctx.urlPrefix}/${prefix}`,
      kind: "content_item",
      contentTypeSlug: item.contentTypeSlug,
      visibility: "public",
      boost: typeof item.searchBoost === "number" ? item.searchBoost : 1,
      facets: {
        ...(item.contentTypeSlug ? { contentTypeSlug: item.contentTypeSlug } : {}),
        ...(productMetadata?.presetId ? { presetId: "product" } : {}),
        ...(composed?.facets ?? {}),
        ...(productMetadata?.card && typeof (productMetadata.card as SearchCardPayload).brand === "string"
          ? { brand: (productMetadata.card as SearchCardPayload).brand }
          : {}),
      },
      metadata: {
        contentTypeSlug: item.contentTypeSlug,
        adminPath: productMetadata?.adminPath ?? adminPath,
        indexProfileVersion: composed?.profileVersion,
        indexedFields: composed?.fieldSlices.map((s) => s.key) ?? [],
        rankingSignals: buildRankingSignalsFromComposed(composed, item),
        featured: item.isFeatured === true,
        publishedAt:
          item.publishedAt instanceof Date
            ? item.publishedAt.toISOString()
            : item.publishedAt ?? null,
        ...(productMetadata ?? {}),
      },
    };
    return [record];
  },
});

export type PostIndexSource = {
  id: string;
  slug: string;
  title: LocalizedValueMap;
  excerpt?: LocalizedValueMap;
  featuredImageAlt?: LocalizedValueMap;
  featuredImageCaption?: LocalizedValueMap;
  status?: string;
};

export const postSearchProvider = defineSearchProvider<PostIndexSource>({
  kind: "post",
  entityType: "POST",
  defaultVisibility: "public",
  defaultBoost: 1,
  shouldIndex: (post) => !post.status || post.status === "PUBLISHED",
  buildRecords(post, ctx) {
    const excerpt = getLocalizedField(post, "excerpt", ctx.urlPrefix);
    const caption = getLocalizedField(post, "featuredImageCaption", ctx.urlPrefix);
    const title = resolveIndexTitle(getLocalizedField(post, "title", ctx.urlPrefix), post.slug, {
      entityType: "POST",
      entityId: post.id,
      locale: ctx.urlPrefix,
    });
    const body = excerpt || caption || "";
    const card: SearchCardPayload = {
      slug: post.slug,
      readTimeMinutes: estimateReadTimeMinutes(body),
    };
    return [
      {
        entityType: "POST",
        entityId: post.id,
        locale: ctx.urlPrefix,
        title,
        body,
        urlPath: `/${ctx.urlPrefix}/blog/${post.slug}`,
        kind: "post",
        visibility: "public",
        boost: 1,
        facets: {},
        metadata: {
          rankingSignals: buildRankingSignalsFromRow({ title, body }),
          card,
        },
      },
    ];
  },
});

export type CmsPageIndexSource = {
  id: string;
  slug: string;
  title: LocalizedValueMap;
  excerpt?: LocalizedValueMap;
  description?: LocalizedValueMap;
  status?: string;
};

export const cmsPageSearchProvider = defineSearchProvider<CmsPageIndexSource>({
  kind: "cms_page",
  entityType: "CMS_PAGE",
  defaultVisibility: "public",
  defaultBoost: 1,
  shouldIndex: (page) => !page.status || page.status === "PUBLISHED",
  buildRecords(page, ctx) {
    const localizedTitle = getLocalizedField(page, "title", ctx.urlPrefix);
    const title = resolveIndexTitle(localizedTitle, page.slug, {
      entityType: "CMS_PAGE",
      entityId: page.id,
      locale: ctx.urlPrefix,
    });
    const body = getLocalizedField(page, "excerpt", ctx.urlPrefix) ||
      getLocalizedField(page, "description", ctx.urlPrefix) ||
      "";
    const card: SearchCardPayload = {
      slug: page.slug,
      readTimeMinutes: estimateReadTimeMinutes(body),
    };
    return [
      {
        entityType: "CMS_PAGE",
        entityId: page.id,
        locale: ctx.urlPrefix,
        title,
        body,
        urlPath: `/${ctx.urlPrefix}${getCmsPagePublicPath(page.slug)}`,
        kind: "cms_page",
        visibility: "public",
        boost: 1,
        facets: {},
        metadata: {
          rankingSignals: buildRankingSignalsFromRow({ title, body }),
          card,
        },
      },
    ];
  },
});

export type FaqIndexSource = {
  faq: {
    id: string;
    question: LocalizedValueMap;
    answer: LocalizedValueMap;
    isPublished?: boolean;
  };
  faqSetSlug: string;
};

export const faqSearchProvider = defineSearchProvider<FaqIndexSource>({
  kind: "faq",
  entityType: "FAQ",
  defaultVisibility: "public",
  defaultBoost: 0.9,
  shouldIndex: ({ faq }) => faq.isPublished !== false,
  buildRecords({ faq, faqSetSlug }, ctx) {
    const slug = faqSetSlug;
    const title = resolveIndexTitle(getLocalizedField(faq, "question", ctx.urlPrefix), `${slug}-${faq.id}`, {
      entityType: "FAQ",
      entityId: faq.id,
      locale: ctx.urlPrefix,
    });
    return [
      {
        entityType: "FAQ",
        entityId: faq.id,
        locale: ctx.urlPrefix,
        title,
        body: getLocalizedField(faq, "answer", ctx.urlPrefix).trim(),
        urlPath: `/${ctx.urlPrefix}/faq/${slug}`,
        kind: "faq",
        visibility: "public",
        boost: 0.9,
        facets: { faqSetSlug: slug },
        metadata: { faqSetSlug: slug },
      },
    ];
  },
});

export type TestimonialIndexSource = {
  id: string;
  name: string;
  quote: LocalizedValueMap;
  isPublished?: boolean;
};

export const testimonialSearchProvider = defineSearchProvider<TestimonialIndexSource>({
  kind: "testimonial",
  entityType: "TESTIMONIAL",
  defaultVisibility: "public",
  defaultBoost: 0.8,
  shouldIndex: (t) => t.isPublished !== false,
  buildRecords(t, ctx) {
    const title = resolveIndexTitle(t.name, t.id, {
      entityType: "TESTIMONIAL",
      entityId: t.id,
      locale: ctx.urlPrefix,
    });
    return [
      {
        entityType: "TESTIMONIAL",
        entityId: t.id,
        locale: ctx.urlPrefix,
        title,
        body: getLocalizedField(t, "quote", ctx.urlPrefix).trim(),
        urlPath: `/${ctx.urlPrefix}/testimonials`,
        kind: "testimonial",
        visibility: "public",
        boost: 0.8,
        facets: {},
        metadata: {},
      },
    ];
  },
});

export const mediaSearchProvider = defineSearchProvider({
  kind: "media",
  entityType: "MEDIA",
  defaultVisibility: "admin",
  defaultBoost: 0.5,
  shouldIndex: () => true,
  buildRecords(asset: { id: string; filename: string; alt: LocalizedValueMap }, ctx) {
    const title = resolveIndexTitle(asset.filename, asset.id, {
      entityType: "MEDIA",
      entityId: asset.id,
      locale: ctx.urlPrefix,
    });
    return [
      {
        entityType: "MEDIA",
        entityId: asset.id,
        locale: ctx.urlPrefix,
        title,
        body: getLocalizedField(asset, "alt", ctx.urlPrefix).trim(),
        urlPath: "/admin/media",
        kind: "media",
        visibility: "admin",
        boost: 0.5,
        facets: {},
        metadata: { adminOnly: true },
      },
    ];
  },
});

export const BUILTIN_SEARCH_PROVIDERS = [
  contentItemSearchProvider,
  postSearchProvider,
  cmsPageSearchProvider,
  faqSearchProvider,
  testimonialSearchProvider,
  mediaSearchProvider,
] as const;
