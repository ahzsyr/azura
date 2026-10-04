import "server-only";

import {
  CACHE_TAGS,
  revalidateCmsPage,
  revalidateContentList,
  revalidateMarketingHome,
  revalidatePost,
} from "@/services/cache";
import { revalidateCmsPagePublicPaths } from "@/features/cms/revalidate-wired-marketing";
import { revalidateTag } from "next/cache";

export type CmsEntityRevalidateType = "page" | "post" | "content";

export type RevalidateCmsEntityParams = {
  type: CmsEntityRevalidateType;
  slug: string;
  /** Extra cache tags beyond the defaults for this entity type. */
  tags?: string[];
  /** Content-type slug when type is `content` (for list cache tags). */
  contentTypeSlug?: string;
  /** When true (default for pages), also revalidate marketing home + public paths. */
  includeMarketing?: boolean;
};

/**
 * Single post-commit revalidation entry for CMS lifecycle transitions
 * (publish / unpublish / restore-when-live). Call only after the DB transaction commits.
 */
export async function revalidateCmsEntity(params: RevalidateCmsEntityParams): Promise<void> {
  const { type, slug, tags = [], contentTypeSlug, includeMarketing = true } = params;

  try {
    switch (type) {
      case "page": {
        revalidateCmsPage(slug);
        if (includeMarketing) {
          revalidateMarketingHome();
          revalidateCmsPagePublicPaths(slug);
        }
        break;
      }
      case "post": {
        revalidatePost(slug);
        if (includeMarketing) {
          revalidateMarketingHome();
        }
        break;
      }
      case "content": {
        if (contentTypeSlug) {
          revalidateContentList(contentTypeSlug);
        }
        if (includeMarketing) {
          revalidateMarketingHome();
        }
        break;
      }
    }

    for (const tag of tags) {
      revalidateTag(tag, "max");
    }

    revalidateTag(CACHE_TAGS.search, "max");
    revalidateTag(CACHE_TAGS.sitemap, "max");
  } catch {
    /* outside Next request context */
  }
}

/** @deprecated Prefer {@link revalidateCmsEntity}. */
export function revalidatePublishedCmsPage(slug: string) {
  void revalidateCmsEntity({ type: "page", slug });
}
