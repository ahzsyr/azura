import { NextResponse } from "next/server";
import { requireCatalogAdmin } from "@/lib/catalog-api-auth";
import {
  validateCatalogConsistency,
  validateSearchIndexConsistency,
} from "@/features/catalog/sync/catalog-validation";
import { reconcileCatalogSearchIndexes } from "@/features/search-framework/indexer/catalog-index-sync";
import { frameworkSearchIndexer } from "@/features/search-framework";

export async function GET(request: Request) {
  const unauthorized = await requireCatalogAdmin();
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const fix = url.searchParams.get("fix") === "1";

  const [catalog, search] = await Promise.all([
    validateCatalogConsistency(),
    validateSearchIndexConsistency(),
  ]);

  let reconcile: { removed: number } | null = null;
  if (fix && search.staleCatalogDocs > 0) {
    reconcile = await reconcileCatalogSearchIndexes(frameworkSearchIndexer);
  }

  return NextResponse.json({
    catalog,
    search,
    reconcile,
  });
}
