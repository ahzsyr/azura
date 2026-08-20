import { LEGACY_SOURCE_TO_TYPE } from "@/features/content/content-type.registry";

/** Map a catalog block Source value to a content type slug from /admin/content. */
export function resolveCatalogTypeSlug(source: string | undefined): string {
  const raw = source?.trim() || "catalog-items";
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
  return resolveCatalogTypeSlug(pickCatalogSource(propsSource, settingsSource));
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
 * Legacy city/serviceType props are only applied to listings/offerings so a
 * leftover Transport filter cannot empty a Solutions (or other custom) source.
 */
export function catalogAttributeFiltersForSource(
  source: string | undefined,
  config: {
    city?: string;
    serviceType?: string;
    attributeFilters?: Record<string, string>;
  },
): Record<string, string> {
  const typeSlug = resolveCatalogTypeSlug(source);
  const filters = compactAttributeFilters(config.attributeFilters);
  if (typeSlug === "listings" && config.city?.trim() && !filters.city) {
    filters.city = config.city.trim();
  }
  if (typeSlug === "offerings" && config.serviceType?.trim() && !filters.offeringType && !filters.type) {
    filters.offeringType = config.serviceType.trim();
  }
  return filters;
}

export function catalogLimit(value: number | undefined): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  return 6;
}
