import { z } from "zod";
import { catalogPropsSchema, DEFAULT_DISPLAY_SETTINGS } from "@/schemas/catalog/display-settings";

export { catalogPropsSchema, DEFAULT_DISPLAY_SETTINGS };

export const heroPropsSchema = z.object({
  titleEn: z.string().default(""),
  titleAr: z.string().default(""),
  subtitleEn: z.string().default(""),
  subtitleAr: z.string().default(""),
  badgeEn: z.string().default(""),
  badgeAr: z.string().default(""),
  imageUrl: z.string().default(""),
  mediaAssetId: z.string().default(""),
  foregroundImageUrl: z.string().default(""),
  foregroundMediaAssetId: z.string().default(""),
  ctaLabelEn: z.string().default(""),
  ctaLabelAr: z.string().default(""),
  ctaHref: z.string().default("/contact"),
  secondaryCtaLabelEn: z.string().default(""),
  secondaryCtaLabelAr: z.string().default(""),
  secondaryCtaHref: z.string().default(""),
  secondaryCtaVariant: z.enum(["outline", "ghost", "gold"]).default("outline"),
  layout: z.enum(["centered", "splitImageLeft", "splitImageRight", "fullBleed"]).default("centered"),
  align: z.enum(["left", "center", "right"]).default("center"),
  minHeight: z.enum(["50vh", "70vh", "85vh"]).default("70vh"),
  backgroundType: z.enum(["image", "video", "gradient", "transparent"]).default("image"),
  videoUrl: z.string().default(""),
  videoMediaAssetId: z.string().default(""),
  overlayOpacity: z.coerce.number().min(0).max(100).default(60),
});

export const textPropsSchema = z.object({
  contentEn: z.string().default(""),
  contentAr: z.string().default(""),
});

export const imagePropsSchema = z.object({
  url: z.string().default(""),
  mediaAssetId: z.string().default(""),
  altEn: z.string().default(""),
  altAr: z.string().default(""),
});

export const galleryPropsSchema = z.object({
  titleEn: z.string().default(""),
  titleAr: z.string().default(""),
  gallerySlug: z.string().default(""),
  columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(3),
  limit: z.coerce.number().default(0),
  showViewAllLink: z.boolean().default(true),
  variant: z.enum(["grid", "masonry"]).default("grid"),
});

export const faqPropsSchema = z.object({
  titleEn: z.string().default(""),
  titleAr: z.string().default(""),
  faqSetSlug: z.string().default(""),
  limit: z.coerce.number().default(0),
});

export const testimonialsPropsSchema = z.object({
  titleEn: z.string().default(""),
  titleAr: z.string().default(""),
  source: z.enum(["all", "collection", "manual"]).default("all"),
  testimonialCollectionSlug: z.string().default(""),
  testimonialIds: z.array(z.string()).default([]),
  limit: z.coerce.number().default(6),
  layoutMode: z.enum(["grid", "slider"]).default("grid"),
  sliderEnabled: z.boolean().default(false),
  columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(3),
  cardVariant: z.enum(["default", "compact", "minimal", "featured"]).default("default"),
  showViewAllLink: z.boolean().default(true),
  autoplay: z.boolean().default(false),
  autoplayIntervalMs: z.coerce.number().default(5000),
});

export { pricingPropsSchema } from "@/features/pricing-plans/schemas/pricing-blocks";

export const ctaPropsSchema = z.object({
  titleEn: z.string().default(""),
  titleAr: z.string().default(""),
  subtitleEn: z.string().default(""),
  subtitleAr: z.string().default(""),
  buttonEn: z.string().default(""),
  buttonAr: z.string().default(""),
  href: z.string().default("/contact"),
  secondaryButtonEn: z.string().default(""),
  secondaryButtonAr: z.string().default(""),
  secondaryHref: z.string().default(""),
  layout: z.enum(["centered", "split", "inline"]).default("centered"),
  size: z.enum(["compact", "default", "large"]).default("default"),
  backgroundType: z.enum(["image", "video", "gradient", "solid", "transparent"]).default("gradient"),
  backgroundImageUrl: z.string().default(""),
  backgroundMediaAssetId: z.string().default(""),
  backgroundColor: z.string().default(""),
  backgroundVideoUrl: z.string().default(""),
  promoBadgeEn: z.string().default(""),
  promoBadgeAr: z.string().default(""),
  promoTextEn: z.string().default(""),
  promoTextAr: z.string().default(""),
  countdownEnabled: z.boolean().default(false),
  countdownTarget: z.string().default(""),
  countdownLabelEn: z.string().default(""),
  countdownLabelAr: z.string().default(""),
});

