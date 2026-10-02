import type { ContentFieldDefinition, ContentTypeDefinition } from "@/features/content/types";
import type { ContentTypeOption } from "@/types/builder";

const PACKAGE_FIELDS: ContentFieldDefinition[] = [
  { key: "duration", type: "number", labelEn: "Duration (days)", group: "pricing", required: true },
  { key: "price", type: "price", labelEn: "Price", group: "pricing", required: true },
  { key: "currency", type: "text", labelEn: "Currency", group: "pricing", placeholder: "USD" },
  { key: "location", type: "text", labelEn: "Location", localized: true, group: "location" },
  { key: "travelDates", type: "json", labelEn: "Travel dates (JSON array)", group: "details" },
  { key: "facilities", type: "json", labelEn: "Facilities (JSON)", localized: true, group: "details" },
  { key: "features", type: "json", labelEn: "Features (JSON)", localized: true, group: "details" },
  { key: "itinerary", type: "json", labelEn: "Itinerary (JSON)", localized: true, group: "details" },
  { key: "hotelInfo", type: "textarea", labelEn: "Hotel info", localized: true, group: "details" },
  { key: "airlineInfo", type: "textarea", labelEn: "Airline info", localized: true, group: "details" },
];

const HOTEL_FIELDS: ContentFieldDefinition[] = [
  {
    key: "city",
    type: "select",
    labelEn: "City",
    group: "location",
    options: [
      { value: "MAKKAH", labelEn: "Makkah" },
      { value: "MADINAH", labelEn: "Madinah" },
    ],
  },
  { key: "stars", type: "number", labelEn: "Star rating", group: "details" },
  { key: "address", type: "textarea", labelEn: "Address", localized: true, group: "location" },
  { key: "distance", type: "textarea", labelEn: "Distance info", localized: true, group: "location" },
  { key: "amenities", type: "json", labelEn: "Amenities (JSON)", localized: true, group: "details" },
];

/** Offerings use dynamic fields from ContentType.fieldSchema — no fixed Type enum. */
const OFFERING_FIELDS: ContentFieldDefinition[] = [];

const PRODUCT_FIELDS: ContentFieldDefinition[] = [
  { key: "price", type: "price", labelEn: "Price", group: "pricing", required: true, search: { facet: true } },
  { key: "brand", type: "text", labelEn: "Brand", group: "details", search: { facet: true } },
  { key: "category", type: "text", labelEn: "Category", group: "details", search: { facet: true } },
  {
    key: "availability",
    type: "select",
    labelEn: "Availability",
    group: "details",
    options: [
      { value: "InStock", labelEn: "In stock" },
      { value: "OutOfStock", labelEn: "Out of stock" },
      { value: "PreOrder", labelEn: "Pre-order" },
      { value: "Backorder", labelEn: "Backorder" },
      { value: "RequestQuote", labelEn: "Request quote" },
      { value: "ExternalPurchase", labelEn: "External purchase" },
    ],
  },
  { key: "stock_status", type: "text", labelEn: "Stock status", group: "details" },
  { key: "mpn", type: "text", labelEn: "MPN", group: "details" },
  { key: "tags", type: "json", labelEn: "Tags", group: "details", search: true },
  { key: "short_description", type: "textarea", labelEn: "Short description", localized: true, group: "content" },
  { key: "description", type: "textarea", labelEn: "Description", localized: true, group: "content", search: true },
];

/** Built-in content type definitions — extensible via DB ContentType.fieldSchema */
export const BUILTIN_CONTENT_TYPES: ContentTypeDefinition[] = [
  {
    slug: "products",
    nameEn: "Products",
    nameAr: "منتجات",
    labelSingularEn: "Product",
    labelSingularAr: "منتج",
    labelPluralEn: "Products",
    labelPluralAr: "منتجات",
    icon: "package",
    routePrefix: "products",
    fields: PRODUCT_FIELDS,
    displayDefaults: { showPrice: true, showCategory: true },
    adminConfig: { presetId: "product" },
  },
  {
    slug: "catalog-items",
    nameEn: "Catalog Items",
    nameAr: "عناصر الفهرس",
    labelSingularEn: "Catalog item",
    labelSingularAr: "عنصر",
    labelPluralEn: "Catalog items",
    labelPluralAr: "عناصر الفهرس",
    icon: "package",
    routePrefix: "packages",
    legacyEntityType: "PACKAGE",
    fields: PACKAGE_FIELDS,
    displayDefaults: { showPrice: true, showDuration: true, showCategory: true },
  },
  {
    slug: "listings",
    nameEn: "Listings",
    nameAr: "قوائم",
    labelSingularEn: "Listing",
    labelSingularAr: "قائمة",
    labelPluralEn: "Listings",
    labelPluralAr: "قوائم",
    icon: "building",
    routePrefix: "hotels-transport",
    legacyEntityType: "HOTEL",
    fields: HOTEL_FIELDS,
    displayDefaults: { showStars: true, showCity: true, showPrice: false },
  },
  {
    slug: "offerings",
    nameEn: "Services",
    nameAr: "خدمات",
    labelSingularEn: "Service",
    labelSingularAr: "خدمة",
    labelPluralEn: "Services",
    labelPluralAr: "خدمات",
    icon: "briefcase",
    routePrefix: "services",
    legacyEntityType: "SERVICE",
    fields: OFFERING_FIELDS,
    displayDefaults: { showIcon: true, showPrice: false },
  },
];

export function getBuiltinContentType(slug: string): ContentTypeDefinition | undefined {
  return BUILTIN_CONTENT_TYPES.find((t) => t.slug === slug);
}

