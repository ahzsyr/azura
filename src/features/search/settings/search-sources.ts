import type { SearchSourcesSettings } from "@/features/search/settings/admin-search-settings.schema";

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

export const SEARCH_SOURCE_BUILTIN_LABELS: Record<BuiltinContentTypeSourceKey, string> = {
  packages: "Packages",
  listings: "Listings",
  offerings: "Offerings",
  projects: "Projects",
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

/** Whether a catalog content type slug is included in the search index. */
export function isContentTypeSlugSearchable(
  slug: string,
  sources: SearchSourcesSettings
): boolean {
  const builtin = builtinKeyForContentTypeSlug(slug);
  if (builtin) return sources[builtin];
  const explicit = sources.contentTypeSlugs[slug];
  if (explicit !== undefined) return explicit;
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
