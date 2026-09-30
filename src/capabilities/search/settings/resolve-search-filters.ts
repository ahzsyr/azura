import type {
  SearchCustomFieldFilter,
  SearchFiltersSettings,
} from "@/capabilities/search/settings/admin-search-settings.schema";
import type { DiscoveredCustomSearchFilter } from "@/capabilities/search/settings/discover-search-filters";
import {
  BUILTIN_SEARCH_FILTER_IDS,
  BUILTIN_SEARCH_FILTER_LABELS,
  BUILTIN_FILTER_FACET_KEYS,
  DEFAULT_FILTER_DISPLAY_ORDER,
  SEARCH_FILTER_UI_TYPES,
  isBuiltinFilterId,
  normalizeFilterDisplayOrder,
  type SearchBuiltinFilterId,
  type SearchFilterUiType,
} from "@/capabilities/search/settings/search-filter-keys";

export type ResolvedSearchFilterDef = {
  id: string;
  enabled: boolean;
  label: string;
  facetKeys: string[];
  uiType: SearchFilterUiType;
  builtin: boolean;
  contentTypeSlug?: string;
  fieldKey?: string;
};

export type ResolvedSearchFiltersConfig = {
  showEntityTypeChips: boolean;
  showContentTypeChips: boolean;
  defaultEntityTypes: string[];
  displayOrder: string[];
  filters: ResolvedSearchFilterDef[];
};

const DEFAULT_BUILTIN_ENABLED: Record<SearchBuiltinFilterId, boolean> = {
  contentType: true,
  category: true,
  collection: true,
  tags: true,
  price: true,
  brand: true,
  status: false,
  date: false,
};

function defaultUiTypeForBuiltin(id: SearchBuiltinFilterId): SearchFilterUiType {
  if (id === "price") return "range";
  if (id === "date") return "date";
  if (id === "status") return "select";
  return "chip";
}

export function syncCustomFieldFilters(
  existing: Record<string, SearchCustomFieldFilter>,
  discovered: DiscoveredCustomSearchFilter[]
): Record<string, SearchCustomFieldFilter> {
  const next = { ...existing };
  for (const field of discovered) {
    if (!next[field.id]) {
      next[field.id] = {
        enabled: true,
        fieldKey: field.fieldKey,
        contentTypeSlug: field.contentTypeSlug,
        facetKey: field.facetKey,
        label: field.label,
        uiType: field.uiType,
      };
    }
  }
  return next;
}

export function resolveSearchFilters(
  raw: Partial<SearchFiltersSettings> | undefined,
  discoveredCustom: DiscoveredCustomSearchFilter[] = []
): ResolvedSearchFiltersConfig {
  const builtinRaw = raw?.builtin ?? {};
  const customFields = syncCustomFieldFilters(raw?.customFields ?? {}, discoveredCustom);

  const defsById = new Map<string, ResolvedSearchFilterDef>();

  for (const id of BUILTIN_SEARCH_FILTER_IDS) {
    const enabled =
      builtinRaw[id]?.enabled ??
      (id === "contentType" ? raw?.showContentTypeChips !== false : DEFAULT_BUILTIN_ENABLED[id]);
    defsById.set(id, {
      id,
      enabled,
      label: BUILTIN_SEARCH_FILTER_LABELS[id],
      facetKeys: [...BUILTIN_FILTER_FACET_KEYS[id]],
      uiType: defaultUiTypeForBuiltin(id),
      builtin: true,
    });
  }

  for (const [id, cfg] of Object.entries(customFields)) {
    defsById.set(id, {
      id,
      enabled: cfg.enabled,
      label: cfg.label,
      facetKeys: [cfg.facetKey],
      uiType: SEARCH_FILTER_UI_TYPES.includes(cfg.uiType) ? cfg.uiType : "chip",
      builtin: false,
      contentTypeSlug: cfg.contentTypeSlug,
      fieldKey: cfg.fieldKey,
    });
  }

  let displayOrder = normalizeFilterDisplayOrder(
    raw?.displayOrder?.length ? raw.displayOrder : DEFAULT_FILTER_DISPLAY_ORDER
  );
  for (const field of discoveredCustom) {
    if (!displayOrder.includes(field.id)) displayOrder.push(field.id);
  }

  const filters = displayOrder
    .map((id) => defsById.get(id))
    .filter((d): d is ResolvedSearchFilterDef => d != null && d.enabled);

  return {
    showEntityTypeChips: raw?.showEntityTypeChips !== false,
    showContentTypeChips:
      raw?.showContentTypeChips !== false && (builtinRaw.contentType?.enabled ?? true),
    defaultEntityTypes: raw?.defaultEntityTypes ?? [],
    displayOrder,
    filters,
  };
}

export function migrateFiltersRaw(filtersRaw: Record<string, unknown>): Partial<SearchFiltersSettings> {
  const builtin: Partial<Record<SearchBuiltinFilterId, { enabled: boolean }>> = {};
  for (const id of BUILTIN_SEARCH_FILTER_IDS) {
    if (typeof filtersRaw[id] === "object" && filtersRaw[id] && "enabled" in (filtersRaw[id] as object)) {
      builtin[id] = filtersRaw[id] as { enabled: boolean };
    }
  }
  if (filtersRaw.builtin && typeof filtersRaw.builtin === "object") {
    Object.assign(builtin, filtersRaw.builtin as Record<SearchBuiltinFilterId, { enabled: boolean }>);
  }

  return {
    showEntityTypeChips: filtersRaw.showEntityTypeChips as boolean | undefined,
    showContentTypeChips: filtersRaw.showContentTypeChips as boolean | undefined,
    defaultEntityTypes: Array.isArray(filtersRaw.defaultEntityTypes)
      ? (filtersRaw.defaultEntityTypes as string[])
      : undefined,
    builtin: builtin as SearchFiltersSettings["builtin"],
    displayOrder: Array.isArray(filtersRaw.displayOrder)
      ? (filtersRaw.displayOrder as string[])
      : undefined,
    customFields:
      filtersRaw.customFields && typeof filtersRaw.customFields === "object"
        ? (filtersRaw.customFields as Record<string, SearchCustomFieldFilter>)
        : undefined,
  };
}

export function isFilterEnabled(id: string, filters: ResolvedSearchFiltersConfig): boolean {
  if (isBuiltinFilterId(id)) {
    if (id === "contentType") return filters.showContentTypeChips;
  }
  return filters.filters.some((f) => f.id === id);
}
