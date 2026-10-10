import {
  DEFAULT_SITE_PRELOADER,
  parseSitePreloaderSettings,
  type SitePreloaderSettings,
} from "@/features/preloader/site-preloader.schema";

export type ResolvedSitePreloader = SitePreloaderSettings & {
  resolvedLogoUrl: string | null;
};

type ResolveOptions = {
  themeLogoUrl?: string | null;
  brandLogoLightUrl?: string | null;
  brandLogoDarkUrl?: string | null;
  fallbackBackgroundColor?: string | null;
};

export function resolveSitePreloader(
  siteSettings: Record<string, unknown> | null | undefined,
  options: ResolveOptions = {},
): ResolvedSitePreloader {
  const raw = siteSettings?.sitePreloader;
  const settings = parseSitePreloaderSettings(
    raw && typeof raw === "object" ? { ...DEFAULT_SITE_PRELOADER, ...raw } : DEFAULT_SITE_PRELOADER,
  );

  const resolvedLogoUrl =
    settings.centerType === "logo"
      ? options.themeLogoUrl?.trim() ||
        options.brandLogoLightUrl?.trim() ||
        options.brandLogoDarkUrl?.trim() ||
        null
      : null;

  const background = settings.background?.type
    ? settings.background
    : { type: "glass" as const };
  const backgroundColor =
    background.type === "color"
      ? background.color?.trim() ||
        settings.backgroundColor.trim() ||
        options.fallbackBackgroundColor?.trim() ||
        ""
      : "";

  return {
    ...settings,
    /** Cap overlay lifetime — timeout is UX escape hatch, not a content-load budget. */
    maxDurationMs: Math.min(settings.maxDurationMs, 4000),
    background:
      background.type === "color" ? { ...background, color: backgroundColor || background.color } : background,
    backgroundColor,
    resolvedLogoUrl,
  };
}
