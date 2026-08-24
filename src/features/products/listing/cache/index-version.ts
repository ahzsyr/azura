import { PRODUCT_INDEX_VERSION, PRODUCT_INDEX_SEMANTIC_VERSIONS } from "@/features/products/index/product-index-types";
import { clearListingQueryCache } from "../cache/query-cache";

/** Logical index generation stamp used in query cache keys. */
export function currentListingIndexVersion(): number {
  return PRODUCT_INDEX_VERSION;
}

export function listingIndexVersionStamp(): string {
  const s = PRODUCT_INDEX_SEMANTIC_VERSIONS;
  return `v${PRODUCT_INDEX_VERSION}.s${s.schemaVersion}.t${s.tokenizationVersion}.f${s.facetSchemaVersion}.r${s.rankingVersion}`;
}

/** Call after catalog / product index rebuild so cached listing queries miss. */
export function invalidateListingQueryCaches(): void {
  clearListingQueryCache();
}
