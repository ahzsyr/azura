import { z } from "zod";
import { sectionBackgroundSchema } from "@/schemas/visual-settings";

export const PRELOADER_ANIMATIONS = [
  "orbit",
  "pulse",
  "wave",
  "scan",
  "hex",
  "bars",
  "glitch",
  "dots",
] as const;

export const PRELOADER_CENTER_TYPES = ["logo", "text", "emoji", "icon", "svg"] as const;

export const PRELOADER_MODES = ["both", "initialOnly", "navigationOnly"] as const;

export type PreloaderAnimation = (typeof PRELOADER_ANIMATIONS)[number];
export type PreloaderCenterType = (typeof PRELOADER_CENTER_TYPES)[number];
export type PreloaderMode = (typeof PRELOADER_MODES)[number];
export type PreloaderBackground = z.infer<typeof sectionBackgroundSchema>;

export const DEFAULT_PRELOADER_BACKGROUND: PreloaderBackground = { type: "glass" };

export const sitePreloaderSchema = z.object({
  enabled: z.boolean(),
  mode: z.enum(PRELOADER_MODES),
  animation: z.enum(PRELOADER_ANIMATIONS),
  centerType: z.enum(PRELOADER_CENTER_TYPES),
  centerText: z.string(),
  centerEmoji: z.string(),
  centerIcon: z.string(),
  centerSvgUrl: z.string(),
  message: z.string(),
  /** Same kinds as block section backgrounds. Glass is the default. */
  background: sectionBackgroundSchema,
  /** Legacy solid color. Kept in sync when background type is color. */
  backgroundColor: z.string(),
  primaryColor: z.string(),
  accentColor: z.string(),
  animationSpeed: z.number().min(0.5).max(2),
  minDurationMs: z.number().min(0).max(5000),
  maxDurationMs: z.number().min(1000).max(30000),
});

export type SitePreloaderSettings = z.infer<typeof sitePreloaderSchema>;

export const DEFAULT_SITE_PRELOADER: SitePreloaderSettings = {
  enabled: true,
  mode: "initialOnly",
  animation: "pulse",
  centerType: "logo",
  centerText: "",
  centerEmoji: "✨",
  centerIcon: "Loader2",
  centerSvgUrl: "",
  message: "",
  background: DEFAULT_PRELOADER_BACKGROUND,
  backgroundColor: "",
  primaryColor: "",
  accentColor: "",
  animationSpeed: 1,
  minDurationMs: 200,
  /** UX escape hatch — dismiss overlay; never hide main content after this. */
  maxDurationMs: 4000,
};

function explicitBackground(raw: Record<string, unknown>): PreloaderBackground | null {
  const background = raw.background;
  if (!background || typeof background !== "object" || Array.isArray(background)) return null;
  const parsed = sectionBackgroundSchema.safeParse(background);
  if (!parsed.success || !parsed.data.type) return null;
  return parsed.data;
}

export function parseSitePreloaderSettings(raw: unknown): SitePreloaderSettings {
  const record =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const merged = { ...DEFAULT_SITE_PRELOADER, ...record };
  const parsed = sitePreloaderSchema.safeParse(merged);
  const base = parsed.success ? parsed.data : { ...DEFAULT_SITE_PRELOADER };
  const background = explicitBackground(record);
  if (background) {
    return {
      ...base,
      background,
      backgroundColor:
        background.type === "color" ? background.color?.trim() || "" : base.backgroundColor,
    };
  }
  const legacy =
    typeof record.backgroundColor === "string" ? record.backgroundColor.trim() : "";
  if (legacy) {
    return {
      ...base,
      background: { type: "color", color: legacy },
      backgroundColor: legacy,
    };
  }
  return { ...base, background: { ...DEFAULT_PRELOADER_BACKGROUND } };
}

export function preloaderShowsOnInitialLoad(mode: PreloaderMode): boolean {
  return mode === "both" || mode === "initialOnly";
}

export function preloaderShowsOnNavigation(mode: PreloaderMode): boolean {
  return mode === "both" || mode === "navigationOnly";
}
