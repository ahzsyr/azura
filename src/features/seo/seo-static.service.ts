import { seoRepository } from "@/repositories/seo.repository";
import { DEFAULT_ROBOTS, STATIC_SEO_PAGES } from "@/features/seo/constants";

const EMPTY_STATIC_META = {
  canonicalUrl: null,
  robots: DEFAULT_ROBOTS,
  focusKeywords: null,
  ogImageUrl: null,
  twitterCard: "summary_large_image" as const,
};

/** Create placeholder SeoMeta rows for registry pages that have no record yet. */
export async function ensureStaticSeoMetaRecords(): Promise<number> {
  let created = 0;

  for (const page of STATIC_SEO_PAGES) {
    const existing = await seoRepository.getByPageKey(page.pageKey);
    if (existing) continue;
    await seoRepository.upsertMetaByPageKey(page.pageKey, EMPTY_STATIC_META);
    created++;
  }

  return created;
}