export function resolveContentTypeLabelPlural(slug: string, fallback = slug): string {
  const builtin = getBuiltinContentType(slug);
  if (builtin?.labelPluralEn?.trim()) return builtin.labelPluralEn.trim();
  return fallback.trim() || slug;
}

const HIDDEN_GENERIC_SELECT_KEYS = new Set(["type", "offeringtype", "servicetype"]);

export function selectFieldsFromSchema(
  raw: unknown,
  slug: string,
): NonNullable<ContentTypeOption["selectFields"]> {
  const fields = resolveFieldSchema({ fieldSchema: raw }, slug);
  return fields
    .filter(
      (field) =>
        field?.type === "select" &&
        Array.isArray(field.options) &&
        field.options.length > 0 &&
        !HIDDEN_GENERIC_SELECT_KEYS.has((field.key ?? "").trim().toLowerCase()),
    )
    .map((field) => ({
      key: field.key,
      label: field.labelEn?.trim() || field.key,
      options: (field.options ?? []).map((option) => ({
        value: option.value,
        label: option.labelEn?.trim() || option.value,
      })),
    }));
}

export function resolveFieldSchema(
  type: { fieldSchema: unknown },
  slug: string
): ContentFieldDefinition[] {
  if (Array.isArray(type.fieldSchema) && type.fieldSchema.length > 0) {
    return type.fieldSchema as ContentFieldDefinition[];
  }
  return getBuiltinContentType(slug)?.fields ?? [];
}

/** Append builtin fields that are missing from a stored schema (non-destructive). */
export function mergeMissingBuiltinFields(
  stored: unknown,
  builtin: ContentFieldDefinition[],
): ContentFieldDefinition[] | null {
  if (!Array.isArray(stored) || stored.length === 0) return null;
  const current = stored as ContentFieldDefinition[];
  const keys = new Set(current.map((field) => field.key));
  const missing = builtin.filter((field) => field.key && !keys.has(field.key));
  if (missing.length === 0) return null;
  return [...current, ...missing];
}

/** Legacy catalog source → content type slug */
export const LEGACY_SOURCE_TO_TYPE: Record<string, string> = {
  packages: "catalog-items",
  hotels: "listings",
  services: "offerings",
};

export const TYPE_TO_LEGACY_SOURCE: Record<string, "packages" | "hotels" | "services"> = {
  "catalog-items": "packages",
  listings: "hotels",
  offerings: "services",
};

import { Prisma } from "@prisma/client";

const ORIGIN_BUILTIN_SLUG_KEY = "originBuiltinSlug";
const RETIRED_BUILTIN_SLUGS_KEY = "retiredBuiltinSlugs";

function asConfigRecord(value: unknown): Record<string, Prisma.JsonValue> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, Prisma.JsonValue>)
    : {};
}

export function readOriginBuiltinSlug(adminConfig: unknown): string | null {
  const raw = asConfigRecord(adminConfig)[ORIGIN_BUILTIN_SLUG_KEY];
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

export function readRetiredBuiltinSlugs(adminConfig: unknown): string[] {
  const raw = asConfigRecord(adminConfig)[RETIRED_BUILTIN_SLUGS_KEY];
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map((slug) => (typeof slug === "string" ? slug.trim() : "")).filter(Boolean))];
}

export function markReplacedBuiltinSlug(
  adminConfig: unknown,
  builtinSlug: string,
): Record<string, Prisma.JsonValue> {
  const next: Record<string, Prisma.JsonValue> = { ...asConfigRecord(adminConfig) };
  const slug = builtinSlug.trim();
  if (!slug) return next;
  const retired = new Set(readRetiredBuiltinSlugs(next));
  retired.add(slug);
  next[RETIRED_BUILTIN_SLUGS_KEY] = [...retired] as Prisma.JsonValue;
  if (!readOriginBuiltinSlug(next)) {
    next[ORIGIN_BUILTIN_SLUG_KEY] = slug as Prisma.JsonValue;
  }
  return next;
}

export function preserveBuiltinRetirement(
  storedAdminConfig: unknown,
  incomingAdminConfig: unknown,
): Record<string, Prisma.JsonValue> {
  const next: Record<string, Prisma.JsonValue> = { ...asConfigRecord(incomingAdminConfig) };
  const origin = readOriginBuiltinSlug(next) ?? readOriginBuiltinSlug(storedAdminConfig);
  if (origin) next[ORIGIN_BUILTIN_SLUG_KEY] = origin;
  const retired = new Set([
    ...readRetiredBuiltinSlugs(storedAdminConfig),
    ...readRetiredBuiltinSlugs(next),
  ]);
  if (retired.size > 0) next[RETIRED_BUILTIN_SLUGS_KEY] = [...retired] as Prisma.JsonValue;
  return next;
}

export function collectRetiredBuiltinSlugs(
  types: Array<{ slug: string; adminConfig?: unknown }>,
): Set<string> {
  const retired = new Set<string>();
  for (const type of types) {
    for (const slug of readRetiredBuiltinSlugs(type.adminConfig)) retired.add(slug);
    const origin = readOriginBuiltinSlug(type.adminConfig);
    if (origin) retired.add(origin);
  }
  return retired;
}

/** Skip recreating a builtin that was renamed, deleted, or replaced by its legacy alias slug. */
export function shouldCreateBuiltinType(
  builtinSlug: string,
  existing: Array<{ slug: string; adminConfig?: unknown }>,
): boolean {
  if (existing.some((type) => type.slug === builtinSlug)) return false;
  if (collectRetiredBuiltinSlugs(existing).has(builtinSlug)) return false;
  const legacyAlias = TYPE_TO_LEGACY_SOURCE[builtinSlug];
  if (legacyAlias && existing.some((type) => type.slug === legacyAlias)) return false;
  return true;
}
