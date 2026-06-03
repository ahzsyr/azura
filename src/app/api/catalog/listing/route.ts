import { NextResponse } from "next/server";
import { REVALIDATE } from "@/lib/config/performance";
import { buildProductListingCatalogForCollection, buildProductListingCatalog } from "@/features/products/listing/catalog";
import { filterStateFromSearchParams } from "@/features/products/listing/url-state";

export const revalidate = 300;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale")?.trim() || "en";
  const collection = url.searchParams.get("collection")?.trim() || null;
  const filterState = filterStateFromSearchParams(url.searchParams);

  try {
    const payload = collection
      ? await buildProductListingCatalogForCollection(locale, collection, filterState)
      : await buildProductListingCatalog(locale, filterState);

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": `public, s-maxage=${REVALIDATE.marketing}, stale-while-revalidate=60`,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Listing query failed" },
      { status: 500 },
    );
  }
}
