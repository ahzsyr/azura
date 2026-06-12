import { z } from "zod";
import { productSortSchema } from "@/features/product-blocks/schemas/product-blocks";

export function newShowcaseId(prefix = "item") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const localizedShowcaseFields = {
  titleEn: z.string().default(""),
  titleAr: z.string().default(""),
  subtitleEn: z.string().default(""),
  subtitleAr: z.string().default(""),
  badgeEn: z.string().default(""),
  badgeAr: z.string().default(""),
};

export const extendedProductSourceSchema = z.enum([
  "collection",
  "manual",
  "featured",
  "tags",
  "best_sellers",
  "new_arrivals",
  "trending",
  "brand",
  "category",
  "recommended",
  "recently_viewed",
  "sale",
]);

export const productShowcaseLayoutSchema = z.enum(["grid", "carousel", "list", "masonry"]);
export const productShowcaseModeSchema = z.enum(["single", "tabs"]);

export const productShowcaseTabSchema = z.object({
  id: z.string(),
  labelEn: z.string().default(""),
  labelAr: z.string().default(""),
  source: extendedProductSourceSchema.default("featured"),
  collectionSlug: z.string().default(""),
  productSlugs: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  brand: z.string().default(""),
  category: z.string().default(""),
  limit: z.coerce.number().min(1).max(48).default(8),
  sortBy: productSortSchema.default("name-asc"),
});

export const productShowcasePropsSchema = z.object({
  ...localizedShowcaseFields,
  mode: productShowcaseModeSchema.default("single"),
  layout: productShowcaseLayoutSchema.default("grid"),
  source: extendedProductSourceSchema.default("featured"),
  collectionSlug: z.string().default(""),
  productSlugs: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  brand: z.string().default(""),
  category: z.string().default(""),
  limit: z.coerce.number().min(1).max(48).default(8),
  sortBy: productSortSchema.default("name-asc"),
  columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(3),
  tabs: z.array(productShowcaseTabSchema).default([]),
  cardVariant: z.enum(["default", "compact", "featured"]).default("default"),
  autoplay: z.boolean().default(false),
  autoplayIntervalMs: z.coerce.number().default(5000),
  showArrows: z.boolean().default(true),
  showDots: z.boolean().default(false),
  loop: z.boolean().default(true),
  slidesPerView: z.coerce.number().min(1).max(4).default(3),
  showPrice: z.boolean().default(true),
  showRating: z.boolean().default(true),
  showStock: z.boolean().default(true),
  showCompare: z.boolean().default(true),
  viewAllHref: z.string().default(""),
  emptyMessageEn: z.string().default(""),
  emptyMessageAr: z.string().default(""),
  anchorSlug: z.string().default(""),
});

export const categoryShowcaseSourceSchema = z.enum([
  "collections",
  "productCategories",
  "manual",
]);

export const categoryShowcaseLayoutSchema = z.enum([
  "grid",
  "slider",
  "carousel",
  "masonry",
  "list",
  "cards",
  "megaTiles",
  "banner",
  "icons",
  "nestedTree",
]);

export const manualCategoryShowcaseNodeSchema: z.ZodType<ManualCategoryShowcaseNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    labelEn: z.string().default(""),
    labelAr: z.string().default(""),
    href: z.string().default(""),
    imageUrl: z.string().optional().default(""),
    iconUrl: z.string().optional().default(""),
    descriptionEn: z.string().default(""),
    descriptionAr: z.string().default(""),
    children: z.array(manualCategoryShowcaseNodeSchema).default([]),
  }),
) as z.ZodType<ManualCategoryShowcaseNode>;

export type ManualCategoryShowcaseNode = {
  id: string;
  labelEn: string;
  labelAr: string;
  href: string;
  imageUrl?: string;
  iconUrl?: string;
  descriptionEn?: string;
  descriptionAr?: string;
  children?: ManualCategoryShowcaseNode[];
};

export const categoryShowcasePropsSchema = z.object({
  ...localizedShowcaseFields,
  source: categoryShowcaseSourceSchema.default("collections"),
  layout: categoryShowcaseLayoutSchema.default("grid"),
  selection: z.enum(["auto", "manual", "featured"]).default("auto"),
  manualSlugs: z.array(z.string()).default([]),
  featuredSlugs: z.array(z.string()).default([]),
  manualNodes: z.array(manualCategoryShowcaseNodeSchema).default([]),
  showImages: z.boolean().default(true),
  showCounts: z.boolean().default(true),
  showDescriptions: z.boolean().default(false),
  columns: z.union([z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6)]).default(4),
  maxDepth: z.coerce.number().min(1).max(5).default(3),
  limit: z.coerce.number().min(1).max(48).default(12),
  sort: z.enum(["name", "count", "manual", "featured"]).default("name"),
  autoplay: z.boolean().default(false),
  autoplayIntervalMs: z.coerce.number().default(5000),
  showArrows: z.boolean().default(true),
  showDots: z.boolean().default(false),
  loop: z.boolean().default(true),
  slidesPerView: z.coerce.number().min(1).max(6).default(4),
});

