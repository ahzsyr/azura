import type { MetadataRoute } from "next";
import { generateSitemap } from "@/features/seo/sitemap.service";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return generateSitemap();
}
