/**
 * Next.js cache tags and revalidation helpers.
 * Call after admin publishes content that affects public marketing or search.
 */
import { unstable_cache, revalidateTag } from "next/cache";

export const CACHE_TAGS = {
  theme: "theme",
  company: "company",
  cmsPage: (slug: string) => `cms-page:${slug}`,
  post: (slug: string) => `post:${slug}`,
  search: "search",
  redirects: "redirects",
  media: "media",
  json: (namespace: string) => `json:${namespace}`,
  marketing: "marketing-home",
  package: (slug: string) => `package:${slug}`,
  categories: "package-categories",
  locales: "locales",
  translations: "translations",
  entityTranslations: (entityType: string, entityId: string) =>
    `translation:${entityType}:${entityId}`,
  uiMessages: (code: string) => `ui-messages:${code}`,
  productListing: (locale: string) => `products-listing:${locale}`,
  productFacets: (locale: string) => `products-facets:${locale}`,
  productSlug: (locale: string, slug: string) => `product:${locale}:${slug}`,
} as const;

const CACHE_PROFILE = "max" as const;

/** No-op outside Next.js request/build context (seed scripts, CLI, tests). */
function safeRevalidateTag(tag: string) {
  try {
    revalidateTag(tag, CACHE_PROFILE);
  } catch {
    // revalidateTag requires Next.js static generation store
  }
}

export function revalidateLocales() {
  safeRevalidateTag(CACHE_TAGS.locales);
}

export function revalidateTranslations(entityType?: string, entityId?: string) {
  safeRevalidateTag(CACHE_TAGS.translations);
  if (entityType && entityId) {
    safeRevalidateTag(CACHE_TAGS.entityTranslations(entityType, entityId));
  }
}

export function revalidateUiMessages(languageCode: string) {
  safeRevalidateTag(CACHE_TAGS.uiMessages(languageCode));
  safeRevalidateTag(CACHE_TAGS.translations);
}

export function revalidateTheme() {
  safeRevalidateTag(CACHE_TAGS.theme);
}

export function revalidateCmsPage(slug: string) {
  safeRevalidateTag(CACHE_TAGS.cmsPage(slug));
}

export function revalidatePost(slug: string) {
  safeRevalidateTag(CACHE_TAGS.post(slug));
}

export function revalidateSearch() {
  safeRevalidateTag(CACHE_TAGS.search);
}

export function revalidateJsonNamespace(namespace: string) {
  safeRevalidateTag(CACHE_TAGS.json(namespace));
}

export function revalidateMarketingHome() {
  safeRevalidateTag(CACHE_TAGS.marketing);
}

export function revalidatePackage(slug: string) {
  safeRevalidateTag(CACHE_TAGS.package(slug));
  safeRevalidateTag(CACHE_TAGS.marketing);
}

export function revalidateCategories() {
  safeRevalidateTag(CACHE_TAGS.categories);
}

export function revalidateProductListing(locale: string) {
  safeRevalidateTag(CACHE_TAGS.productListing(locale));
  safeRevalidateTag(CACHE_TAGS.productFacets(locale));
}

export function revalidateProductSlug(locale: string, slug: string) {
  safeRevalidateTag(CACHE_TAGS.productSlug(locale, slug));
  revalidateProductListing(locale);
}

export function createCached<T>(
  fn: () => Promise<T>,
  keyParts: string[],
  options: { tags: string[]; revalidate?: number }
) {
  return unstable_cache(fn, keyParts, {
    tags: options.tags,
    revalidate: options.revalidate ?? 3600,
  });
}
