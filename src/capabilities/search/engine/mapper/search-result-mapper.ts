import type { SearchEntityType } from "@prisma/client";
import type { SearchCardPayload } from "@/capabilities/search/types/search-card";
import type { ProductSearchCardDisplay } from "@/features/products/lib/product-search-display";
import { adminPathFor } from "@/capabilities/search/constants";
import { searchRegistry } from "@/capabilities/search/engine/registry/search-registry";
import type { RankedHit } from "@/capabilities/search/engine/ranking/search-ranking-engine";
import type {
  SearchResult,
  SearchSuggestion,
  SearchVisibility,
} from "@/capabilities/search/engine/types";
import { excerpt } from "@/capabilities/search/search-text";

function metaOf(metadata: unknown): Record<string, unknown> {
  return (metadata ?? {}) as Record<string, unknown>;
}

function resolveSnippet(
  hit: RankedHit,
  query: string,
  meta: Record<string, unknown>,
): string {
  if (hit.entityType !== "CATALOG_PRODUCT") {
    return excerpt(hit.body, query);
  }

  const cardDisplay = meta.cardDisplay as ProductSearchCardDisplay | undefined;
  if (cardDisplay?.showSnippet === false) return "";

  const displaySnippet =
    typeof meta.displaySnippet === "string" ? meta.displaySnippet.trim() : "";
  if (!displaySnippet) return "";

  return excerpt(displaySnippet, query);
}

export class SearchResultMapper {
  toSearchResult(hit: RankedHit, query: string): SearchResult {
    const meta = metaOf(hit.metadata);
    const kind = searchRegistry.kindForEntityType(hit.entityType, hit.metadata);
    const visibility: SearchVisibility =
      hit.entityType === "MEDIA" || meta.adminOnly === true ? "admin" : "public";

    return {
      id: hit.id,
      entityType: hit.entityType,
      entityId: hit.entityId,
      locale: hit.locale,
      kind,
      contentTypeSlug: meta.contentTypeSlug as string | undefined,
      title: hit.title,
      snippet: resolveSnippet(hit, query, meta),
      urlPath: hit.urlPath,
      adminPath:
        (meta.adminPath as string) || adminPathFor(hit.entityType, hit.entityId, meta),
      score: hit.score,
      visibility,
      facets: (meta.facets as Record<string, string | string[] | number | boolean>) ?? {},
      card: meta.card as SearchCardPayload | undefined,
      cardDisplay: meta.cardDisplay as ProductSearchCardDisplay | undefined,
    };
  }

  toSuggestion(row: {
    title: string;
    urlPath: string;
    entityType: SearchEntityType;
    entityId: string;
    metadata?: unknown;
    id?: string;
    locale?: string;
    body?: string;
  }): SearchSuggestion {
    const meta = metaOf(row.metadata);
    return {
      title: row.title,
      urlPath: row.urlPath,
      entityType: row.entityType,
      kind: searchRegistry.kindForEntityType(row.entityType, row.metadata),
      contentTypeSlug: meta.contentTypeSlug as string | undefined,
      adminPath:
        (meta.adminPath as string) ||
        adminPathFor(row.entityType, row.entityId, meta),
    };
  }

  toApiPayload(result: SearchResult) {
    return {
      id: result.id,
      title: result.title,
      snippet: result.snippet,
      urlPath: result.urlPath,
      entityType: result.entityType,
      entityId: result.entityId,
      kind: result.kind,
      contentTypeSlug: result.contentTypeSlug,
      score: result.score,
      facets: result.facets,
      card: result.card,
      cardDisplay: result.cardDisplay,
    };
  }

  toAdminApiPayload(result: SearchResult) {
    return {
      ...this.toApiPayload(result),
      adminPath: result.adminPath,
    };
  }

  groupByEntityType(results: SearchResult[]): Map<SearchEntityType, SearchResult[]> {
    const map = new Map<SearchEntityType, SearchResult[]>();
    for (const r of results) {
      const list = map.get(r.entityType) ?? [];
      list.push(r);
      map.set(r.entityType, list);
    }
    return map;
  }

  groupByContentTypeSlug(results: SearchResult[]): Map<string, SearchResult[]> {
    const map = new Map<string, SearchResult[]>();
    for (const r of results) {
      const key = r.contentTypeSlug ?? r.kind;
      const list = map.get(key) ?? [];
      list.push(r);
      map.set(key, list);
    }
    return map;
  }
}

export const searchResultMapper = new SearchResultMapper();
