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

  return {
    ...settings,
    resolvedLogoUrl,
  };
}
