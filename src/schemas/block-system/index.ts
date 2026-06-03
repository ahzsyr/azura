import { z } from "zod";
import type { BlockInstanceV2 } from "@/types/block-system";
import { blockTypeSchema } from "@/schemas/builder";
import { blockVisualSettingsSchema } from "@/schemas/visual-settings";

export const cssLengthSchema = z.union([z.string(), z.number()]);

export const blockLayoutStylesSchema = z
  .object({
    width: cssLengthSchema.optional(),
    maxWidth: cssLengthSchema.optional(),
    height: cssLengthSchema.optional(),
    minHeight: cssLengthSchema.optional(),
    sectionSpacing: cssLengthSchema.optional(),
    contentSpacing: cssLengthSchema.optional(),
    widthPreset: z.enum(["full", "fit", "custom"]).optional(),
    maxWidthPreset: z.enum(["full", "page", "wide", "narrow", "custom"]).optional(),
    minHeightPreset: z
      .enum(["auto", "40vh", "50vh", "75vh", "screen", "custom"])
      .optional(),
    sectionSpacingPreset: z
      .enum(["none", "compact", "default", "large", "custom"])
      .optional(),
  })
  .partial();

export const blockHeaderOverlaySchema = z
  .object({
    enabled: z.boolean().optional(),
    surface: z.enum(["transparent", "glass", "solid"]).optional(),
    contentInset: z.enum(["auto", "custom"]).optional(),
    paddingTop: z.string().optional(),
  })
  .partial();

export const blockTypographyStylesSchema = z
  .object({
    fontFamily: z.string().optional(),
    fontWeight: z.union([z.string(), z.number()]).optional(),
    fontSize: cssLengthSchema.optional(),
    letterSpacing: cssLengthSchema.optional(),
    lineHeight: z.union([cssLengthSchema, z.number()]).optional(),
    textTransform: z.enum(["none", "uppercase", "lowercase", "capitalize"]).optional(),
  })
  .partial();

export const blockColorStylesSchema = z
  .object({
    backgroundColor: z.string().optional(),
    textColor: z.string().optional(),
    borderColor: z.string().optional(),
    hoverBackgroundColor: z.string().optional(),
    hoverTextColor: z.string().optional(),
    hoverBorderColor: z.string().optional(),
  })
  .partial();

export const blockBorderStylesSchema = z
  .object({
    borderWidth: cssLengthSchema.optional(),
    borderRadius: cssLengthSchema.optional(),
    borderStyle: z.enum(["none", "solid", "dashed", "dotted"]).optional(),
  })
  .partial();

export const blockShadowStylesSchema = z
  .object({
    boxShadow: z.string().optional(),
    textShadow: z.string().optional(),
  })
  .partial();

export const blockEffectStylesSchema = z
  .object({
    blur: cssLengthSchema.optional(),
    opacity: z.number().min(0).max(1).optional(),
    brightness: z.number().optional(),
  })
  .partial();

export const blockPositionStylesSchema = z
  .object({
    position: z.enum(["relative", "absolute", "sticky", "fixed"]).optional(),
    zIndex: z.number().optional(),
    overflow: z.enum(["visible", "hidden", "auto", "scroll"]).optional(),
  })
  .partial();

export const blockCustomStylesSchema = z
  .object({
    className: z.string().optional(),
    cssVariables: z.record(z.string()).optional(),
    inlineCss: z.string().optional(),
    tokenOverrides: z
      .object({
        primaryColor: z.string().optional(),
        secondaryColor: z.string().optional(),
        bodyFont: z.string().optional(),
        headingFont: z.string().optional(),
        spacingScale: z.number().optional(),
      })
      .partial()
      .optional(),
  })
  .partial();

export const blockStyleSettingsSchema = blockLayoutStylesSchema
  .merge(blockTypographyStylesSchema)
  .merge(blockColorStylesSchema)
  .merge(blockBorderStylesSchema)
  .merge(blockShadowStylesSchema)
  .merge(blockEffectStylesSchema)
  .merge(blockPositionStylesSchema)
  .merge(blockCustomStylesSchema);

