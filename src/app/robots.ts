import type { MetadataRoute } from "next";
import { seoRepository } from "@/repositories/seo.repository";
import type { SeoGlobalConfig } from "@/features/seo/types";
import { resolveSiteOrigin } from "@/features/seo/resolve-site-origin";

export default async function robots(): Promise<MetadataRoute.Robots> {
  let config: SeoGlobalConfig = {};
  try {
    config = await seoRepository.getGlobalConfig();
  } catch {
    // DB unavailable at build
  }

  const siteUrl = (await resolveSiteOrigin("sitemap")).replace(/\/$/, "");
  const disallow = ["/admin/", "/api/", ...(config.additionalDisallow ?? [])];

  // Prefer configured public origin so Host never drifts to www twin of sitemap locs
  let host = siteUrl;
  if (config.host?.trim()) {
    try {
      const configured = new URL(
        config.host.trim().startsWith("http") ? config.host.trim() : `https://${config.host.trim()}`,
      ).origin.replace(/\/$/, "");
      // Only honor admin host when it matches the public origin (same host form)
      if (configured === siteUrl) host = configured;
    } catch {
      // keep siteUrl
    }
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", ...(config.additionalAllow ?? [])],
        disallow,
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host,
  };
}
