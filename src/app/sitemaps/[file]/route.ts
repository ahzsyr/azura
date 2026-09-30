import { NextResponse } from "next/server";
import {
  emptySitemapUrlsetXml,
  parseSitemapRouteName,
  resolveTypedSitemapXml,
  SITEMAP_XML_HEADERS,
} from "@/features/seo/sitemap-index.service";
import { resolveSitemapOriginSafe } from "@/features/seo/sitemap-origin";

export const maxDuration = 60;

type Props = { params: Promise<{ file: string }> };

export async function GET(_request: Request, { params }: Props) {
  try {
    const { file } = await params;
    const parsed = parseSitemapRouteName(file);
    if (!parsed) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const siteOrigin = (await resolveSitemapOriginSafe()).replace(/\/$/, "");
    const xml = await resolveTypedSitemapXml(siteOrigin, parsed.type, parsed.page);
    return new NextResponse(xml, { status: 200, headers: SITEMAP_XML_HEADERS });
  } catch (error) {
    console.error("[sitemap] typed sitemap generation failed, returning empty urlset:", error);
    return new NextResponse(emptySitemapUrlsetXml(), {
      status: 200,
      headers: SITEMAP_XML_HEADERS,
    });
  }
}
