import type { MetadataRoute } from "next";
import { seoRepository } from "@/repositories/seo.repository";
import type { SeoGlobalConfig } from "@/features/seo/types";
import { resolveSitemapOriginSafe } from "@/features/seo/sitemap-origin";
import { forceApexOrigin } from "@/lib/preferred-host";

export default async function robots(): Promise<MetadataRoute.Robots> {
  let config: SeoGlobalConfig = {};
  try {
    config = await seoRepository.getGlobalConfig();
  } catch {
    // DB unavailable at build
  }

  const siteUrl = (await resolveSitemapOriginSafe()).replace(/\/$/, "");
  // Never block public media — Googlebot-Image / Video need /uploads/
  const disallow = ["/admin/", "/api/", ...(config.additionalDisallow ?? [])].filter(
    (path) => !path.replace(/\/$/, "").endsWith("/uploads") && path !== "/uploads/",
  );

  // Prefer configured public origin so Host never drifts to www twin of sitemap locs
  let host = siteUrl;
  if (config.host?.trim()) {
    try {
      const configured = new URL(
        config.host.trim().startsWith("http") ? config.host.trim() : `https://${config.host.trim()}`,
      ).origin.replace(/\/$/, "");
      const apexConfigured = forceApexOrigin(configured) ?? configured;
      // Only honor admin host when it matches the public origin (same registrable host)
      if (apexConfigured === siteUrl) host = apexConfigured;
    } catch {
      // keep siteUrl
    }
  }
  host = forceApexOrigin(host) ?? host;

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", ...(config.additionalAllow ?? [])],
        disallow,
      },
    ],
    sitemap: `${siteUrl}/sitemap_index.xml`,
    host,
  };
}
