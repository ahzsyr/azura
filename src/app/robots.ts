import type { MetadataRoute } from "next";
import { seoRepository } from "@/repositories/seo.repository";
import type { SeoGlobalConfig } from "@/features/seo/types";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function robots(): Promise<MetadataRoute.Robots> {
  let config: SeoGlobalConfig = {};
  try {
    config = await seoRepository.getGlobalConfig();
  } catch {
    // DB unavailable at build
  }

  const disallow = ["/admin/", "/api/", ...(config.additionalDisallow ?? [])];

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", ...(config.additionalAllow ?? [])],
        disallow,
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: config.host || siteUrl,
  };
}
