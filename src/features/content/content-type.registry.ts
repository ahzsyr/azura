import type { ContentFieldDefinition, ContentTypeDefinition } from "@/features/content/types";

const PACKAGE_FIELDS: ContentFieldDefinition[] = [
  { key: "duration", type: "number", labelEn: "Duration (days)", group: "pricing", required: true },
  { key: "price", type: "price", labelEn: "Price", group: "pricing", required: true },
  { key: "currency", type: "text", labelEn: "Currency", group: "pricing", placeholder: "USD" },
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
  { key: "highlights", type: "json", labelEn: "Highlights (JSON)", localized: true, group: "details" },
  { key: "address", type: "textarea", labelEn: "Address", localized: true, group: "location" },
  { key: "distance", type: "textarea", labelEn: "Distance info", localized: true, group: "location" },
  { key: "amenities", type: "json", labelEn: "Amenities (JSON)", localized: true, group: "details" },
];

const OFFERING_FIELDS: ContentFieldDefinition[] = [
  {
    key: "offeringType",
    type: "select",
    labelEn: "Type",
    group: "cta",
    options: [
      { value: "TRANSPORT", labelEn: "Transport" },
      { value: "AIRPORT_PICKUP", labelEn: "Airport pickup" },
      { value: "HOTEL", labelEn: "Hotel service" },
      { value: "OTHER", labelEn: "Other" },
    ],
  },
  { key: "highlights", type: "json", labelEn: "Highlights (JSON)", localized: true, group: "details" },
  { key: "icon", type: "text", labelEn: "Icon name", group: "display", placeholder: "compass" },
  { key: "ctaLabel", type: "text", labelEn: "CTA label", localized: true, group: "cta" },
  { key: "ctaHref", type: "url", labelEn: "CTA link", group: "cta" },
];

/** Built-in content type definitions — extensible via DB ContentType.fieldSchema */
export const BUILTIN_CONTENT_TYPES: ContentTypeDefinition[] = [
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
    nameEn: "Offerings",
    nameAr: "عروض",
    labelSingularEn: "Offering",
    labelSingularAr: "عرض",
    labelPluralEn: "Offerings",
    labelPluralAr: "عروض",
    icon: "briefcase",
    routePrefix: "hotels-transport",
    legacyEntityType: "SERVICE",
    fields: OFFERING_FIELDS,
    displayDefaults: { showIcon: true, showPrice: false },
  },
];

export function getBuiltinContentType(slug: string): ContentTypeDefinition | undefined {
  return BUILTIN_CONTENT_TYPES.find((t) => t.slug === slug);
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
