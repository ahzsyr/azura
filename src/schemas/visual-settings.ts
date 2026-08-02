import { z } from "zod";

export type VisualInheritMode = "inherit" | "off" | "custom";

export const visualInheritModeSchema = z.enum(["inherit", "off", "custom"]);

export const pageVisualSettingsSchema = z
  .object({
    siteEffects: z
      .object({
        background: visualInheritModeSchema.optional(),
        cursor: visualInheritModeSchema.optional(),
        text: visualInheritModeSchema.optional(),
      })
      .partial()
      .optional(),
    backgroundEffect: z.string().nullable().optional(),
    cursorEffect: z.string().nullable().optional(),
    textEffect: z.string().nullable().optional(),
    animationsEnabled: z.boolean().nullable().optional(),
  })
  .partial();

export type PageVisualSettings = z.infer<typeof pageVisualSettingsSchema>;

export const sectionBackgroundSchema = z
  .object({
    type: z
      .enum(["none", "color", "gradient", "image", "pattern", "particles", "grid", "glass"])
      .optional(),
    color: z.string().optional(),
    gradient: z.string().optional(),
    imageUrl: z.string().optional(),
    mediaAssetId: z.string().optional(),
    /** Animated/static pattern id (grid, particles, circuit, aurora, …) */
    pattern: z.string().optional(),
    overlayOpacity: z.number().min(0).max(1).optional(),
    glassBlur: z.string().optional(),
  })
  .partial();

export const blockVisualSettingsSchema = z
  .object({
    siteEffects: z
      .object({
        cursor: z.enum(["inherit", "off"]).optional(),
        text: z.enum(["inherit", "off", "custom"]).optional(),
      })
      .partial()
      .optional(),
    textEffect: z.string().nullable().optional(),
    headingTextEffect: z.union([z.literal("inherit"), z.literal("none"), z.string()]).optional(),
    sectionBackground: sectionBackgroundSchema.optional(),
  })
  .partial();

export type BlockVisualSettings = z.infer<typeof blockVisualSettingsSchema>;

export function parsePageVisualSettings(raw: unknown): PageVisualSettings {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const result = pageVisualSettingsSchema.safeParse(raw);
  return result.success ? result.data : {};
}

export function parseBlockVisualSettings(raw: unknown): BlockVisualSettings {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const result = blockVisualSettingsSchema.safeParse(raw);
  return result.success ? result.data : {};
}

export const DEFAULT_PAGE_VISUAL_SETTINGS: PageVisualSettings = {};
