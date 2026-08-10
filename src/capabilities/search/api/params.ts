import type { SearchEntityType } from "@prisma/client";
import { SEARCH_ENTITY_TYPES } from "@/capabilities/search/constants";

const VALID_ENTITY_TYPES = new Set<string>(SEARCH_ENTITY_TYPES);

/** Parse comma-separated API `types` param (legacy + current enum values only). */
export function parseTypesParam(typesParam: string | null): SearchEntityType[] | undefined {
  if (!typesParam) return undefined;
  const parsed = typesParam
    .split(",")
    .map((t) => t.trim())
    .filter((t) => VALID_ENTITY_TYPES.has(t)) as SearchEntityType[];
  return parsed.length ? parsed : undefined;
}

/** Parse `contentTypeSlugs` query param. */
export function parseContentTypeSlugsParam(param: string | null): string[] | undefined {
  if (!param) return undefined;
  const slugs = param
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return slugs.length ? slugs : undefined;
}

/** Parse `kinds` query param for logical content kinds. */
export function parseKindsParam(param: string | null): string[] | undefined {
  if (!param) return undefined;
  return param
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

/** Parse `facets` JSON: `{ "category": ["tours"], "custom:packages:city": ["MAKKAH"] }` */
export function parseFacetsParam(param: string | null): Record<string, string[]> | undefined {
  if (!param?.trim()) return undefined;
  try {
    const parsed = JSON.parse(param) as Record<string, unknown>;
    const out: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (Array.isArray(value)) {
        const vals = value.map(String).filter(Boolean);
        if (vals.length) out[key] = vals;
      } else if (typeof value === "string" && value) {
        out[key] = [value];
      }
    }
    return Object.keys(out).length ? out : undefined;
  } catch {
    return undefined;
  }
}

/** Merge portal directory `scope` into facet filters for team/partner kinds. */
export function mergeScopeFacetFilters(input: {
  scope?: string | null;
  kinds?: string[];
  types?: SearchEntityType[];
  facetFilters?: Record<string, string[]>;
}): Record<string, string[]> | undefined {
  const scope = input.scope?.trim();
  if (!scope) return input.facetFilters;

  const out: Record<string, string[]> = { ...(input.facetFilters ?? {}) };
  const kindSet = new Set(input.kinds ?? []);
  const typeSet = new Set(input.types ?? []);

  if (kindSet.has("team_member") || typeSet.has("TEAM_MEMBER")) {
    out.teamDirectorySlug = [scope];
  }
  if (kindSet.has("partner") || typeSet.has("PARTNER")) {
    out.partnerProgramSlug = [scope];
  }

  return Object.keys(out).length ? out : undefined;
}