export const videoPropsSchema = z.object({
  titleEn: z.string().default(""),
  titleAr: z.string().default(""),
  url: z.string().default(""),
  captionEn: z.string().default(""),
  captionAr: z.string().default(""),
});

export const richTextPropsSchema = z.object({
  htmlEn: z.string().default(""),
  htmlAr: z.string().default(""),
});

export const customHtmlPropsSchema = z.object({
  htmlEn: z.string().default(""),
  htmlAr: z.string().default(""),
});

export const spacerPropsSchema = z.object({
  height: z.coerce.number().default(48),
});

export const dividerPropsSchema = z.object({
  style: z.enum(["solid", "dashed", "gold"]).default("solid"),
});

export const sectionPropsSchema = z.object({
  padding: z.enum(["none", "default", "large"]).default("default"),
  background: z.enum(["default", "muted", "primary"]).default("default"),
});

export const rowSectionColumnLayoutSchema = z.enum([
  "equal",
  "wide-left",
  "wide-right",
  "equal-thirds",
  "equal-quarters",
]);

export const rowSectionPropsSchema = z.object({
  padding: z.enum(["none", "default", "large"]).default("default"),
  background: z.enum(["default", "muted", "primary"]).default("default"),
  maxColumns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(2),
  columnLayout: rowSectionColumnLayoutSchema.default("equal"),
  gap: z.enum(["sm", "md", "lg"]).default("md"),
  stackOnMobile: z.boolean().default(true),
  verticalAlign: z.enum(["start", "center", "stretch"]).default("stretch"),
});

export {
  advancedRichTextPropsSchema,
  markdownPropsSchema,
  codePropsSchema,
  tablePropsSchema,
  timelinePropsSchema,
  changelogPropsSchema,
  comparisonPropsSchema,
} from "@/features/content-blocks/schemas/content-blocks";

export {
  featureGridPropsSchema,
  benefitsGridPropsSchema,
  trustBadgesPropsSchema,
  logoCloudPropsSchema,
  statsCounterPropsSchema,
  beforeAfterPropsSchema,
  extendedHeroPropsSchema,
  extendedCtaPropsSchema,
} from "@/features/marketing-blocks/schemas/marketing-blocks";

export {
  productGridPropsSchema,
  productCarouselPropsSchema,
  productComparisonPropsSchema,
  productSpecificationsPropsSchema,
  productReviewsPropsSchema,
  productFaqPropsSchema,
  relatedProductsPropsSchema,
} from "@/features/product-blocks/schemas/product-blocks";

export {
  searchBlockPropsSchema,
  advancedFiltersPropsSchema,
  categoryExplorerPropsSchema,
  relatedContentPropsSchema,
  recentlyViewedPropsSchema,
} from "@/features/discovery-blocks/schemas/discovery-blocks";

export {
  videoHeroPropsSchema,
  videoGalleryPropsSchema,
  interactiveHotspotsPropsSchema,
  masonryGalleryPropsSchema,
} from "@/features/media-blocks/schemas/media-blocks";

export { announcementBarPropsSchema } from "@/features/announcement-bar/announcement-bar.schema";

export {
  stickyCtaPropsSchema,
  leadFormPropsSchema,
  contactFormBuilderPropsSchema,
  multiStepFormPropsSchema,
  newsletterSignupPropsSchema,
  downloadGatePropsSchema,
} from "@/features/conversion-blocks/schemas/conversion-blocks";

export {
  pricingCalculatorPropsSchema,
  knowledgeBasePropsSchema,
  documentationNavPropsSchema,
  statusDashboardPropsSchema,
  teamDirectoryPropsSchema,
  partnerDirectoryPropsSchema,
} from "@/features/portal-blocks/schemas/portal-blocks";
