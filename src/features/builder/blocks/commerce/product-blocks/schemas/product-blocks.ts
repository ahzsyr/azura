import { z } from "zod";

export function newId(prefix = "item") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const productTemplateIdSchema = z.enum(["product-card"]).default("product-card");
export const productPresetIdSchema = z.literal("product").default("product");

export const productEntityBindingSchema = z.object({
  presetId: productPresetIdSchema.optional(),
  templateId: productTemplateIdSchema.optional(),
});

export const productSelectionSourceSchema = z.enum([
  "collection",
  "manual",
  "featured",
  "tags",
]);

export const productSortSchema = z.enum([
  "name-asc",
  "name-desc",
  "price-asc",
  "price-desc",
  "newest",
]);

export const productSelectionSchema = z.object({
  source: productSelectionSourceSchema.default("collection"),
  collectionSlug: z.string().default(""),
  productSlugs: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  limit: z.coerce.number().min(1).max(48).default(8),
  sortBy: productSortSchema.default("name-asc"),
});

export const productGridPropsSchema = z.object({
  title: z.string().default(""),
  subtitle: z.string().default(""),
  badge: z.string().default(""),
  ...productEntityBindingSchema.shape,
  ...productSelectionSchema.shape,
  columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(3),
  viewMode: z.enum(["grid", "list"]).default("grid"),
  showToolbar: z.boolean().default(false),
  pageSize: z.coerce.number().min(4).max(48).default(12),
  showPrice: z.boolean().default(true),
  showRating: z.boolean().default(true),
  showStock: z.boolean().default(true),
  showCompare: z.boolean().default(true),
  emptyMessage: z.string().default(""),
  viewAllHref: z.string().default(""),
});

export const productCarouselPropsSchema = z.object({
  title: z.string().default(""),
  subtitle: z.string().default(""),
  ...productEntityBindingSchema.shape,
  ...productSelectionSchema.shape,
  cardVariant: z.enum(["default", "compact", "featured"]).default("default"),
  autoplay: z.boolean().default(false),
  autoplayIntervalMs: z.coerce.number().default(5000),
  showArrows: z.boolean().default(true),
  showDots: z.boolean().default(false),
  loop: z.boolean().default(true),
  slidesPerView: z.coerce.number().min(1).max(4).default(3),
  emptyMessage: z.string().default(""),
});

export const productComparisonPropsSchema = z.object({
  title: z.string().default(""),
  productSlugs: z.array(z.string()).default([]),
  layout: z.enum(["table", "cards"]).default("table"),
  highlightDifferences: z.boolean().default(true),
  compareMode: z.enum(["all", "differences", "hideEqual"]).default("all"),
  showCompareLink: z.boolean().default(true),
});

export const manualSpecRowSchema = z.object({
  id: z.string(),
  name: z.string().default(""),
  value: z.string().default(""),
});

export const manualSpecGroupSchema = z.object({
  id: z.string(),
  title: z.string().default(""),
  rows: z.array(manualSpecRowSchema).default([]),
});

export const productSpecificationsPropsSchema = z.object({
  title: z.string().default(""),
  productSlug: z.string().default(""),
  expandFirstGroup: z.boolean().default(true),
  manualGroups: z.array(manualSpecGroupSchema).default([]),
});

export const productReviewsPropsSchema = z.object({
  title: z.string().default(""),
  productSlug: z.string().default(""),
  commentsLimit: z.coerce.number().default(10),
  allowSorting: z.boolean().default(true),
  showTrustpilotBanner: z.boolean().default(true),
});

export const productFaqItemSchema = z.object({
  id: z.string(),
  category: z.string().default(""),
  question: z.string().default(""),
  answer: z.string().default(""),
});

export const productFaqSourceSchema = z.enum(["manual", "product", "productSections"]);

export const productFaqPropsSchema = z.object({
  title: z.string().default(""),
  source: productFaqSourceSchema.default("manual"),
  productSlug: z.string().default(""),
  items: z.array(productFaqItemSchema).default([]),
  searchable: z.boolean().default(false),
  layoutMode: z.enum(["accordion", "grid"]).default("accordion"),
});

export const relatedProductsRuleSchema = z.enum([
  "anchor",
  "collection",
  "brand",
  "tags",
  "manual",
]);

export const relatedProductsPropsSchema = z.object({
  title: z.string().default(""),
  rule: relatedProductsRuleSchema.default("collection"),
  anchorSlug: z.string().default(""),
  collectionSlug: z.string().default(""),
  brand: z.string().default(""),
  tags: z.array(z.string()).default([]),
  productSlugs: z.array(z.string()).default([]),
  limit: z.coerce.number().min(1).max(24).default(4),
  layout: z.enum(["grid", "carousel"]).default("grid"),
  ...productCarouselPropsSchema.pick({
    autoplay: true,
    autoplayIntervalMs: true,
    showArrows: true,
    showDots: true,
    loop: true,
    slidesPerView: true,
  }).shape,
});

export type ProductSelectionConfig = z.infer<typeof productSelectionSchema>;
