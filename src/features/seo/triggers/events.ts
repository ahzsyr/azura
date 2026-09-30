import type { SeoSubmissionReason } from "@/features/seo/types";

export type SeoEntityType =
  | "CMS_PAGE"
  | "POST"
  | "CONTENT_ITEM"
  | "CONTENT_TYPE"
  | "PRODUCT"
  | "REDIRECT"
  | "SITE";

type BaseSeoContentEvent = {
  entityType: SeoEntityType;
  entityId?: string;
  locale?: string;
};

export type SeoContentEvent =
  | (BaseSeoContentEvent & {
      type: "content.published" | "content.unpublished" | "content.deleted";
      path: string;
    })
  | (BaseSeoContentEvent & {
      type: "content.slugChanged";
      oldPath: string;
      newPath: string;
    })
  | (BaseSeoContentEvent & {
      type: "content.localizedSlugChanged";
      path: string;
      oldPath?: string;
    })
  | (BaseSeoContentEvent & {
      type: "content.sitemapChanged";
      path?: string;
    })
  | (BaseSeoContentEvent & {
      type: "seo.metadataUpdated" | "seo.structuredDataUpdated";
      paths: string[];
    })
  | (BaseSeoContentEvent & {
      type: "seo.redirectChanged";
      fromPath?: string;
      submitFromPath?: boolean;
    });

export const SEO_EVENT_REASON: Record<SeoContentEvent["type"], SeoSubmissionReason> = {
  "content.published": "publish",
  "content.unpublished": "unpublish",
  "content.deleted": "delete",
  "content.slugChanged": "slug",
  "content.localizedSlugChanged": "localized-slug",
  "content.sitemapChanged": "sitemap",
  "seo.metadataUpdated": "metadata",
  "seo.structuredDataUpdated": "structured-data",
  "seo.redirectChanged": "redirect",
};
