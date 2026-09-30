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
  backgroundType: z.enum(["image", "video", "gradient", "solid", "transparent"]).default("image"),
  videoUrl: z.string().default(""),
  videoMediaAssetId: z.string().default(""),
  backgroundColor: z.string().default(""),
  overlayOpacity: z.coerce.number().min(0).max(100).default(60),
  fadeIntoSiteBackground: z.boolean().default(false),
});

export const textAlignSchema = z.enum(["center", "left"]);
export const bodyTextAlignSchema = z.enum(["left", "right", "center", "justify"]);
export const badgeSizeSchema = z.enum(["xs", "sm", "base"]);
export const titleSizeSchema = z.enum(["xl", "2xl", "3xl"]);
export const subtitleSizeSchema = z.enum(["sm", "base", "lg"]);
export const bodySizeSchema = z.enum(["sm", "base", "lg"]);

export const textPropsSchema = z.object({
  content: z.string().default(""),
  badge: z.string().default(""),
  title: z.string().default(""),
  subtitle: z.string().default(""),
  backgroundType: z.enum(["image", "video", "gradient", "solid", "transparent"]).default("solid"),
  backgroundColor: z.string().default(""),
  imageUrl: z.string().default(""),
  mediaAssetId: z.string().default(""),
  videoUrl: z.string().default(""),
  align: textAlignSchema.default("center"),
  badgeSize: badgeSizeSchema.default("sm"),
  titleSize: titleSizeSchema.default("2xl"),
  subtitleSize: subtitleSizeSchema.default("base"),
  contentSize: bodySizeSchema.default("base"),
  contentAlign: bodyTextAlignSchema.default("left"),
});

export const imageMediaPositionSchema = z.enum([
  "top",
  "bottom",
  "left",
  "right",
  "overlay",
  "background",
]);
export const imageMobileLayoutSchema = z.enum(["stack", "reverse", "side-by-side"]);
export const imageMediaWidthSchema = z.enum(["1/3", "2/5", "1/2", "3/5", "2/3"]);
export const imageContentPositionSchema = z.enum([
  "top-left",
  "top-center",
  "top-right",
  "center-left",
  "center",
  "center-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
]);
export const imageMediaGapSchema = z.enum(["none", "sm", "md", "lg", "xl"]);
export const imageContentTypeSchema = z.enum(["structured", "richText", "html"]);
export const imageContentPanelVariantSchema = z.enum([
  "none",
  "surface",
  "glass",
  "dark",
  "light",
]);
export const imageMediaAspectRatioSchema = z.enum([
  "auto",
  "16/9",
  "4/3",
  "3/2",
  "1/1",
  "4/5",
  "3/4",
  "9/16",
]);
export const imageMediaSizeSchema = z.enum(["auto", "sm", "md", "lg", "xl", "full", "custom"]);
export const imageMediaObjectFitSchema = z.enum(["cover", "contain"]);

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
  mediaPosition: imageMediaPositionSchema.default("top"),
  mobileLayout: imageMobileLayoutSchema.default("stack"),
  mediaWidth: imageMediaWidthSchema.default("1/2"),
  contentPosition: imageContentPositionSchema.default("center"),
  mediaGap: imageMediaGapSchema.default("lg"),
  contentType: imageContentTypeSchema.default("structured"),
  richContent: z.string().default(""),
  richContentEn: z.string().default(""),
  richContentAr: z.string().default(""),
  richHtml: z.string().default(""),
  richHtmlEn: z.string().default(""),
  richHtmlAr: z.string().default(""),
  htmlElements: z.array(z.record(z.string(), z.unknown())).default([]),
  contentPanelEnabled: z.boolean().default(false),
  contentPanelVariant: imageContentPanelVariantSchema.default("none"),
  mediaAspectRatio: imageMediaAspectRatioSchema.default("auto"),
  mediaSize: imageMediaSizeSchema.default("auto"),
  mediaObjectFit: imageMediaObjectFitSchema.default("cover"),
  mediaFrameWidth: z.number().int().nonnegative().nullable().default(null),
  mediaFrameHeight: z.number().int().nonnegative().nullable().default(null),
  mediaFrameWidthAuto: z.boolean().default(true),
  mediaFrameHeightAuto: z.boolean().default(true),
  headerEnabled: z.boolean().default(true),
}).passthrough();

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

