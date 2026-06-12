import { NextResponse } from "next/server";
import { loadCatalogListingTheme } from "@/features/catalog/lib/load-catalog-theme";
import { collectionsDataService } from "@/features/collections/collections-data.service";
import { orderCollectionsHierarchy } from "@/features/collections/collection-hierarchy";
import { loadListingLabels } from "@/features/products/listing/load-listing-labels";
import { agentLog, agentLogError } from "@/lib/debug/agent-log";

export const dynamic = "force-dynamic";

type PageSlug = "products" | "collections";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale")?.trim() || "en";
  const page = (url.searchParams.get("page")?.trim() || "products") as PageSlug;
  const listingMode = page === "collections" ? "collection" : "product";

  agentLog({
    location: "api/catalog/listing-shell:GET",
    message: "start",
    hypothesisId: "H10",
    data: { locale, page },
  });

  try {
    const [theme, allCols, listingCopy] = await Promise.all([
      loadCatalogListingTheme(locale, page),
      collectionsDataService.loadAll({ localePrefix: locale }),
      loadListingLabels(listingMode, locale),
    ]);

    const collections = orderCollectionsHierarchy(allCols.filter((c) => c.visible !== false));
    const pageDir = locale.startsWith("ar") ? "rtl" : "ltr";

    agentLog({
      location: "api/catalog/listing-shell:GET",
      message: "success",
      hypothesisId: "H10",
      data: { locale, page, collectionCount: collections.length },
    });

    return NextResponse.json({
      theme,
      collections,
      listingCopy,
      pageDir,
      listingMode,
    });
  } catch (error) {
    agentLogError("api/catalog/listing-shell:GET", error, "H10", { locale, page });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Listing shell failed" },
      { status: 500 },
    );
  }
}