export const brandShowcaseSourceSchema = z.enum(["catalogProfiles", "manual"]);
export const brandSelectionSchema = z.enum(["all", "pick", "manual"]);
export const brandLogoCarouselModeSchema = z.enum(["carousel", "marquee"]);
export const showcaseScrollSpeedSchema = z.enum(["slow", "medium", "fast"]);
export const showcaseScrollDirectionSchema = z.enum(["left", "right"]);
export const brandLogoSizeSchema = z.enum(["sm", "md", "lg"]);
export const brandShowcaseLayoutSchema = z.enum([
  "logoGrid",
  "logoCarousel",
  "brandCards",
  "directory",
  "featuredBanner",
  "collectionSlider",
]);
export const brandShowcaseSortSchema = z.enum([
  "alphabetical",
  "productCount",
  "manual",
  "featuredFirst",
]);

export const manualBrandNodeSchema = z.object({
  id: z.string(),
  slug: z.string().default(""),
  nameEn: z.string().default(""),
  nameAr: z.string().default(""),
  logoUrl: z.string().default(""),
  bannerUrl: z.string().default(""),
  descriptionEn: z.string().default(""),
  descriptionAr: z.string().default(""),
  href: z.string().default(""),
  featured: z.boolean().default(false),
});

export const brandOverrideSchema = z.object({
  logoUrl: z.string().default(""),
  bannerUrl: z.string().default(""),
  descriptionEn: z.string().default(""),
  descriptionAr: z.string().default(""),
  href: z.string().default(""),
  nameEn: z.string().default(""),
  nameAr: z.string().default(""),
});

export type BrandOverride = z.infer<typeof brandOverrideSchema>;
export type BrandSelection = z.infer<typeof brandSelectionSchema>;

export const brandShowcasePropsSchema = z.object({
  ...localizedShowcaseFields,
  source: brandShowcaseSourceSchema.default("catalogProfiles"),
  brandSelection: brandSelectionSchema.default("all"),
  layout: brandShowcaseLayoutSchema.default("logoGrid"),
  sort: brandShowcaseSortSchema.default("featuredFirst"),
  manualBrands: z.array(manualBrandNodeSchema).default([]),
  featuredSlugs: z.array(z.string()).default([]),
  selectedBrandSlugs: z.array(z.string()).default([]),
  /** @deprecated use selectedBrandSlugs */
  manualSlugs: z.array(z.string()).default([]),
  brandOverrides: z.record(z.string(), brandOverrideSchema).default({}),
  showCounts: z.boolean().default(true),
  showDescriptions: z.boolean().default(false),
  grayscale: z.boolean().default(true),
  grayscaleHover: z.boolean().default(true),
  searchEnabled: z.boolean().default(false),
  limit: z.coerce.number().min(1).max(48).default(12),
  columns: z.union([z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6)]).default(4),
  logoCarouselMode: brandLogoCarouselModeSchema.default("carousel"),
  logoSize: brandLogoSizeSchema.default("md"),
  scrollSpeed: showcaseScrollSpeedSchema.default("medium"),
  scrollDirection: showcaseScrollDirectionSchema.default("left"),
  pauseOnHover: z.boolean().default(true),
  showEdgeFade: z.boolean().default(true),
  separator: z.string().default(""),
  scrollSpeedCustom: z.coerce.number().optional(),
  autoplay: z.boolean().default(true),
  autoplayIntervalMs: z.coerce.number().default(5000),
  showArrows: z.boolean().default(true),
  showDots: z.boolean().default(false),
  loop: z.boolean().default(true),
  slidesPerView: z.coerce.number().min(1).max(6).default(4),
});

export const taxonomyDimensionSchema = z.enum(["category", "brand"]);
export const taxonomyNavStyleSchema = z.enum([
  "horizontal",
  "vertical",
  "pills",
  "mega",
  "icons",
]);

export const taxonomyTabItemSchema = z.object({
  id: z.string(),
  slug: z.string().default(""),
  labelEn: z.string().default(""),
  labelAr: z.string().default(""),
  iconUrl: z.string().default(""),
  imageUrl: z.string().default(""),
});