export const blockResponsiveOverrideSchema = blockStyleSettingsSchema.extend({
  hide: z.boolean().optional(),
  grid: z
    .object({
      columns: z.number().optional(),
      gap: cssLengthSchema.optional(),
    })
    .partial()
    .optional(),
  alignment: z.enum(["start", "center", "end", "stretch"]).optional(),
});

export const blockResponsiveSettingsSchema = z
  .object({
    desktop: blockResponsiveOverrideSchema.optional(),
    tablet: blockResponsiveOverrideSchema.optional(),
    mobile: blockResponsiveOverrideSchema.optional(),
  })
  .partial();

export const animationTypeSchema = z.enum([
  "fade",
  "slide",
  "zoom",
  "rotate",
  "scale",
  "bounce",
  "none",
]);

export const blockAnimationPhaseSchema = z
  .object({
    type: animationTypeSchema.optional(),
    durationMs: z.number().optional(),
    delayMs: z.number().optional(),
    easing: z.string().optional(),
    triggerPoint: z.string().optional(),
  })
  .partial();

export const blockAnimationSettingsSchema = z
  .object({
    entrance: blockAnimationPhaseSchema.optional(),
    exit: blockAnimationPhaseSchema.optional(),
    hover: blockAnimationPhaseSchema.optional(),
    scroll: blockAnimationPhaseSchema.optional(),
    enabled: z.boolean().optional(),
  })
  .partial();

export const blockVisibilityRulesSchema = z
  .object({
    loggedIn: z.boolean().nullable().optional(),
    loggedOut: z.boolean().nullable().optional(),
    roles: z.array(z.string()).optional(),
    locales: z.array(z.string()).optional(),
    languages: z.array(z.string()).optional(),
    devices: z.array(z.enum(["desktop", "tablet", "mobile"])).optional(),
    dateRange: z.object({ start: z.string().optional(), end: z.string().optional() }).optional(),
    timeRange: z.object({ start: z.string().optional(), end: z.string().optional() }).optional(),
    featureFlags: z.array(z.string()).optional(),
    urlConditions: z
      .array(
        z.object({
          match: z.enum(["exact", "prefix", "regex"]).optional(),
          pattern: z.string().optional(),
        })
      )
      .optional(),
  })
  .partial();

export const blockSeoSettingsSchema = z
  .object({
    structuredData: z.record(z.unknown()).optional(),
    schemaOrgType: z.string().optional(),
    canonicalOverride: z.string().optional(),
    openGraph: z
      .object({
        title: z.string().optional(),
        description: z.string().optional(),
        image: z.string().optional(),
      })
      .optional(),
    indexing: z.enum(["index", "noindex", "follow", "nofollow"]).optional(),
  })
  .partial();

export const blockLocalizationSettingsSchema = z
  .object({
    translations: z.record(z.record(z.string())).optional(),
    localeStyles: z.record(blockStyleSettingsSchema).optional(),
    localeVisibility: z.record(blockVisibilityRulesSchema).optional(),
    fallbackChain: z.array(z.string()).optional(),
  })
  .partial();

export const blockInstanceV2Schema: z.ZodType<BlockInstanceV2> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    type: blockTypeSchema,
    version: z.string(),
    settings: z.record(z.unknown()),
    styles: blockStyleSettingsSchema.optional(),
    responsive: blockResponsiveSettingsSchema.optional(),
    localization: blockLocalizationSettingsSchema.optional(),
    visibility: blockVisibilityRulesSchema.optional(),
    seo: blockSeoSettingsSchema.optional(),
    animation: blockAnimationSettingsSchema.optional(),
    visual: blockVisualSettingsSchema.optional(),
    children: z.array(blockInstanceV2Schema).optional(),
  })
) as z.ZodType<BlockInstanceV2>;

export const pageBlockInstancesSchema = z.array(blockInstanceV2Schema);
