import { z } from "zod";

export const cardVariantSchema = z.enum(["default", "compact", "minimal", "featured"]);
export const layoutModeSchema = z.enum(["grid", "slider", "list"]);
export const columnsSchema = z.union([z.literal(2), z.literal(3), z.literal(4)]);

export const displaySettingsSchema = z.object({
  cardVariant: cardVariantSchema.default("default"),
  layoutMode: layoutModeSchema.default("grid"),
  columns: columnsSchema.default(3),
  limit: z.coerce.number().default(6),
  showViewAllLink: z.boolean().default(true),
  showPrice: z.boolean().default(true),
  showDuration: z.boolean().default(true),
  showCategory: z.boolean().default(true),
  showStars: z.boolean().default(true),
  showCity: z.boolean().default(true),
  showIcon: z.boolean().default(true),
  showExcerpt: z.boolean().default(true),
  showBadges: z.boolean().default(true),
  showFeaturedBadge: z.boolean().default(true),
  autoplay: z.boolean().default(false),
  autoplayIntervalMs: z.coerce.number().default(5000),
  /** Per-field visibility overrides keyed by attribute name */
  visibleFields: z.array(z.string()).default([]),
  hiddenFields: z.array(z.string()).default([]),
});

export type DisplaySettings = z.infer<typeof displaySettingsSchema>;
export type CardVariant = z.infer<typeof cardVariantSchema>;
export type LayoutMode = z.infer<typeof layoutModeSchema>;

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = displaySettingsSchema.parse({});

export const contentBlockPropsSchema = z.object({
  contentTypeSlug: z.string().default("catalog-items"),
  collectionSlug: z.string().default(""),
  titleEn: z.string().default(""),
  titleAr: z.string().default(""),
  subtitleEn: z.string().default(""),
  subtitleAr: z.string().default(""),
  featuredOnly: z.boolean().default(false),
  manualIds: z.array(z.string()).default([]),
  limit: z.coerce.number().default(6),
  attributeFilters: z.record(z.string()).default({}),
  displaySettings: displaySettingsSchema.default(DEFAULT_DISPLAY_SETTINGS),
  viewAllHref: z.string().default(""),
  emptyMessageEn: z.string().default(""),
  emptyMessageAr: z.string().default(""),
});

export type ContentBlockProps = z.infer<typeof contentBlockPropsSchema>;

export function mergeDisplaySettings(
  partial?: Partial<DisplaySettings> | Record<string, unknown> | null
): DisplaySettings {
  const result = displaySettingsSchema.safeParse({ ...DEFAULT_DISPLAY_SETTINGS, ...partial });
  return result.success ? result.data : DEFAULT_DISPLAY_SETTINGS;
}
