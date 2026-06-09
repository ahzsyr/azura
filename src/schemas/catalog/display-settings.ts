import { z } from "zod";

export const cardVariantSchema = z.enum(["default", "compact", "minimal", "featured"]);
export const layoutModeSchema = z.enum(["grid", "slider"]);
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
  autoplay: z.boolean().default(false),
  autoplayIntervalMs: z.coerce.number().default(5000),
});

export type DisplaySettings = z.infer<typeof displaySettingsSchema>;
export type CardVariant = z.infer<typeof cardVariantSchema>;
export type LayoutMode = z.infer<typeof layoutModeSchema>;

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = displaySettingsSchema.parse({});

export const catalogSourceSchema = z.enum(["packages", "hotels", "services"]);

export const catalogPropsSchema = z.object({
  source: catalogSourceSchema.default("packages"),
  titleEn: z.string().default(""),
  titleAr: z.string().default(""),
  subtitleEn: z.string().default(""),
  subtitleAr: z.string().default(""),
  categorySlug: z.string().default(""),
  city: z.enum(["MAKKAH", "MADINAH", ""]).default(""),
  serviceType: z.enum(["TRANSPORT", "AIRPORT_PICKUP", "HOTEL", "OTHER", ""]).default(""),
  featuredOnly: z.boolean().default(false),
  manualIds: z.array(z.string()).default([]),
  limit: z.coerce.number().default(6),
  displaySettings: displaySettingsSchema.default(DEFAULT_DISPLAY_SETTINGS),
  viewAllHref: z.string().default(""),
  emptyMessageEn: z.string().default(""),
  emptyMessageAr: z.string().default(""),
});

export type CatalogProps = z.infer<typeof catalogPropsSchema>;

export const CATALOG_DISPLAY_DEFAULTS_KEY = "defaults";

export function mergeDisplaySettings(
  partial?: Partial<DisplaySettings> | Record<string, unknown> | null
): DisplaySettings {
  // #region agent log
  const merged = { ...DEFAULT_DISPLAY_SETTINGS, ...partial };
  const result = displaySettingsSchema.safeParse(merged);
  if (!result.success) {
    fetch('http://127.0.0.1:7300/ingest/df4ee46a-c9a3-41ec-a748-5c05bd29eec9',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'183f3a'},body:JSON.stringify({sessionId:'183f3a',runId:'run1',hypothesisId:'A',location:'catalog/display-settings.ts:mergeDisplaySettings',message:'safeParse FAILED — using DEFAULT_DISPLAY_SETTINGS fallback',data:{cardVariant:(partial as Record<string,unknown>)?.cardVariant,layoutMode:(partial as Record<string,unknown>)?.layoutMode,zodError:result.error.issues.map(i=>i.message).join('; ')},timestamp:Date.now()})}).catch(()=>{});
  } else {
    fetch('http://127.0.0.1:7300/ingest/df4ee46a-c9a3-41ec-a748-5c05bd29eec9',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'183f3a'},body:JSON.stringify({sessionId:'183f3a',runId:'run1',hypothesisId:'A',location:'catalog/display-settings.ts:mergeDisplaySettings',message:'safeParse OK',data:{cardVariant:result.data.cardVariant,layoutMode:result.data.layoutMode},timestamp:Date.now()})}).catch(()=>{});
  }
  // #endregion
  return result.success ? result.data : DEFAULT_DISPLAY_SETTINGS;
}
