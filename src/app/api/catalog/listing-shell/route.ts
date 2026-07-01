import { NextResponse } from "next/server";
import { REVALIDATE } from "@/lib/config/performance";
import { loadCatalogListingShell } from "@/features/catalog/load-catalog-listing-page";

export const revalidate = 300;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale")?.trim() || "en";
  const page = (url.searchParams.get("page")?.trim() || "products") as "products" | "collections";

  try {
    const payload = await loadCatalogListingShell(locale, page);

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": `public, s-maxage=${REVALIDATE.marketing}, stale-while-revalidate=60`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Listing shell failed" },
      { status: 500 },
    );
  }
}
