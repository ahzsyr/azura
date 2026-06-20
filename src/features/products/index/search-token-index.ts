import { tokenizeForSearch } from "@/features/search/core/text";
import type { IndexedProductListingRecord } from "./product-index-types";

export function buildSearchTokens(records: IndexedProductListingRecord[]): Record<string, string[]> {
  const tokenToSlugs = new Map<string, Set<string>>();

  const addToken = (token: string, slug: string) => {
    for (const part of tokenizeForSearch(token, { includePrefixes: true })) {
      if (!tokenToSlugs.has(part)) tokenToSlugs.set(part, new Set());
      tokenToSlugs.get(part)!.add(slug);
    }
  };

  for (const record of records) {
    addToken(record.name, record.slug);
    addToken(record.searchText, record.slug);
    if (record.brand) addToken(record.brand, record.slug);
    if (record.mpn) addToken(record.mpn, record.slug);
    for (const tag of record.tags) addToken(tag, record.slug);
  }

  const tokens: Record<string, string[]> = {};
  for (const [token, slugs] of tokenToSlugs) {
    tokens[token] = [...slugs].sort();
  }
  return tokens;
}
