import { getLocalizedField, type LocalizedFieldOptions } from "@/lib/utils";

const CITY_LABELS: Record<string, string> = {
  MAKKAH: "Makkah",
  MADINAH: "Madinah",
};

const LOCALIZED: LocalizedFieldOptions = { includeLegacySuffixFields: true };

export type CatalogLocationSource = {
  city?: string;
  location?: string;
  locationEn?: string;
  locationAr?: string;
};

export function formatCatalogCityLabel(city: string | undefined | null): string {
  const raw = city?.trim() ?? "";
  if (!raw) return "";
  return CITY_LABELS[raw.toUpperCase()] ?? raw;
}

/** Resolve a card location from editable item fields — never a hardcoded fallback. */
export function resolveCatalogCardLocation(item: CatalogLocationSource, locale: string): string {
  const fromField = getLocalizedField(item as Record<string, unknown>, "location", locale, LOCALIZED).trim();
  if (fromField) return fromField;
  if (item.location?.trim()) return item.location.trim();
  return formatCatalogCityLabel(item.city);
}
