import type { MetadataRoute } from "next";
import { generateSitemap } from "@/features/seo/sitemap.service";
import { resolveSiteOrigin } from "@/features/seo/resolve-site-origin";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteOrigin = await resolveSiteOrigin("sitemap");
  return generateSitemap(siteOrigin);
}
