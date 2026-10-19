import type { MetadataRoute } from "next";
import { resolvePublishedSiteTheme } from "@/lib/theme/resolve-site-theme.server";
import {
  BROWSER_CHROME_FALLBACK,
  resolveBrowserProjection,
} from "@/lib/theme/browser-chrome-projection";
import { resolveSiteIdentityFromDb } from "@/lib/site-identity.server";
import { manifestIconsForUrl, omitMissingLocalIcon, resolveFaviconUrl } from "@/lib/metadata/favicon-url";
import { resolveExistingUploadDiskPath } from "@/lib/local-media-files";

export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  try {
    const [resolved, identity] = await Promise.all([
      resolvePublishedSiteTheme(),
      resolveSiteIdentityFromDb(),
    ]);

    const projection = resolveBrowserProjection(resolved.tokens);
    const iconUrl = omitMissingLocalIcon(
      resolveFaviconUrl(resolved.tokens?.faviconUrl || resolved.tokens?.logoUrl),
      (url) => resolveExistingUploadDiskPath(url) !== null,
    );

    const icons: MetadataRoute.Manifest["icons"] = iconUrl
      ? manifestIconsForUrl(iconUrl)
      : [];

    return {
      name: identity.brandName,
      short_name: identity.brandName,
      description: identity.tagline ?? identity.brandName,
      start_url: "/",
      display: "standalone",
      orientation: "portrait",
      theme_color: projection.themeColorLight,
      background_color: projection.backgroundColor,
      icons,
    };
  } catch {
    return {
      name: "Website",
      short_name: "Website",
      start_url: "/",
      display: "standalone",
      theme_color: BROWSER_CHROME_FALLBACK.themeColorLight,
      background_color: BROWSER_CHROME_FALLBACK.backgroundColor,
      icons: [],
    };
  }
}
