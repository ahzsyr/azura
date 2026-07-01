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
  completion: (localeCode?: string) =>
    localeCode ? `completion:${localeCode}` : "completion",
  localizedSlug: (entityType: string, slug: string, localeCode: string) =>
    `localized-slug:${entityType}:${slug}:${localeCode}`,
  entityTranslations: (entityType: string, entityId: string) =>
    `translation:${entityType}:${entityId}`,
  uiMessages: (code: string) => `ui-messages:${code}`,
  productListing: (locale: string) => `products-listing:${locale}`,
  productFacets: (locale: string) => `products-facets:${locale}`,
  catalogListingShell: (locale: string) => `catalog-listing-shell:${locale}`,
  productSlug: (locale: string, slug: string) => `product:${locale}:${slug}`,
  contentList: (typeSlug: string, collectionSlug?: string) =>
    `content-list:${typeSlug}:${collectionSlug ?? "all"}`,
  comparableTypes: "comparable-content-types",
  seoMeta: (entityType: string, entityId: string, locale?: string) =>
    locale
      ? `seo:${entityType}:${entityId}:${locale}`
      : `seo:${entityType}:${entityId}`,
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

const HEADER_WORKSPACE_ENTITY_TYPES = new Set([
  "MenuItem",
  "HeaderAction",
  "MegaMenuTab",
  "MegaMenuPanel",
]);

const FOOTER_WORKSPACE_ENTITY_TYPES = new Set(["Footer", "FooterColumn", "FooterLink"]);

/** Tags invalidated when workspace EntityTranslation rows change (testable). */
export function getWorkspaceTranslationRevalidationTags(
  entityType: string,
  localeCodes: string[],
): string[] {
  const codes = [...new Set(localeCodes.map((c) => c.trim().toLowerCase()).filter(Boolean))];
  const tags = new Set<string>([CACHE_TAGS.translations]);

  if (HEADER_WORKSPACE_ENTITY_TYPES.has(entityType)) {
    tags.add("header-workspace");
    tags.add(CACHE_TAGS.json("header-workspace"));
    for (const code of codes) {
      tags.add(`header-flyout-${code}`);
    }
  }
  if (FOOTER_WORKSPACE_ENTITY_TYPES.has(entityType)) {
    tags.add("footer-workspace");
    tags.add(CACHE_TAGS.json("footer-workspace"));
    for (const code of codes) {
      tags.add(`footer-translations-${code}`);
    }
  }
  return [...tags];
}

/** Invalidate cached localized header/footer workspaces after workspace EntityTranslation changes. */
export function revalidateWorkspaceTranslations(entityType: string, localeCodes: string[]) {
  for (const tag of getWorkspaceTranslationRevalidationTags(entityType, localeCodes)) {
    safeRevalidateTag(tag);
  }
}

export function revalidateCompletion(localeCode?: string) {
  safeRevalidateTag(CACHE_TAGS.completion());
  if (localeCode) {
    safeRevalidateTag(CACHE_TAGS.completion(localeCode));
  }
  safeRevalidateTag(CACHE_TAGS.locales);
}

export function revalidateUiMessages(languageCode: string) {
  safeRevalidateTag(CACHE_TAGS.uiMessages(languageCode));
  safeRevalidateTag(CACHE_TAGS.translations);
}

export function revalidateTheme() {
  safeRevalidateTag(CACHE_TAGS.theme);
}

export function getFooterTranslationCacheTags(localeCodes: string[]): string[] {
  return [
    ...new Set(
      localeCodes
        .map((code) => code.trim().toLowerCase())
        .filter(Boolean)
        .map((code) => `footer-translations-${code}`),
    ),
  ];
}

export function getFooterWorkspaceRevalidationTags(): string[] {
  return ["footer-workspace", CACHE_TAGS.json("footer-workspace"), CACHE_TAGS.marketing];
}