export const faqSetGridPropsSchema = z.object({
  title: z.string().default(""),
  subtitle: z.string().default(""),
  columns: z.coerce
    .number()
    .pipe(z.union([z.literal(2), z.literal(3), z.literal(4)]))
    .default(3),
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
  url: z.string().default(""),
  mediaAssetId: z.string().default(""),
  alt: z.string().default(""),
  badge: z.string().default(""),
  title: z.string().default(""),
  subtitle: z.string().default(""),
  description: z.string().default(""),
  /** Legacy caption — still read as description fallback. */
  caption: z.string().default(""),
  align: textAlignSchema.default("center"),
  badgeSize: badgeSizeSchema.default("sm"),
  titleSize: titleSizeSchema.default("2xl"),
  subtitleSize: subtitleSizeSchema.default("base"),
  descriptionSize: bodySizeSchema.default("base"),
  descriptionAlign: bodyTextAlignSchema.default("center"),
  mediaPosition: imageMediaPositionSchema.default("top"),
  mobileLayout: imageMobileLayoutSchema.default("stack"),
  mediaWidth: imageMediaWidthSchema.default("1/2"),
  contentPosition: imageContentPositionSchema.default("center"),
  mediaGap: imageMediaGapSchema.default("lg"),
  contentType: imageContentTypeSchema.default("structured"),
  richContent: z.string().default(""),
  richContentEn: z.string().default(""),
  richContentAr: z.string().default(""),
  richHtml: z.string().default(""),
  richHtmlEn: z.string().default(""),
  richHtmlAr: z.string().default(""),
  htmlElements: z.array(z.record(z.string(), z.unknown())).default([]),
  contentPanelEnabled: z.boolean().default(false),
  contentPanelVariant: imageContentPanelVariantSchema.default("none"),
  mediaAspectRatio: imageMediaAspectRatioSchema.default("16/9"),
  mediaSize: imageMediaSizeSchema.default("auto"),
  mediaObjectFit: imageMediaObjectFitSchema.default("cover"),
  mediaFrameWidth: z.number().int().nonnegative().nullable().default(null),
  mediaFrameHeight: z.number().int().nonnegative().nullable().default(null),
  mediaFrameWidthAuto: z.boolean().default(true),
  mediaFrameHeightAuto: z.boolean().default(true),
  headerEnabled: z.boolean().default(true),
}).passthrough();

export const richTextPropsSchema = z.object({
  html: z.string().default(""),
});


export const spacerPropsSchema = z.object({
  height: z.coerce.number().default(48),
});

export const dividerPropsSchema = z.object({
  style: z.enum(["solid", "dashed", "gold"]).default("solid"),
});

export const sectionLayoutModeSchema = z.enum([
  "stack",
  "splitLeft",
  "splitRight",
  "grid",
  "slider",
]);

export const sectionPropsSchema = z.object({
  padding: z.enum(["none", "default", "large"]).default("default"),
  background: z.enum(["default", "muted", "primary"]).default("default"),
  layoutMode: sectionLayoutModeSchema.default("stack"),
  gap: z.enum(["sm", "md", "lg"]).default("md"),
  stackOnMobile: z.boolean().default(true),
  maxWidth: z.enum(["full", "container", "narrow"]).default("full"),
  columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(2),
  slidesPerView: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(1),
  showArrows: z.boolean().default(true),
  showDots: z.boolean().default(false),
  autoplay: z.boolean().default(false),
  autoplayIntervalMs: z.coerce.number().min(2000).default(5000),
  loop: z.boolean().default(true),
});

export function parseSectionProps(raw: Record<string, unknown>) {
  return sectionPropsSchema.parse(raw);
}

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
  tabbedShowcasePropsSchema,
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

export { contactMapPropsSchema } from "@/features/builder/blocks/contact/schemas/map";
export { contactLocationPropsSchema } from "@/features/builder/blocks/contact/schemas/location";
export { contactPhonePropsSchema } from "@/features/builder/blocks/contact/schemas/phone";
export { contactSocialPropsSchema } from "@/features/builder/blocks/contact/schemas/social";
export { contactSectionPropsSchema } from "@/features/builder/blocks/contact/schemas/section";
export {
  contactCardBaseSchema,
  contactThemeSchema,
} from "@/features/builder/blocks/contact/schemas/common";

export {
  pricingCalculatorPropsSchema,
  knowledgeBasePropsSchema,
  documentationNavPropsSchema,
  statusDashboardPropsSchema,
  teamDirectoryPropsSchema,
  partnerDirectoryPropsSchema,
} from "@/features/builder/blocks/portal/schemas/portal-blocks";
