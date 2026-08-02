import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { isBuildWithoutDb } from "@/lib/build-db";
import { CACHE_TAGS } from "@/services/cache";
import { cmsService } from "@/features/cms/cms.service";
import type { CmsPageWithSeo, CmsPagePublicView } from "@/features/cms/cms.service";

/** Cached published home page — avoids full DB SSR on every visit (Hostinger 504). */
export const loadCachedHomePage = cache(async (): Promise<CmsPagePublicView | null> => {
  if (isBuildWithoutDb()) return null;

  return unstable_cache(
    async () => cmsService.getPublishedPageBySlug("home"),
    ["cms-published-home"],
    {
      revalidate: 60,
      tags: [CACHE_TAGS.cmsPage("home"), CACHE_TAGS.marketing],
    },
  )();
});
