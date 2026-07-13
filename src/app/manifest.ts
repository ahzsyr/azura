import type { MetadataRoute } from "next";
import { resolvePublishedSiteTheme } from "@/lib/theme/resolve-site-theme.server";
import { resolveMobileBrowserTheme } from "@/lib/theme/resolve-mobile-browser-theme";
import { resolveSiteIdentityFromDb } from "@/lib/site-identity.server";
import { resolveFaviconUrl } from "@/lib/metadata/favicon-url";

export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  try {
    const [resolved, identity] = await Promise.all([
      resolvePublishedSiteTheme(),
      resolveSiteIdentityFromDb(),
    ]);

    const mobileBrowser = resolveMobileBrowserTheme(resolved.tokens);
    const iconUrl = resolveFaviconUrl(resolved.tokens?.faviconUrl || resolved.tokens?.logoUrl);

    const icons: MetadataRoute.Manifest["icons"] = iconUrl
      ? [
          { src: iconUrl, sizes: "any", type: "image/x-icon" },
          { src: iconUrl, sizes: "192x192", type: "image/png" },
          { src: iconUrl, sizes: "512x512", type: "image/png" },
        ]
      : [];

    return {
      name: identity.brandName,
      short_name: identity.brandName,
      description: identity.tagline ?? identity.brandName,
      start_url: "/",
      display: "standalone",
      orientation: "portrait",
      theme_color: mobileBrowser.themeColorLight,
      background_color: mobileBrowser.backgroundColor,
      icons,
    };
  } catch {
    return {
      name: "Website",
      short_name: "Website",
      start_url: "/",
      display: "standalone",
      theme_color: "#ffffff",
      background_color: "#ffffff",
      icons: [],
    };
  }
}
