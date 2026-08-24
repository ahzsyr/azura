import { z } from "zod";

export function newId(prefix = "item") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const backgroundTypeSchema = z.enum(["image", "video", "gradient", "solid", "transparent"]);

export const gridItemSchema = z
  .object({
    id: z.string(),
    icon: z.string().default(""),
    imageUrl: z.string().default(""),
    mediaAssetId: z.string().default(""),
    title: z.string().default(""),
    description: z.string().default(""),
    href: z.string().default(""),
    category: z.string().default(""),
    linkLabel: z.string().default(""),
    metric: z.string().default(""),
  })
  .passthrough();

export const featureGridPropsSchema = z.object({
  title: z.string().default(""),
  subtitle: z.string().default(""),
  columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(3),
  cardVariant: z.enum(["default", "bordered", "elevated", "iconTop"]).default("default"),
  showCategories: z.boolean().default(false),
  items: z.array(gridItemSchema).default([]),
});

export const benefitsGridPropsSchema = z.object({
  title: z.string().default(""),
  subtitle: z.string().default(""),
  layout: z.enum(["cards", "list", "numbered", "twoColumn"]).default("cards"),
  emphasis: z.enum(["outcome", "metric"]).default("outcome"),
  items: z.array(gridItemSchema).default([]),
});

export const trustBadgeItemSchema = z
  .object({
    id: z.string(),
    icon: z.string().default(""),
    imageUrl: z.string().default(""),
    mediaAssetId: z.string().default(""),
    label: z.string().default(""),
    description: z.string().default(""),
    href: z.string().default(""),
  })
  .passthrough();

export const trustBadgesPropsSchema = z.object({
  title: z.string().default(""),
  subtitle: z.string().default(""),
  layout: z.enum(["grid", "inlineStrip", "compactRow"]).default("grid"),
  registrationNo: z.string().default(""),
  items: z.array(trustBadgeItemSchema).default([]),
});

export const logoItemSchema = z
  .object({
    id: z.string(),
    name: z.string().default(""),
    imageUrl: z.string().default(""),
    mediaAssetId: z.string().default(""),
    href: z.string().default(""),
    category: z.string().default(""),
  })
  .passthrough();

export const logoCloudPropsSchema = z.object({
  title: z.string().default(""),
  subtitle: z.string().default(""),
  displayMode: z.enum(["grid", "carousel", "marquee"]).default("grid"),
  columns: z.union([z.literal(3), z.literal(4), z.literal(5), z.literal(6)]).default(5),
  grayscale: z.boolean().default(true),
  grayscaleHover: z.boolean().default(true),
  autoplay: z.boolean().default(true),
  autoplayIntervalMs: z.coerce.number().default(4000),
  logoSize: z.enum(["sm", "md", "lg"]).default("md"),
  groupByCategory: z.boolean().default(false),
  showNames: z.boolean().default(false),
  items: z.array(logoItemSchema).default([]),
});

export const statItemSchema = z
  .object({
    id: z.string(),
    value: z.coerce.number().default(0),
    prefix: z.string().default(""),
    suffix: z.string().default(""),
    label: z.string().default(""),
    description: z.string().default(""),
    icon: z.string().default(""),
    chartType: z.enum(["none", "bar", "donut"]).default("none"),
    chartData: z.array(z.coerce.number()).default([]),
  })
  .passthrough();

export const statsCounterPropsSchema = z.object({
  title: z.string().default(""),
  subtitle: z.string().default(""),
  layout: z.enum(["row", "grid", "featuredCenter"]).default("grid"),
  animateOnView: z.boolean().default(true),
  items: z.array(statItemSchema).default([]),
});

export const beforeAfterPropsSchema = z.object({
  title: z.string().default(""),
  subtitle: z.string().default(""),
  layout: z.enum(["slider", "sideBySide", "stacked", "overlay"]).default("slider"),
  beforeLabel: z.string().default("Before"),
  afterLabel: z.string().default("After"),
  beforeImageUrl: z.string().default(""),
  beforeMediaAssetId: z.string().default(""),
  afterImageUrl: z.string().default(""),
  afterMediaAssetId: z.string().default(""),
  sliderPosition: z.coerce.number().min(0).max(100).default(50),
  showLabels: z.boolean().default(true),
});

export const heroLayoutSchema = z.enum(["centered", "splitImageLeft", "splitImageRight", "fullBleed"]);
export const heroAlignSchema = z.enum(["left", "center", "right"]);
export const heroMinHeightSchema = z.enum(["50vh", "70vh", "85vh"]);

export const extendedHeroPropsSchema = z.object({
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
  layout: heroLayoutSchema.default("centered"),
  align: heroAlignSchema.default("center"),
  minHeight: heroMinHeightSchema.default("70vh"),
  backgroundType: backgroundTypeSchema.default("image"),
  videoUrl: z.string().default(""),
  videoMediaAssetId: z.string().default(""),
  backgroundColor: z.string().default(""),
  overlayOpacity: z.coerce.number().min(0).max(100).default(60),
  /** Softly fade image/video/solid/gradient into the site page background */
  fadeIntoSiteBackground: z.boolean().default(false),
});

export const ctaLayoutSchema = z.enum(["centered", "split", "inline"]);
export const ctaSizeSchema = z.enum(["compact", "default", "large"]);

