import { z } from "zod";

export const popupTypeSchema = z.enum([
  "floatingButton",
  "modal",
  "slideIn",
  "promo",
]);

export const popupPositionSchema = z.enum([
  "bottom-start",
  "bottom-end",
  "top-start",
  "top-end",
  "center",
  "left",
  "right",
  "top",
  "bottom",
  "custom",
]);

export const popupTriggerTypeSchema = z.enum([
  "pageLoad",
  "scrollPercent",
  "exitIntent",
  "delayMs",
  "click",
]);

export const popupAnimationSchema = z.enum([
  "none",
  "fade",
  "slide",
  "scale",
  "bounce",
]);

export const popupFrequencyModeSchema = z.enum([
  "always",
  "once",
  "session",
  "daily",
  "custom",
]);

export const popupPageTargetingModeSchema = z.enum(["all", "include", "exclude"]);

export const popupCtaSchema = z.object({
  label: z.string().default(""),
  href: z.string().default(""),
  openInNewTab: z.boolean().default(false),
  variant: z.enum(["primary", "secondary", "ghost", "outline"]).default("primary"),
});

export const popupContentBlockSchema = z.object({
  id: z.string(),
  type: z.enum(["text", "image", "video", "html", "spacer"]).default("text"),
  text: z.string().default(""),
  html: z.string().default(""),
  imageUrl: z.string().default(""),
  imageAlt: z.string().default(""),
  videoUrl: z.string().default(""),
  heightPx: z.coerce.number().default(16),
});

export const popupDesignSchema = z.object({
  backgroundColor: z.string().default(""),
  textColor: z.string().default(""),
  accentColor: z.string().default(""),
  icon: z.string().default(""),
  iconUrl: z.string().default(""),
  fontSize: z.coerce.number().default(14),
  fontWeight: z.coerce.number().default(500),
  fontFamily: z.string().default(""),
  borderRadius: z.coerce.number().default(16),
  borderWidth: z.coerce.number().default(1),
  borderColor: z.string().default(""),
  boxShadow: z.string().default(""),
  padding: z.coerce.number().default(16),
  width: z.coerce.number().default(0),
  maxWidth: z.coerce.number().default(420),
  minHeight: z.coerce.number().default(0),
  animation: popupAnimationSchema.default("fade"),
  animationDurationMs: z.coerce.number().default(280),
});

export const popupCustomOffsetSchema = z.object({
  top: z.coerce.number().default(0),
  right: z.coerce.number().default(0),
  bottom: z.coerce.number().default(0),
  left: z.coerce.number().default(0),
});

export const popupDeviceTargetingSchema = z.object({
  desktop: z.boolean().default(true),
  tablet: z.boolean().default(true),
  mobile: z.boolean().default(true),
});

export const popupPageTargetingSchema = z.object({
  mode: popupPageTargetingModeSchema.default("all"),
  paths: z.array(z.string()).default([]),
});

export const popupTriggerSchema = z.object({
  type: popupTriggerTypeSchema.default("pageLoad"),
  value: z.coerce.number().default(0),
  clickSelector: z.string().default(""),
});

export const popupScheduleSchema = z.object({
  enabled: z.boolean().default(false),
  startAt: z.string().default(""),
  endAt: z.string().default(""),
});

export const popupFrequencySchema = z.object({
  mode: popupFrequencyModeSchema.default("session"),
  maxImpressions: z.coerce.number().default(1),
  cooldownHours: z.coerce.number().default(24),
  storageKey: z.string().default(""),
});

export const popupContentSchema = z.object({
  title: z.string().default(""),
  subtitle: z.string().default(""),
  body: z.string().default(""),
  bodyHtml: z.string().default(""),
  imageUrl: z.string().default(""),
  imageAlt: z.string().default(""),
  videoUrl: z.string().default(""),
  primaryCta: popupCtaSchema.default({}),
  secondaryCta: popupCtaSchema.default({}),
  blocks: z.array(popupContentBlockSchema).default([]),
});

export const popupItemSchema = z.object({
  id: z.string(),
  name: z.string().default("Untitled popup"),
  enabled: z.boolean().default(true),
  type: popupTypeSchema.default("modal"),
  position: popupPositionSchema.default("bottom-end"),
  customOffset: popupCustomOffsetSchema.default({}),
  devices: popupDeviceTargetingSchema.default({}),
  pageTargeting: popupPageTargetingSchema.default({}),
  design: popupDesignSchema.default({}),
  content: popupContentSchema.default({}),
  trigger: popupTriggerSchema.default({}),
  schedule: popupScheduleSchema.default({}),
  frequency: popupFrequencySchema.default({}),
  dismissible: z.boolean().default(true),
  dismissKey: z.string().default(""),
  linkedPopupId: z.string().default(""),
  zIndex: z.coerce.number().default(8500),
});

export type PopupType = z.infer<typeof popupTypeSchema>;
export type PopupPosition = z.infer<typeof popupPositionSchema>;
export type PopupTriggerType = z.infer<typeof popupTriggerTypeSchema>;
export type PopupAnimation = z.infer<typeof popupAnimationSchema>;
export type PopupFrequencyMode = z.infer<typeof popupFrequencyModeSchema>;
export type PopupCta = z.infer<typeof popupCtaSchema>;
export type PopupContentBlock = z.infer<typeof popupContentBlockSchema>;
export type PopupDesign = z.infer<typeof popupDesignSchema>;
export type PopupCustomOffset = z.infer<typeof popupCustomOffsetSchema>;
export type PopupDeviceTargeting = z.infer<typeof popupDeviceTargetingSchema>;
export type PopupPageTargeting = z.infer<typeof popupPageTargetingSchema>;
export type PopupTrigger = z.infer<typeof popupTriggerSchema>;
export type PopupSchedule = z.infer<typeof popupScheduleSchema>;
export type PopupFrequency = z.infer<typeof popupFrequencySchema>;
export type PopupContent = z.infer<typeof popupContentSchema>;
export type PopupItem = z.infer<typeof popupItemSchema>;

export function createDefaultPopupItem(partial?: Partial<PopupItem>): PopupItem {
  const id = partial?.id ?? crypto.randomUUID();
  return popupItemSchema.parse({
    id,
    name: "New popup",
    dismissKey: `popup-${id.slice(0, 8)}`,
    frequency: {
      mode: "session",
      maxImpressions: 1,
      cooldownHours: 24,
      storageKey: `popup-${id.slice(0, 8)}`,
    },
    ...partial,
  });
}

export function normalizePopupItem(raw: unknown, index: number): PopupItem | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const id =
    typeof record.id === "string" && record.id.trim()
      ? record.id
      : crypto.randomUUID();
  const parsed = popupItemSchema.safeParse({
    ...createDefaultPopupItem({ id }),
    ...record,
    id,
  });
  if (!parsed.success) {
    return createDefaultPopupItem({
      id,
      name: typeof record.name === "string" ? record.name : `Popup ${index + 1}`,
    });
  }
  return parsed.data;
}