export const taxonomyProductTabsPropsSchema = z.object({
  ...localizedShowcaseFields,
  taxonomy: taxonomyDimensionSchema.default("category"),
  navStyle: taxonomyNavStyleSchema.default("horizontal"),
  tabSource: z.enum(["auto", "manual", "pick"]).default("auto"),
  autoTabLimit: z.coerce.number().min(1).max(24).default(6),
  selectedBrandSlugs: z.array(z.string()).default([]),
  brandOverrides: z.record(z.string(), brandOverrideSchema).default({}),
  tabs: z.array(taxonomyTabItemSchema).default([]),
  productLayout: z.enum(["grid", "carousel"]).default("grid"),
  productsPerTab: z.coerce.number().min(1).max(48).default(8),
  sortBy: productSortSchema.default("name-asc"),
  columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(3),
  lazyLoad: z.boolean().default(true),
  showTabCounts: z.boolean().default(true),
  ajaxEnabled: z.boolean().default(true),
  cardVariant: z.enum(["default", "compact", "featured"]).default("default"),
  autoplay: z.boolean().default(false),
  autoplayIntervalMs: z.coerce.number().default(5000),
  showArrows: z.boolean().default(true),
  showDots: z.boolean().default(false),
  loop: z.boolean().default(true),
  slidesPerView: z.coerce.number().min(1).max(4).default(3),
  showPrice: z.boolean().default(true),
  showRating: z.boolean().default(true),
  showStock: z.boolean().default(true),
  showCompare: z.boolean().default(true),
  emptyMessageEn: z.string().default(""),
  emptyMessageAr: z.string().default(""),
});

export const megaCollectionShowcasePropsSchema = z.object({
  ...localizedShowcaseFields,
  leftNavSource: categoryShowcaseSourceSchema.default("collections"),
  leftNavMaxDepth: z.coerce.number().min(1).max(5).default(3),
  leftShowIcons: z.boolean().default(true),
  centerCollectionSlug: z.string().default(""),
  centerCategory: z.string().default(""),
  centerLayout: z.enum(["grid", "carousel"]).default("grid"),
  centerLimit: z.coerce.number().min(1).max(48).default(8),
  centerSortBy: productSortSchema.default("name-asc"),
  centerColumns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(3),
  syncNavToProducts: z.boolean().default(true),
  rightPromoImageUrl: z.string().default(""),
  rightPromoTitleEn: z.string().default(""),
  rightPromoTitleAr: z.string().default(""),
  rightPromoCtaEn: z.string().default(""),
  rightPromoCtaAr: z.string().default(""),
  rightPromoHref: z.string().default(""),
  rightFeaturedBrandSlug: z.string().default(""),
  showPrice: z.boolean().default(true),
  showRating: z.boolean().default(true),
  showStock: z.boolean().default(true),
  showCompare: z.boolean().default(true),
});

export const productDiscoveryLoadModeSchema = z.enum(["paginated", "infinite", "loadMore"]);
export const productDiscoveryLayoutSchema = z.enum([
  "grid",
  "slider",
  "masonry",
  "list",
  "mixed",
]);

export const productDiscoveryPropsSchema = z.object({
  ...localizedShowcaseFields,
  layout: productDiscoveryLayoutSchema.default("grid"),
  loadMode: productDiscoveryLoadModeSchema.default("paginated"),
  ajaxEnabled: z.boolean().default(true),
  syncUrl: z.boolean().default(false),
  showResultCount: z.boolean().default(true),
  pageSize: z.coerce.number().min(4).max(48).default(12),
  columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(3),
  enabledDimensions: z
    .array(z.enum(["categories", "brands", "tags", "collections", "price", "rating", "availability"]))
    .default(["categories", "brands", "tags", "price", "availability"]),
  collectionSlug: z.string().default(""),
  personalizationRecentlyViewedBoost: z.boolean().default(false),
  personalizationTrendingBoost: z.boolean().default(false),
  showPrice: z.boolean().default(true),
  showRating: z.boolean().default(true),
  showStock: z.boolean().default(true),
  showCompare: z.boolean().default(true),
  emptyMessageEn: z.string().default(""),
  emptyMessageAr: z.string().default(""),
});

export type ExtendedProductSource = z.infer<typeof extendedProductSourceSchema>;
export type ProductShowcaseConfig = z.infer<typeof productShowcasePropsSchema>;
export type ProductSourceQuery = {
  source: ExtendedProductSource;
  collectionSlug?: string;
  productSlugs?: string[];
  tags?: string[];
  brand?: string;
  category?: string;
  limit?: number;
  sortBy?: z.infer<typeof productSortSchema>;
  anchorSlug?: string;
};

export const PRODUCT_SHOWCASE_TAB_PRESETS: Array<{
  id: string;
  labelEn: string;
  labelAr: string;
  source: ExtendedProductSource;
  sortBy?: z.infer<typeof productSortSchema>;
}> = [
  { id: "best-sellers", labelEn: "Best Sellers", labelAr: "الأكثر مبيعاً", source: "best_sellers" },
  { id: "new-arrivals", labelEn: "New Arrivals", labelAr: "وصل حديثاً", source: "new_arrivals", sortBy: "newest" },
  { id: "trending", labelEn: "Trending", labelAr: "رائج", source: "trending" },
  { id: "featured", labelEn: "Featured", labelAr: "مميز", source: "featured" },
  { id: "sale", labelEn: "Sale", labelAr: "تخفيضات", source: "sale" },
  { id: "recommended", labelEn: "Recommended", labelAr: "موصى به", source: "recommended" },
];
