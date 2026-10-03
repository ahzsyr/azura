import { LEGACY_SOURCE_TO_TYPE } from "@/features/content/content-type.registry";

/** Map a catalog block Source value to a content type slug from /admin/content. */
export function resolveCatalogTypeSlug(
  source: string | undefined,
  activeTypeSlugs?: Iterable<string>,
): string {
  const raw = source?.trim() || "catalog-items";
  if (activeTypeSlugs) {
    return normalizeCatalogSourceForActiveTypes(raw, activeTypeSlugs);
  }
  return LEGACY_SOURCE_TO_TYPE[raw] ?? raw;
}

/** Builtin catalog defaults left behind when Source was written only onto `props`. */
const LEFTOVER_CATALOG_DEFAULTS = new Set(["catalog-items", "packages"]);

function readSourceField(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isLeftoverCatalogDefault(source: string): boolean {
  return !source || LEFTOVER_CATALOG_DEFAULTS.has(source);
}

/**
 * Prefer a real content-type slug over leftover catalog defaults.
 * When both sides are custom types, settings win (v2 merge convention).
 */
export function pickCatalogSource(propsSource: string, settingsSource: string): string | undefined {
  const propsCustom = Boolean(propsSource) && !isLeftoverCatalogDefault(propsSource);
  const settingsCustom = Boolean(settingsSource) && !isLeftoverCatalogDefault(settingsSource);
  if (propsCustom && !settingsCustom) return propsSource;
  if (settingsCustom) return settingsSource;
  return propsSource || settingsSource || undefined;
}

/** Effective Source from stored props/settings, ignoring leftover catalog-items defaults. */
export function resolveCatalogSourceFromBlock(block: {
  props?: Record<string, unknown>;
  settings?: Record<string, unknown>;
}): string {
  const propsSource = readSourceField(block.props?.source);
  const settingsSource = readSourceField(block.settings?.source);
  return pickCatalogSource(propsSource, settingsSource) || "catalog-items";
}

export function normalizeCatalogSourceForActiveTypes(
  source: string | undefined,
  activeTypeSlugs: Iterable<string> | undefined,
): string {
  const raw = readSourceField(source) || "catalog-items";
  const activeList = [
    ...new Set(Array.from(activeTypeSlugs ?? []).map((slug) => readSourceField(slug)).filter(Boolean)),
  ];
  const active = new Set(activeList);
  const mapped = LEGACY_SOURCE_TO_TYPE[raw] ?? raw;

  if (!active.size) {
    return mapped;
  }

  if (active.has(raw)) return raw;
  if (mapped !== raw && active.has(mapped)) return mapped;

  for (const [legacy, canonical] of Object.entries(LEGACY_SOURCE_TO_TYPE)) {
    if (raw === canonical && active.has(legacy)) return legacy;
  }

  return activeList[0];
}

export function compactAttributeFilters(
  filters: Record<string, string> | undefined,
): Record<string, string> {
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(filters ?? {})) {
    const trimmed = value.trim();
    if (trimmed) next[key] = trimmed;
  }
  return next;
}

/**
 * Filters that belong to the selected content type.
 * Legacy city props are only applied to listings.
 * Retired offering Type / serviceType filters (Transport, Hotel, …) are dropped.
 */
export function catalogAttributeFiltersForSource(
  source: string | undefined,
  config: {
    city?: string;
    serviceType?: string;
    attributeFilters?: Record<string, string>;
  },
  activeTypeSlugs?: Iterable<string>,
): Record<string, string> {
  const typeSlug = resolveCatalogTypeSlug(source, activeTypeSlugs);
  const filters = compactAttributeFilters(config.attributeFilters);
  delete filters.offeringType;
  delete filters.type;
  delete filters.serviceType;
  if (typeSlug === "listings" && config.city?.trim() && !filters.city) {
    filters.city = config.city.trim();
  }
  return filters;
}

export function catalogLimit(value: number | undefined): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  return 6;
}
