import type { SearchSourcesSettings } from "@/capabilities/search/settings/admin-search-settings.schema";
import type { LocalizedValueMap } from "@/features/translation/types";

/** Canonical slug for Packages (catalog items). */
export const PACKAGES_CONTENT_TYPE_SLUG = "catalog-items";

/** Legacy slug alias still used in some databases. */
export const PACKAGES_LEGACY_SLUG = "packages";

/** Built-in content type slugs with dedicated admin toggles. */
export const BUILTIN_CONTENT_TYPE_SOURCE_KEYS = [
  "packages",
  "listings",
  "offerings",
  "projects",
] as const;

export type BuiltinContentTypeSourceKey = (typeof BUILTIN_CONTENT_TYPE_SOURCE_KEYS)[number];

export const BUILTIN_CONTENT_TYPE_SLUGS: Record<BuiltinContentTypeSourceKey, string[]> = {
  packages: [PACKAGES_CONTENT_TYPE_SLUG, PACKAGES_LEGACY_SLUG],
  listings: ["listings"],
  offerings: ["offerings"],
  projects: ["projects"],
};

export const SEARCH_SOURCE_PLATFORM_LABELS: Record<
  keyof Pick<
    SearchSourcesSettings,
    "products" | "collections" | "pages" | "posts" | "media" | "customContentTypes"
  >,
  string
> = {
  products: "Products",
  collections: "Collections",
  pages: "Pages",
  posts: "Posts",
  media: "Media",
  customContentTypes: "Custom content types",
};

export function isPackagesContentTypeSlug(slug: string): boolean {
  return BUILTIN_CONTENT_TYPE_SLUGS.packages.includes(slug);
}

export function isBuiltinContentTypeSlug(slug: string): boolean {
  return (Object.values(BUILTIN_CONTENT_TYPE_SLUGS) as string[][]).some((slugs) =>
    slugs.includes(slug)
  );
}

export function builtinKeyForContentTypeSlug(slug: string): BuiltinContentTypeSourceKey | null {
  for (const key of BUILTIN_CONTENT_TYPE_SOURCE_KEYS) {
    if (BUILTIN_CONTENT_TYPE_SLUGS[key].includes(slug)) return key;
  }
  return null;
}

function firstFilledLabel(map: LocalizedValueMap, preferredLocale?: string): string {
  if (preferredLocale) {
    const direct = map[preferredLocale]?.trim();
    if (direct) return direct;
    const lower = preferredLocale.toLowerCase();
    const match = Object.entries(map).find(
      ([code, value]) => code.toLowerCase() === lower && value.trim()
    );
    if (match) return match[1].trim();
  }
  for (const [code, value] of Object.entries(map)) {
    if (code.toLowerCase().startsWith("en") && value.trim()) return value.trim();
  }
  for (const value of Object.values(map)) {
    if (value.trim()) return value.trim();
  }
  return "";
}

/** Plural label, then name, then slug — follows the live content type record. */
export function resolveContentTypeSourceLabel(
  labelPlural: LocalizedValueMap,
  name: LocalizedValueMap,
  slug: string,
  preferredLocale?: string
): string {
  return firstFilledLabel(labelPlural, preferredLocale) || firstFilledLabel(name, preferredLocale) || slug;
}

/**
 * Whether a catalog content type slug is included in the search index.
 * An explicit per-slug override wins, then a legacy builtin flag for the
 * current slug or its origin slug, then the custom-content-type default.
 */
export function isContentTypeSlugSearchable(
  slug: string,
  sources: SearchSourcesSettings,
  originBuiltinSlug?: string | null
): boolean {
  const explicit = sources.contentTypeSlugs[slug];
  if (explicit !== undefined) return explicit;
  const builtin =
    builtinKeyForContentTypeSlug(slug) ??
    (originBuiltinSlug ? builtinKeyForContentTypeSlug(originBuiltinSlug) : null);
  if (builtin) return sources[builtin];
  return sources.customContentTypes;
}

export function isContentTypeLandingsEnabled(sources: SearchSourcesSettings): boolean {
  return sources.contentTypeLandings;
}

export function hasAnySearchableContentTypeSlug(
  slugs: Iterable<string>,
  sources: SearchSourcesSettings
): boolean {
  for (const slug of slugs) {
    if (isContentTypeSlugSearchable(slug, sources)) return true;
  }
  return false;
}

/** Migrate legacy `sources` + `catalog` flags into normalized search sources. */
export function resolveSearchSources(
  sourcesRaw: Record<string, unknown>,
  catalogRaw: Record<string, unknown>,
  legacySite: Record<string, unknown>
): SearchSourcesSettings {
  const contentItems = sourcesRaw.contentItems !== false;
  const contentTypeSlugsRaw = sourcesRaw.contentTypeSlugs;
  const contentTypeSlugs: Record<string, boolean> = {};
  if (
    contentTypeSlugsRaw &&
    typeof contentTypeSlugsRaw === "object" &&
    !Array.isArray(contentTypeSlugsRaw)
  ) {
    for (const [slug, value] of Object.entries(contentTypeSlugsRaw as Record<string, unknown>)) {
      if (typeof value === "boolean") contentTypeSlugs[slug] = value;
    }
  }

  const products =
    catalogRaw.products !== false &&
    legacySite.indexProducts !== false &&
    sourcesRaw.products !== false;

  const collections =
    catalogRaw.collections !== false &&
    sourcesRaw.collections !== false &&
    sourcesRaw.contentCollections !== false;

  return {
    products,
    packages: sourcesRaw.packages !== false && contentItems,
    listings: sourcesRaw.listings !== false && contentItems,
    offerings: sourcesRaw.offerings !== false && contentItems,
    projects: sourcesRaw.projects !== false && contentItems,
    collections,
    pages: sourcesRaw.pages !== false && sourcesRaw.cmsPages !== false,
    posts: sourcesRaw.posts !== false,
    media: sourcesRaw.media === true,
    customContentTypes:
      sourcesRaw.customContentTypes !== false && contentItems,
    contentTypeSlugs,
    contentTypeLandings: sourcesRaw.contentTypeLandings !== false && sourcesRaw.contentTypes !== false,
    faqs: sourcesRaw.faqs !== false,
    testimonials: sourcesRaw.testimonials !== false,
  };
}
