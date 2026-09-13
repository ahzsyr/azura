import type { SearchEntityType } from "@prisma/client";
import type { FacetAggregation } from "@/capabilities/search/engine/filter/search-facet-engine";
import type {
  AutocompletePayload,
  SearchDiscoveryPayload,
} from "@/capabilities/search/components/search-autocomplete.types";
import type { SearchResultHit } from "@/capabilities/search/components/discovery/search-result-card-router";
import {
  normalizeEntityTypes,
  normalizeFacetFilters,
} from "@/capabilities/search/query/normalize-search-query";

export type SearchApiParams = {
  apiBase?: string;
  locale: string;
  q?: string;
  types?: SearchEntityType[] | string[];
  facets?: Record<string, string[]>;
  offset?: number;
  limit?: number;
};

export type SearchPageResponse = {
  results: SearchResultHit[];
  pagination: {
    offset: number;
    limit: number;
    hasMore: boolean;
    total: number;
    isEstimate?: boolean;
  };
  suggestions: unknown[];
  sections: { entityType: SearchEntityType; label: string; count: number }[];
  relatedTerms: string[];
  expandedQuery: string | null;
};

function buildFilterQuery(params: SearchApiParams): string {
  const parts: string[] = [];
  const types = normalizeEntityTypes(params.types as string[] | undefined);
  if (types.length) parts.push(`types=${types.join(",")}`);
  const facets = normalizeFacetFilters(params.facets);
  if (Object.keys(facets).length) {
    parts.push(`facets=${encodeURIComponent(JSON.stringify(facets))}`);
  }
  return parts.length ? `&${parts.join("&")}` : "";
}

export async function fetchSearchDiscovery(
  discoveryUrl: string,
  signal?: AbortSignal
): Promise<SearchDiscoveryPayload> {
  const res = await fetch(discoveryUrl, { signal });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(typeof data?.detail === "string" ? data.detail : "Discovery failed");
  }
  return data as SearchDiscoveryPayload;
}

export async function fetchSearchAutocomplete(
  params: SearchApiParams & { q: string },
  signal?: AbortSignal
): Promise<AutocompletePayload> {
  const base = params.apiBase ?? "/api/search";
  const filterQs = buildFilterQuery(params);
  const res = await fetch(
    `${base}/autocomplete?q=${encodeURIComponent(params.q)}&locale=${params.locale}${filterQs}`,
    { signal }
  );
  if (!res.ok) throw new Error("Autocomplete failed");
  return (await res.json()) as AutocompletePayload;
}

export async function fetchSearchResults(
  params: SearchApiParams & { q: string; limit: number; offset?: number },
  signal?: AbortSignal
): Promise<SearchPageResponse> {
  const base = params.apiBase ?? "/api/search";
  const filterQs = buildFilterQuery(params);
  const offset = params.offset ?? 0;
  const res = await fetch(
    `${base}?q=${encodeURIComponent(params.q)}&locale=${params.locale}&limit=${params.limit}&offset=${offset}${filterQs}`,
    { signal }
  );
  if (!res.ok) throw new Error("Search failed");
  return (await res.json()) as SearchPageResponse;
}

export async function fetchSearchFacets(
  params: SearchApiParams & { q: string },
  signal?: AbortSignal
): Promise<{ facets: FacetAggregation[] }> {
  const base = params.apiBase ?? "/api/search";
  const filterQs = buildFilterQuery(params);
  const res = await fetch(
    `${base}/facets?q=${encodeURIComponent(params.q)}&locale=${params.locale}${filterQs}`,
    { signal }
  );
  if (!res.ok) throw new Error("Facets failed");
  return (await res.json()) as { facets: FacetAggregation[] };
}
