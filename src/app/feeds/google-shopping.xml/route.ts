import { NextResponse } from "next/server";
import { generateGoogleShoppingFeedXml } from "@/features/feeds/google-shopping-feed.service";
import { resolveSiteOrigin } from "@/features/seo/resolve-site-origin";

export const dynamic = "force-dynamic";

export async function GET() {
  const siteOrigin = (await resolveSiteOrigin("sitemap")).replace(/\/$/, "");
  const xml = await generateGoogleShoppingFeedXml(siteOrigin);
  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
