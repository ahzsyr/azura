import type { MetadataRoute } from "next";
import { generateSitemap } from "@/features/seo/sitemap.service";
import { getServerAppOrigin } from "@/lib/oauth-redirect-origin";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteOrigin = await getServerAppOrigin();
  return generateSitemap(siteOrigin);
}
