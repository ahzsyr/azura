import { z } from "zod";
import { SearchEntityType } from "@prisma/client";

export const searchEntityTypeSchema = z.nativeEnum(SearchEntityType);

export const localizedTitleFields = {
  titleEn: z.string().default(""),
  titleAr: z.string().default(""),
  subtitleEn: z.string().default(""),
  subtitleAr: z.string().default(""),
};

export const searchBlockLayoutSchema = z.enum(["inline", "hero", "compact"]);
export const searchBlockResultsModeSchema = z.enum(["dropdown", "redirect"]);

export const searchBlockPropsSchema = z.object({
  ...localizedTitleFields,
  layout: searchBlockLayoutSchema.default("inline"),
  resultsMode: searchBlockResultsModeSchema.default("dropdown"),
  placeholderEn: z.string().default(""),
  placeholderAr: z.string().default(""),
  showPopular: z.boolean().default(true),
  showTrending: z.boolean().default(true),
  showRecentQueries: z.boolean().default(true),
  showEntityTypeChips: z.boolean().default(true),
  showFacetChips: z.boolean().default(true),
  entityTypes: z.array(searchEntityTypeSchema).default([]),
  redirectPath: z.string().default("/search"),
});

export const advancedFiltersScopeSchema = z.enum(["products", "search", "content"]);
export const advancedFiltersLayoutSchema = z.enum(["sidebar", "chips", "drawer"]);

export const advancedFiltersPropsSchema = z.object({
  ...localizedTitleFields,
  scope: advancedFiltersScopeSchema.default("products"),
  layout: advancedFiltersLayoutSchema.default("sidebar"),
  syncUrl: z.boolean().default(true),
  enabledDimensions: z.array(z.string()).default([]),
  contentTypeSlug: z.string().default(""),
  pairedBlockId: z.string().default(""),
});

export const categoryExplorerSourceSchema = z.enum([
  "collections",
  "productCategories",
  "postCategories",
  "contentCollections",
  "manual",
]);

export const categoryExplorerVariantSchema = z.enum(["tree", "tabs", "grid", "sidebar"]);

export const manualCategoryNodeSchema: z.ZodType<ManualCategoryNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    labelEn: z.string().default(""),
    labelAr: z.string().default(""),
    href: z.string().default(""),
    imageUrl: z.string().optional().default(""),
    children: z.array(manualCategoryNodeSchema).default([]),
  })
) as z.ZodType<ManualCategoryNode>;

export type ManualCategoryNode = {
  id: string;
  labelEn: string;
  labelAr: string;
  href: string;
  imageUrl?: string;
  children?: ManualCategoryNode[];
};

export const categoryExplorerPropsSchema = z.object({
  ...localizedTitleFields,
  source: categoryExplorerSourceSchema.default("collections"),
  variant: categoryExplorerVariantSchema.default("tabs"),
  contentTypeSlug: z.string().default(""),
  featuredSlugs: z.array(z.string()).default([]),
  showImages: z.boolean().default(true),
  showCounts: z.boolean().default(false),
  maxDepth: z.coerce.number().min(1).max(5).default(3),
  pageSize: z.coerce.number().min(1).max(48).default(12),
  enablePagination: z.boolean().default(true),
  manualNodes: z.array(manualCategoryNodeSchema).default([]),
  urlParamKey: z.string().default(""),
});

export const relatedContentRuleSchema = z.enum(["anchor", "taxonomy", "manual"]);
export const relatedContentAnchorContextSchema = z.enum([
  "page",
  "product",
  "post",
  "contentItem",
]);

export const manualRelatedItemSchema = z.object({
  entityType: searchEntityTypeSchema,
  entityId: z.string().default(""),
});

export const relatedContentPropsSchema = z.object({
  ...localizedTitleFields,
  entityTypes: z
    .array(searchEntityTypeSchema)
    .default([SearchEntityType.CATALOG_PRODUCT, SearchEntityType.POST, SearchEntityType.CONTENT_ITEM]),
  rule: relatedContentRuleSchema.default("taxonomy"),
  anchorContext: relatedContentAnchorContextSchema.default("page"),
  anchorSlug: z.string().default(""),
  anchorId: z.string().default(""),
  categorySlugs: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  collectionSlug: z.string().default(""),
  contentTypeSlug: z.string().default(""),
  manualItems: z.array(manualRelatedItemSchema).default([]),
  limit: z.coerce.number().min(1).max(24).default(6),
  layout: z.enum(["grid", "carousel", "list"]).default("grid"),
  columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(3),
  autoplay: z.boolean().default(false),
  autoplayIntervalMs: z.coerce.number().default(5000),
  showArrows: z.boolean().default(true),
  showDots: z.boolean().default(false),
  loop: z.boolean().default(true),
  slidesPerView: z.coerce.number().min(1).max(4).default(3),
});

export const recentlyViewedPropsSchema = z.object({
  ...localizedTitleFields,
  entityTypes: z.array(searchEntityTypeSchema).default([]),
  limit: z.coerce.number().min(1).max(24).default(8),
  layout: z.enum(["grid", "carousel", "list"]).default("grid"),
  columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(4),
  excludeCurrentPage: z.boolean().default(true),
  emptyMessageEn: z.string().default(""),
  emptyMessageAr: z.string().default(""),
});
