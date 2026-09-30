import { NextResponse } from "next/server";
import { requireCatalogAdmin } from "@/lib/catalog-api-auth";
import {
  validateCatalogConsistency,
  validateSearchIndexConsistency,
} from "@/features/catalog/sync/catalog-validation";
import { reconcileCatalogSearchIndexes } from "@/capabilities/search/engine/indexer/catalog-index-sync";
import { reconcileStaleSearchDocuments } from "@/capabilities/search/engine/indexer/search-index-consistency";
import { frameworkSearchIndexer } from "@/capabilities/search/engine";

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
  if (fix && (search.staleDocs > 0 || search.staleCatalogDocs > 0)) {
    const [allTypes, catalogOnly] = await Promise.all([
      reconcileStaleSearchDocuments(),
      reconcileCatalogSearchIndexes(frameworkSearchIndexer),
    ]);
    reconcile = { removed: allTypes.removed + catalogOnly.removed };
  }

  return NextResponse.json({
    catalog,
    search,
    reconcile,
  });
}
