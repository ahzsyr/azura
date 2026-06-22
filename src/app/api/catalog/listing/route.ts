import { NextResponse } from "next/server";
import { REVALIDATE } from "@/lib/config/performance";
import {
  buildCollectionListingCatalog,
  buildProductListingCatalogForCollection,
  buildProductListingCatalog,
} from "@/features/products/listing/catalog";
import { filterStateFromSearchParams } from "@/features/products/listing/url-state";
import {
  estimateInteractivePayloadBytes,
  toCatalogInteractiveRecord,
} from "@/features/products/listing/interactive-records";

export const revalidate = 300;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale")?.trim() || "en";
  const mode = url.searchParams.get("mode")?.trim() || null;
  const collection = url.searchParams.get("collection")?.trim() || null;
  const interactive = url.searchParams.get("interactive") === "1";
  const filterState = filterStateFromSearchParams(url.searchParams);
  const interactiveBaseState = filterStateFromSearchParams(new URLSearchParams());

  try {
    const payload =
      mode === "collection"
        ? await buildCollectionListingCatalog(locale, interactive ? interactiveBaseState : filterState)
        : collection
          ? await buildProductListingCatalogForCollection(
              locale,
              collection,
              interactive ? interactiveBaseState : filterState
            )
          : await buildProductListingCatalog(locale, interactive ? interactiveBaseState : filterState);

    if (interactive) {
      const records = payload.records.map(toCatalogInteractiveRecord);
      const baseDataset = {
        records,
        facets: payload.facets,
        total: payload.total ?? records.length,
        totalPages: payload.totalPages ?? Math.max(1, Math.ceil((payload.total ?? records.length) / filterState.per)),
      };
      const payloadBytes = estimateInteractivePayloadBytes(baseDataset);
      return NextResponse.json(
        {
          ...baseDataset,
          meta: {
            payloadBytes,
            payloadMb: Number((payloadBytes / (1024 * 1024)).toFixed(3)),
          },
        },
        {
          headers: {
            "Cache-Control": `public, s-maxage=${REVALIDATE.marketing}, stale-while-revalidate=60`,
          },
        }
      );
    }

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
