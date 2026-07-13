import { z } from "zod";
import { catalogPropsSchema, DEFAULT_DISPLAY_SETTINGS } from "@/schemas/catalog/display-settings";
import { customHtmlItemSchema, customHtmlPropsSchema } from "@/features/builder/blocks/content/schemas/content-blocks";

export { catalogPropsSchema, DEFAULT_DISPLAY_SETTINGS };
export { customHtmlItemSchema, customHtmlPropsSchema };

export const heroPropsSchema = z.object({
  title: z.string().default(""),
  subtitle: z.string().default(""),
  badge: z.string().default(""),
  imageUrl: z.string().default(""),
  mediaAssetId: z.string().default(""),
  foregroundImageUrl: z.string().default(""),
  foregroundMediaAssetId: z.string().default(""),
  ctaLabel: z.string().default(""),
  ctaHref: z.string().default("/contact"),
  secondaryCtaLabel: z.string().default(""),
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

export const textAlignSchema = z.enum(["center", "left"]);
export const bodyTextAlignSchema = z.enum(["left", "center"]);
export const badgeSizeSchema = z.enum(["xs", "sm", "base"]);
export const titleSizeSchema = z.enum(["xl", "2xl", "3xl"]);
export const subtitleSizeSchema = z.enum(["sm", "base", "lg"]);
export const bodySizeSchema = z.enum(["sm", "base", "lg"]);

export const textPropsSchema = z.object({
  content: z.string().default(""),
  badge: z.string().default(""),
  title: z.string().default(""),
  subtitle: z.string().default(""),
  align: textAlignSchema.default("center"),
  badgeSize: badgeSizeSchema.default("sm"),
  titleSize: titleSizeSchema.default("2xl"),
  subtitleSize: subtitleSizeSchema.default("base"),
  contentSize: bodySizeSchema.default("base"),
  contentAlign: bodyTextAlignSchema.default("left"),
});

export const imagePropsSchema = z.object({
  url: z.string().default(""),
  mediaAssetId: z.string().default(""),
  alt: z.string().default(""),
  badge: z.string().default(""),
  title: z.string().default(""),
  subtitle: z.string().default(""),
  description: z.string().default(""),
  align: textAlignSchema.default("center"),
  badgeSize: badgeSizeSchema.default("sm"),
  titleSize: titleSizeSchema.default("2xl"),
  subtitleSize: subtitleSizeSchema.default("base"),
  descriptionSize: bodySizeSchema.default("base"),
  descriptionAlign: bodyTextAlignSchema.default("center"),
});

export const galleryPropsSchema = z.object({
  title: z.string().default(""),
  gallerySlug: z.string().default(""),
  columns: z.coerce
    .number()
    .pipe(z.union([z.literal(2), z.literal(3), z.literal(4)]))
    .default(3),
  limit: z.coerce.number().default(0),
  showViewAllLink: z.boolean().default(true),
  variant: z.enum(["grid", "masonry"]).default("grid"),
});

export const faqPropsSchema = z.object({
  title: z.string().default(""),
  faqSetSlug: z.string().default(""),
  limit: z.coerce.number().default(0),
});

export const testimonialsPropsSchema = z.object({
  title: z.string().default(""),
  source: z.enum(["all", "collection", "manual"]).default("all"),
  testimonialCollectionSlug: z.string().default(""),
  testimonialIds: z.array(z.string()).default([]),
  limit: z.coerce.number().default(6),
  layoutMode: z.enum(["grid", "slider"]).default("grid"),
  sliderEnabled: z.boolean().default(false),
  columns: z.coerce
    .number()
    .pipe(z.union([z.literal(2), z.literal(3), z.literal(4)]))
    .default(3),
  cardVariant: z.enum(["default", "compact", "minimal", "featured"]).default("default"),
  showViewAllLink: z.boolean().default(true),
  autoplay: z.boolean().default(false),
  autoplayIntervalMs: z.coerce.number().default(5000),
});

export { pricingPropsSchema } from "@/presets/pricing/schemas/pricing-blocks";

export const ctaPropsSchema = z.object({
  title: z.string().default(""),
  subtitle: z.string().default(""),
  button: z.string().default(""),
  href: z.string().default("/contact"),
  secondaryButton: z.string().default(""),
  secondaryHref: z.string().default(""),
  layout: z.enum(["centered", "split", "inline"]).default("centered"),
  size: z.enum(["compact", "default", "large"]).default("default"),
  backgroundType: z.enum(["image", "video", "gradient", "solid", "transparent"]).default("gradient"),
  backgroundImageUrl: z.string().default(""),
  backgroundMediaAssetId: z.string().default(""),
  backgroundColor: z.string().default(""),
  backgroundVideoUrl: z.string().default(""),
  promoBadge: z.string().default(""),
  promoText: z.string().default(""),
  countdownEnabled: z.boolean().default(false),
  countdownTarget: z.string().default(""),
  countdownLabel: z.string().default(""),
});

export const videoPropsSchema = z.object({
  title: z.string().default(""),
  url: z.string().default(""),
  caption: z.string().default(""),
});

export const richTextPropsSchema = z.object({
  html: z.string().default(""),
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
} from "@/features/builder/blocks/content/schemas/content-blocks";

export {
  featureGridPropsSchema,
  benefitsGridPropsSchema,
  trustBadgesPropsSchema,
  logoCloudPropsSchema,
  statsCounterPropsSchema,
  beforeAfterPropsSchema,
  extendedHeroPropsSchema,
  extendedCtaPropsSchema,
} from "@/features/builder/blocks/marketing/schemas/marketing-blocks";

export {
  productGridPropsSchema,
  productCarouselPropsSchema,
  productComparisonPropsSchema,
  productSpecificationsPropsSchema,
  productReviewsPropsSchema,
  productFaqPropsSchema,
  relatedProductsPropsSchema,
} from "@/features/builder/blocks/commerce/product-blocks/schemas/product-blocks";

export {
  searchBlockPropsSchema,
  advancedFiltersPropsSchema,
  categoryExplorerPropsSchema,
  relatedContentPropsSchema,
  recentlyViewedPropsSchema,
} from "@/features/builder/blocks/discovery/schemas/discovery-blocks";

export {
  categoryShowcasePropsSchema,
  brandShowcasePropsSchema,
  productShowcasePropsSchema,
  taxonomyProductTabsPropsSchema,
  megaCollectionShowcasePropsSchema,
  productDiscoveryPropsSchema,
} from "@/features/builder/blocks/commerce/commerce-showcase/schemas/showcase-blocks";

export {
  videoHeroPropsSchema,
  videoGalleryPropsSchema,
  interactiveHotspotsPropsSchema,
  masonryGalleryPropsSchema,
} from "@/features/builder/blocks/media/schemas/media-blocks";

export { announcementBarPropsSchema } from "@/features/announcement-bar/announcement-bar.schema";

export {
  stickyCtaPropsSchema,
  leadFormPropsSchema,
  contactFormBuilderPropsSchema,
  multiStepFormPropsSchema,
  newsletterSignupPropsSchema,
  downloadGatePropsSchema,
} from "@/features/builder/blocks/conversion/schemas/conversion-blocks";

export {
  pricingCalculatorPropsSchema,
  knowledgeBasePropsSchema,
  documentationNavPropsSchema,
  statusDashboardPropsSchema,
  teamDirectoryPropsSchema,
  partnerDirectoryPropsSchema,
} from "@/features/builder/blocks/portal/schemas/portal-blocks";
