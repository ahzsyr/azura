import type { SearchEntityType } from "@prisma/client";
import { ENTITY_LABELS } from "@/capabilities/search/constants";
import { countByEntityTypeForQuery } from "@/capabilities/search/engine/filter/search-facet-engine";
import { analyzeSmartQuery } from "@/capabilities/search/core/query/smart-query";
import { getSearchSmartConfig } from "@/capabilities/search/settings/resolve-search-smart-config";
import { sanitizeQuery } from "@/capabilities/search/core/text";

export async function buildSearchSections(params: {
  q: string;
  locale: string;
  types?: string | null;
  facets?: string | null;
}): Promise<{ entityType: SearchEntityType; count: number; label: string }[]> {
  const rows = await countByEntityTypeForQuery(params);
  const localeKey = "en";
  return rows
    .map((r) => ({
      entityType: r.entityType,
      count: r.count,
      label: ENTITY_LABELS[r.entityType]?.[localeKey] ?? r.entityType,
    }))
    .sort((a, b) => b.count - a.count);
}

export function buildRelatedSearchTerms(q: string, limit = 6): string[] {
  const sanitized = sanitizeQuery(q);
  if (!sanitized) return [];
  const smart = analyzeSmartQuery(sanitized, getSearchSmartConfig());
  const terms = new Set<string>();
  for (const token of smart.expandedTokens) {
    if (token.toLowerCase() !== sanitized.toLowerCase()) {
      terms.add(token);
    }
  }
  return [...terms].slice(0, limit);
}
