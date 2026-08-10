import type { SearchEntityType } from "@prisma/client";
import { SEARCH_ENTITY_TYPES } from "@/capabilities/search/constants";

const VALID = new Set<string>(SEARCH_ENTITY_TYPES);

export function parseTypesParam(raw: string | null): SearchEntityType[] | undefined {
  if (!raw?.trim()) return undefined;
  const types = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is SearchEntityType => VALID.has(s));
  return types.length ? types : undefined;
}

export function parseFacetsParam(raw: string | null): Record<string, string[]> | undefined {
  if (!raw?.trim()) return undefined;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (Array.isArray(v)) {
        out[k] = v.map(String).filter(Boolean);
      } else if (typeof v === "string" && v) {
        out[k] = [v];
      }
    }
    return Object.keys(out).length ? out : undefined;
  } catch {
    return undefined;
  }
}

export function parseContentTypeSlugsParam(raw: string | null): string[] | undefined {
  if (!raw?.trim()) return undefined;
  const slugs = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return slugs.length ? slugs : undefined;
}

export function parseKindsParam(raw: string | null): string[] | undefined {
  if (!raw?.trim()) return undefined;
  const kinds = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return kinds.length ? kinds : undefined;
}

export function buildSearchUrlParams(state: {
  q?: string;
  types?: SearchEntityType[];
  facets?: Record<string, string[]>;
}): URLSearchParams {
  const params = new URLSearchParams();
  if (state.q?.trim()) params.set("q", state.q.trim());
  if (state.types?.length) params.set("types", state.types.join(","));
  if (state.facets && Object.keys(state.facets).length) {
    const payload: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(state.facets)) {
      if (v.length) payload[k] = v;
    }
    if (Object.keys(payload).length) {
      params.set("facets", JSON.stringify(payload));
    }
  }
  return params;
}
