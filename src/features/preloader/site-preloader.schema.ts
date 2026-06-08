import { z } from "zod";

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
  mode: "both",
  animation: "pulse",
  centerType: "logo",
  centerText: "",
  centerEmoji: "✨",
  centerIcon: "Loader2",
  centerSvgUrl: "",
  message: "",
  backgroundColor: "",
  primaryColor: "",
  accentColor: "",
  animationSpeed: 1,
  minDurationMs: 400,
  maxDurationMs: 12000,
};

export function parseSitePreloaderSettings(raw: unknown): SitePreloaderSettings {
  const merged =
    raw && typeof raw === "object"
      ? { ...DEFAULT_SITE_PRELOADER, ...(raw as Record<string, unknown>) }
      : DEFAULT_SITE_PRELOADER;
  const parsed = sitePreloaderSchema.safeParse(merged);
  return parsed.success ? parsed.data : DEFAULT_SITE_PRELOADER;
}

export function preloaderShowsOnInitialLoad(mode: PreloaderMode): boolean {
  return mode === "both" || mode === "initialOnly";
}

export function preloaderShowsOnNavigation(mode: PreloaderMode): boolean {
  return mode === "both" || mode === "navigationOnly";
}
