import { NextResponse } from "next/server";
import {
  formatSitemapIndexXml,
  minimalSitemapIndexXml,
  SITEMAP_XML_HEADERS,
} from "@/features/seo/sitemap-index.service";
import { resolveSitemapOriginSafe } from "@/features/seo/sitemap-origin";

export const maxDuration = 60;

export async function GET() {
  try {
    const siteOrigin = (await resolveSitemapOriginSafe()).replace(/\/$/, "");
    const xml = await formatSitemapIndexXml(siteOrigin);
    return new NextResponse(xml, { status: 200, headers: SITEMAP_XML_HEADERS });
  } catch (error) {
    console.error("[sitemap] index generation failed, returning minimal XML:", error);
    try {
      const siteOrigin = (await resolveSitemapOriginSafe()).replace(/\/$/, "");
      return new NextResponse(minimalSitemapIndexXml(siteOrigin), {
        status: 200,
        headers: SITEMAP_XML_HEADERS,
      });
    } catch (fallbackError) {
      console.error("[sitemap] minimal index also failed:", fallbackError);
      return new NextResponse(minimalSitemapIndexXml("https://brt-me.com"), {
        status: 200,
        headers: SITEMAP_XML_HEADERS,
      });
    }
  }
}