export function revalidateFooterWorkspace(localeCodes?: string[]): void {
  const codes = localeCodes?.length ? localeCodes : ["en"];
  for (const tag of getFooterWorkspaceRevalidationTags()) {
    safeRevalidateTag(tag);
  }
  for (const tag of getFooterTranslationCacheTags(codes)) {
    safeRevalidateTag(tag);
  }
}

export function getThemeShellRevalidationTags(): string[] {
  return [CACHE_TAGS.theme, CACHE_TAGS.marketing];
}

/** All tags used by the cached public marketing shell (loadPublicShellContext). */
export function getPublicShellRevalidationTags(localePrefixes: string[]): string[] {
  return [
    ...new Set([
      ...getThemeShellRevalidationTags(),
      CACHE_TAGS.company,
      CACHE_TAGS.locales,
      CACHE_TAGS.translations,
      CACHE_TAGS.json("header-workspace"),
      CACHE_TAGS.json("footer-workspace"),
      CACHE_TAGS.json("settings"),
      CACHE_TAGS.json("site-settings"),
      "header-workspace",
      "footer-workspace",
      ...getHeaderFlyoutImageCacheTags(localePrefixes),
      ...getFooterTranslationCacheTags(localePrefixes),
    ]),
  ];
}

export function revalidatePublicShell(localePrefixes?: string[]): void {
  const codes = localePrefixes?.length ? localePrefixes : ["en"];
  for (const tag of getPublicShellRevalidationTags(codes)) {
    safeRevalidateTag(tag);
  }
}

export function revalidateThemeShell(): void {
  for (const tag of getThemeShellRevalidationTags()) {
    safeRevalidateTag(tag);
  }
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

export function getHeaderWorkspaceRevalidationTags(): string[] {
  return ["header-workspace", CACHE_TAGS.json("header-workspace"), CACHE_TAGS.marketing];
}

export function getHeaderFlyoutImageCacheTags(localeCodes: string[]): string[] {
  return [
    ...new Set(
      localeCodes
        .map((code) => code.trim().toLowerCase())
        .filter(Boolean)
        .map((code) => `header-flyout-${code}`),
    ),
  ];
}

export function revalidateHeaderFlyoutImages(localeCodes?: string[]): void {
  const codes = localeCodes?.length ? localeCodes : ["en"];
  for (const tag of getHeaderWorkspaceRevalidationTags()) {
    safeRevalidateTag(tag);
  }
  for (const tag of getHeaderFlyoutImageCacheTags(codes)) {
    safeRevalidateTag(tag);
  }
}

export function revalidateHeaderWorkspace(localeCodes?: string[]) {
  revalidateHeaderFlyoutImages(localeCodes);
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
  safeRevalidateTag(CACHE_TAGS.catalogListingShell(locale));
}

export function revalidateProductSlug(locale: string, slug: string) {
  safeRevalidateTag(CACHE_TAGS.productSlug(locale, slug));
  revalidateProductListing(locale);
  revalidateHeaderFlyoutImages([locale]);
}

export function revalidateContentList(typeSlug: string, collectionSlug?: string) {
  safeRevalidateTag(CACHE_TAGS.contentList(typeSlug, collectionSlug));
  safeRevalidateTag(CACHE_TAGS.contentList(typeSlug));
  safeRevalidateTag(CACHE_TAGS.marketing);
}

export function revalidateComparableTypes() {
  safeRevalidateTag(CACHE_TAGS.comparableTypes);
}

export function revalidateSeoMeta(entityType: string, entityId: string, localeCodes?: string[]) {
  safeRevalidateTag(CACHE_TAGS.seoMeta(entityType, entityId));
  if (localeCodes?.length) {
    for (const locale of localeCodes) {
      safeRevalidateTag(CACHE_TAGS.seoMeta(entityType, entityId, locale));
    }
  }
  safeRevalidateTag(CACHE_TAGS.translations);
}

export function createCached<T>(
  fn: () => Promise<T>,
  keyParts: string[],
  options: { tags: string[]; revalidate?: number | false }
) {
  return unstable_cache(fn, keyParts, {
    tags: options.tags,
    revalidate: options.revalidate === undefined ? 3600 : options.revalidate,
  });
}