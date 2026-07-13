const PRODUCT_SEARCH_PATHS = [
  "productTitle",
  "name",
  "title",
  "description",
  "shortDescription",
  "detailed_description",
  "tags",
  "brand",
  "categories",
  "category",
  "seoTitle",
  "seoDescription",
];

const PRODUCT_LISTING_PATHS = [
  "price",
  "old_price",
  "stock_status",
  "availability",
  "categories",
  "category",
  "brand",
  "slug",
  "productTitle",
  "name",
  "title",
  "media",
  "featured_image",
];

const PRODUCT_COLLECTION_PATHS = ["categories", "category", "tags", "collectionSlugs"];

const CMS_SEARCH_PATHS = ["title", "excerpt", "content", "blocks", "slug", "localeFields"];
const CMS_PUBLIC_PATHS = ["slug", "blocks", "visualSettings", "title", "templateKey", "localeFields"];
const CMS_TRANSLATION_PATHS = ["localeFields", "slug"];
const CMS_REVISION_PATHS = ["slug", "blocks", "visualSettings", "templateKey", "localeFields"];

const POST_SEARCH_PATHS = [
  "slug",
  "blocks",
  "localeFields",
  "title",
  "excerpt",
  "featuredImageAlt",
  "featuredImageCaption",
  "categoryIds",
  "tagIds",
];
const POST_PUBLIC_PATHS = [
  "slug",
  "blocks",
  "localeFields",
  "featuredImageId",
  "featuredImageSettings",
  "authorId",
  "categoryIds",
  "tagIds",
  "relatedPostIds",
];
const POST_TRANSLATION_PATHS = ["localeFields", "slug"];
const POST_REVISION_PATHS = ["slug", "blocks", "localeFields", "featuredImageId", "featuredImageSettings"];

const CONTENT_SEARCH_PATHS = ["slug", "attributes", "blocks", "metadata", "collectionId"];
const CONTENT_PUBLIC_PATHS = [
  "slug",
  "attributes",
  "blocks",
  "displaySettings",
  "collectionId",
  "isFeatured",
  "isVisible",
  "sortOrder",
];
const CONTENT_TRANSLATION_PATHS = ["attributes", "slug", "blocks"];
const CONTENT_REVISION_PATHS = ["slug", "attributes", "blocks", "displaySettings"];

function pathMatchesPrefix(path: string, prefixes: string[]): boolean {
  return prefixes.some((p) => path === p || path.startsWith(`${p}.`));
}

export function productPatchAffectsSearch(paths: string[]): boolean {
  return paths.some((p) => pathMatchesPrefix(p, PRODUCT_SEARCH_PATHS));
}

export function productPatchAffectsListing(paths: string[]): boolean {
  return paths.some((p) => pathMatchesPrefix(p, PRODUCT_LISTING_PATHS));
}

export function productPatchAffectsCollections(paths: string[]): boolean {
  return paths.some((p) => pathMatchesPrefix(p, PRODUCT_COLLECTION_PATHS));
}

export function cmsPatchAffectsSearch(paths: string[]): boolean {
  return paths.some((p) => pathMatchesPrefix(p, CMS_SEARCH_PATHS));
}

export function cmsPatchAffectsPublicPage(paths: string[]): boolean {
  return paths.some((p) => pathMatchesPrefix(p, CMS_PUBLIC_PATHS));
}

export function cmsPatchAffectsTranslations(paths: string[]): boolean {
  return paths.some((p) => pathMatchesPrefix(p, CMS_TRANSLATION_PATHS));
}

export function cmsPatchAffectsRevision(paths: string[]): boolean {
  return paths.some((p) => pathMatchesPrefix(p, CMS_REVISION_PATHS));
}

export function postPatchAffectsSearch(paths: string[]): boolean {
  return paths.some((p) => pathMatchesPrefix(p, POST_SEARCH_PATHS));
}

export function postPatchAffectsPublicPage(paths: string[]): boolean {
  return paths.some((p) => pathMatchesPrefix(p, POST_PUBLIC_PATHS));
}

export function postPatchAffectsTranslations(paths: string[]): boolean {
  return paths.some((p) => pathMatchesPrefix(p, POST_TRANSLATION_PATHS));
}

export function postPatchAffectsRevision(paths: string[]): boolean {
  return paths.some((p) => pathMatchesPrefix(p, POST_REVISION_PATHS));
}

export function contentPatchAffectsSearch(paths: string[]): boolean {
  return paths.some((p) => pathMatchesPrefix(p, CONTENT_SEARCH_PATHS));
}

export function contentPatchAffectsPublicPage(paths: string[]): boolean {
  return paths.some((p) => pathMatchesPrefix(p, CONTENT_PUBLIC_PATHS));
}

export function contentPatchAffectsTranslations(paths: string[]): boolean {
  return paths.some((p) => pathMatchesPrefix(p, CONTENT_TRANSLATION_PATHS));
}

export function contentPatchAffectsRevision(paths: string[]): boolean {
  return paths.some((p) => pathMatchesPrefix(p, CONTENT_REVISION_PATHS));
}
