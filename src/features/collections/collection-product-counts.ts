import "server-only";

import { loadPublishedProductsForRules } from "@/features/categories/direct-rule-match.service";
import { selectDirectRuleMatches } from "@/features/categories/matching/direct-matches";
import type { Collection } from "@/features/collections/types";

/** Product counts from the same direct published rule matches as Match preview. */
export async function loadCollectionProductCounts(
  localePrefix: string,
  collections: Collection[],
): Promise<Map<string, number>> {
  const products = await loadPublishedProductsForRules(localePrefix);
  const counts = new Map<string, number>();
  for (const col of collections) {
    counts.set(col.slug, selectDirectRuleMatches(products, col.conditions, { sampleLimit: 1 }).count);
  }
  return counts;
}
