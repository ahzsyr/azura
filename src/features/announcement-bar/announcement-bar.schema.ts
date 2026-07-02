import { z } from "zod";
import { newId } from "@/features/builder/blocks/marketing/schemas/marketing-blocks";

export const announcementBarToneSchema = z.enum(["accent", "dark", "light", "muted", "gold"]);
export const announcementScrollSpeedSchema = z.enum(["slow", "medium", "fast"]);
export const announcementDirectionSchema = z.enum(["left", "right"]);
export const announcementVariantSchema = z.enum(["slim", "comfortable"]);
export const announcementTextTransformSchema = z.enum([
  "uppercase",
  "lowercase",
  "capitalize",
  "none",
]);
export const announcementBadgeStyleSchema = z.enum(["default", "rounded", "pill"]);
export const announcementEntranceAnimationSchema = z.enum(["slide-down", "fade", "none"]);

export const announcementItemSchema = z
  .object({
    id: z.string().default(() => newId("ab")),
    message: z.string().default(""),
    title: z.string().default(""),
    description: z.string().default(""),
    linkUrl: z.string().default(""),
    icon: z.string().default(""),
    badge: z.string().default(""),
  })
  /** Preserve per-locale suffixed keys (messageEn, messageFr, badgeAr, …) from block editors. */
  .passthrough();

export const announcementBarVisualSchema = z.object({
  barBackground: z.string().default(""),
  barBackgroundGradient: z.boolean().default(false),
  gradientStart: z.string().default(""),
  gradientEnd: z.string().default(""),
  textColor: z.string().default(""),
  linkColor: z.string().default(""),
  linkHoverColor: z.string().default(""),
  separatorColor: z.string().default(""),
  borderTopColor: z.string().default(""),
  borderBottomColor: z.string().default(""),
  borderWidth: z.string().default(""),
  fontSize: z.string().default(""),
  fontWeight: z.string().default(""),
  letterSpacing: z.string().default(""),
  textTransform: announcementTextTransformSchema.default("uppercase"),
  borderRadius: z.string().default(""),
  showIcons: z.boolean().default(true),
  iconSize: z.string().default(""),
  iconPosition: z.enum(["left", "right"]).default("left"),
  showBadges: z.boolean().default(true),
  badgeStyle: announcementBadgeStyleSchema.default("default"),
  badgeColor: z.string().default(""),
  badgeBackground: z.string().default(""),
});

export const announcementBarLayoutSchema = z.object({
  containerMaxWidth: z.string().default(""),
  containerPadding: z.string().default(""),
  stackOnMobile: z.boolean().default(false),
  showCloseButton: z.boolean().default(true),
  closeButtonPosition: z.enum(["left", "right"]).default("right"),
  persistent: z.boolean().default(false),
  zIndex: z.coerce.number().optional(),
  topOffset: z.string().default(""),
  sticky: z.boolean().default(false),
  stickyOnScroll: z.boolean().default(false),
  stickyOffset: z.coerce.number().default(0),
});

export const announcementBarAnimationsSchema = z.object({
  scrollSpeedCustom: z.coerce.number().optional(),
  /** 100 = default speed; lower = slower, higher = faster (25–400). */
  scrollSpeedPercent: z.coerce.number().min(25).max(400).default(100),
  easing: z.string().default(""),
  entranceAnimation: announcementEntranceAnimationSchema.default("slide-down"),
  animationDuration: z.coerce.number().default(0.5),
  hoverPause: z.boolean().default(true),
  hoverScale: z.boolean().default(false),
  blinkEffect: z.boolean().default(false),
  blinkSpeed: z.coerce.number().default(1),
});

export const announcementBarInteractiveSchema = z.object({
  closeAfterSeconds: z.coerce.number().optional(),
  showProgress: z.boolean().default(false),
  progressColor: z.string().default(""),
  progressHeight: z.string().default(""),
  multipleLines: z.boolean().default(false),
  lineClamp: z.coerce.number().optional(),
  truncateText: z.boolean().default(false),
});

export const announcementBarResponsiveSchema = z.object({
  breakpointTablet: z.string().default("768px"),
  breakpointMobile: z.string().default(""),
  mobileFontSize: z.string().default(""),
  mobilePadding: z.string().default(""),
  hideOnMobile: z.boolean().default(false),
  mobileSpeed: announcementScrollSpeedSchema.optional(),
});

export const announcementBarAdvancedSchema = z.object({
  containerClass: z.string().default(""),
  customCss: z.string().default(""),
  dataAttributes: z.record(z.string(), z.string()).default({}),
  ariaLabel: z.string().default(""),
  lazyLoad: z.boolean().default(false),
  priority: z.boolean().default(false),
  analyticsEvents: z.boolean().default(false),
  analyticsCategory: z.string().default("bar"),
});

export const announcementBarPropsSchema = z.object({
  variant: announcementVariantSchema.default("slim"),
  barTone: announcementBarToneSchema.default("accent"),
  scrollSpeed: announcementScrollSpeedSchema.default("medium"),
  direction: announcementDirectionSchema.default("left"),
  pauseOnHover: z.boolean().default(true),
  showEdgeFade: z.boolean().default(true),
  separator: z.string().default(""),
  items: z.array(announcementItemSchema).default([]),
  visual: announcementBarVisualSchema.default({}),
  layout: announcementBarLayoutSchema.default({}),
  animations: announcementBarAnimationsSchema.default({}),
  interactive: announcementBarInteractiveSchema.default({}),
  responsive: announcementBarResponsiveSchema.default({}),
  advanced: announcementBarAdvancedSchema.default({}),
});

export type AnnouncementItem = z.infer<typeof announcementItemSchema>;
export type AnnouncementBarProps = z.infer<typeof announcementBarPropsSchema>;
export type AnnouncementBarVisual = z.infer<typeof announcementBarVisualSchema>;
export type AnnouncementBarLayout = z.infer<typeof announcementBarLayoutSchema>;
export type AnnouncementBarAnimations = z.infer<typeof announcementBarAnimationsSchema>;
export type AnnouncementBarInteractive = z.infer<typeof announcementBarInteractiveSchema>;
export type AnnouncementBarResponsive = z.infer<typeof announcementBarResponsiveSchema>;
export type AnnouncementBarAdvanced = z.infer<typeof announcementBarAdvancedSchema>;

export const DEFAULT_ANNOUNCEMENT_BAR_ITEMS: AnnouncementItem[] = [
  { id: newId("ab"), message: "99.97% Network Uptime SLA", title: "", description: "", linkUrl: "", icon: "", badge: "" },
  { id: newId("ab"), message: "Fiber & Wireless Last-Mile Delivery", title: "", description: "", linkUrl: "", icon: "", badge: "" },
  { id: newId("ab"), message: "24 / 7 NOC Monitoring", title: "", description: "", linkUrl: "", icon: "", badge: "" },
  { id: newId("ab"), message: "Enterprise & SME Solutions", title: "", description: "", linkUrl: "", icon: "", badge: "" },
  { id: newId("ab"), message: "Nationwide Coverage", title: "", description: "", linkUrl: "", icon: "", badge: "" },
];

export const DEFAULT_ANNOUNCEMENT_BAR_PROPS: AnnouncementBarProps = announcementBarPropsSchema.parse({
  variant: "slim",
  barTone: "accent",
  scrollSpeed: "medium",
  direction: "left",
  pauseOnHover: true,
  showEdgeFade: true,
  separator: "◈",
  items: DEFAULT_ANNOUNCEMENT_BAR_ITEMS,
  layout: { showCloseButton: true, persistent: false },
});