export const extendedCtaPropsSchema = z.object({
  title: z.string().default(""),
  subtitle: z.string().default(""),
  button: z.string().default(""),
  href: z.string().default("/contact"),
  secondaryButton: z.string().default(""),
  secondaryHref: z.string().default(""),
  layout: ctaLayoutSchema.default("centered"),
  size: ctaSizeSchema.default("default"),
  backgroundType: backgroundTypeSchema.default("gradient"),
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

export const tabbedShowcaseFeatureSchema = z
  .object({
    id: z.string(),
    icon: z.string().default(""),
    description: z.string().default(""),
  })
  .passthrough();

/** Entrance animation applied when a tab's visual composition becomes active. */
export const visualLayerAnimationTypeSchema = z.enum([
  "none",
  "fade",
  "scale",
  "fadeScale",
  "slideUp",
  "slideDown",
  "slideLeft",
  "slideRight",
  "fadeSlideUp",
  "fadeSlideDown",
  "fadeSlideLeft",
  "fadeSlideRight",
]);

export const visualLayerAnimationSchema = z.object({
  type: visualLayerAnimationTypeSchema.default("fade"),
  durationMs: z.coerce.number().min(0).max(5000).default(600),
  delayMs: z.coerce.number().min(0).max(5000).default(0),
  /** Slide distance in px for slide-based animations. */
  distance: z.coerce.number().min(0).max(400).default(24),
  /** Starting scale for scale-based animations. */
  fromScale: z.coerce.number().min(0).max(2).default(0.92),
  easing: z.enum(["easeOut", "easeInOut", "linear"]).default("easeOut"),
});

export const visualLayerSchema = z.object({
  id: z.string(),
  imageUrl: z.string().default(""),
  mediaAssetId: z.string().default(""),
  x: z.coerce.number().default(0),
  y: z.coerce.number().default(0),
  width: z.coerce.number().optional(),
  height: z.coerce.number().optional(),
  opacity: z.coerce.number().min(0).max(1).default(1),
  zIndex: z.coerce.number().default(0),
  scale: z.coerce.number().default(1),
  animation: visualLayerAnimationSchema.default({
    type: "fade",
    durationMs: 600,
    delayMs: 0,
    distance: 24,
    fromScale: 0.92,
    easing: "easeOut",
  }),
});

export const frameSequenceFrameSchema = z.object({
  id: z.string(),
  imageUrl: z.string().default(""),
  mediaAssetId: z.string().default(""),
});

export const frameSequenceSchema = z.object({
  id: z.string(),
  frames: z.array(frameSequenceFrameSchema).default([]),
  x: z.coerce.number().default(0),
  y: z.coerce.number().default(0),
  width: z.coerce.number().optional(),
  height: z.coerce.number().optional(),
  zIndex: z.coerce.number().default(10),
  fps: z.coerce.number().min(1).max(60).default(12),
  loop: z.boolean().default(true),
  animation: visualLayerAnimationSchema.default({
    type: "fade",
    durationMs: 600,
    delayMs: 0,
    distance: 24,
    fromScale: 0.92,
    easing: "easeOut",
  }),
});

export const tabbedShowcaseVisualSchema = z.object({
  stageAspectRatio: z.string().default("980/780"),
  layers: z.array(visualLayerSchema).default([]),
  sequences: z.array(frameSequenceSchema).default([]),
});

export const tabbedShowcaseTabSchema = z
  .object({
    id: z.string(),
    label: z.string().default(""),
    title: z.string().default(""),
    features: z.array(tabbedShowcaseFeatureSchema).default([]),
    visual: tabbedShowcaseVisualSchema.default({
      stageAspectRatio: "980/780",
      layers: [],
      sequences: [],
    }),
  })
  .passthrough();

export const tabbedShowcasePropsSchema = z.object({
  title: z.string().default(""),
  tabs: z.array(tabbedShowcaseTabSchema).default([]),
  showNavArrows: z.boolean().default(true),
});

export type GridItem = z.infer<typeof gridItemSchema>;
export type TrustBadgeItem = z.infer<typeof trustBadgeItemSchema>;
export type LogoItem = z.infer<typeof logoItemSchema>;
export type StatItem = z.infer<typeof statItemSchema>;
export type TabbedShowcaseFeature = z.infer<typeof tabbedShowcaseFeatureSchema>;
export type VisualLayerAnimationType = z.infer<typeof visualLayerAnimationTypeSchema>;
export type VisualLayerAnimation = z.infer<typeof visualLayerAnimationSchema>;
export type VisualLayer = z.infer<typeof visualLayerSchema>;
export type FrameSequenceFrame = z.infer<typeof frameSequenceFrameSchema>;
export type FrameSequence = z.infer<typeof frameSequenceSchema>;
export type TabbedShowcaseVisual = z.infer<typeof tabbedShowcaseVisualSchema>;
export type TabbedShowcaseTab = z.infer<typeof tabbedShowcaseTabSchema>;
export type TabbedShowcaseProps = z.infer<typeof tabbedShowcasePropsSchema>;

export function defaultVisualLayerAnimation(
  overrides: Partial<VisualLayerAnimation> = {},
): VisualLayerAnimation {
  return {
    type: "fade",
    durationMs: 600,
    delayMs: 0,
    distance: 24,
    fromScale: 0.92,
    easing: "easeOut",
    ...overrides,
  };
}
