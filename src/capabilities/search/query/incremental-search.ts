"use client";

import type { AutocompleteHit } from "@/capabilities/search/components/search-autocomplete.types";
import { normalizeSearchQuery } from "@/capabilities/search/query/normalize-search-query";

/**
 * Incrementally narrow prior results while the next query is in flight.
 * Used when the user extends a query (e.g. `iph` → `ipho`).
 */
export function narrowPreviousResults(
  previous: AutocompleteHit[] | undefined,
  nextQuery: string
): AutocompleteHit[] | undefined {
  if (!previous?.length) return previous;
  const norm = normalizeSearchQuery(nextQuery);
  if (!norm) return previous;
  const tokens = norm.split(/\s+/).filter(Boolean);
  if (!tokens.length) return previous;

  const narrowed = previous.filter((hit) => {
    const haystack = normalizeSearchQuery(`${hit.title} ${hit.snippet ?? ""}`);
    return tokens.every((token) => haystack.includes(token));
  });

  return narrowed.length > 0 ? narrowed : previous;
}
