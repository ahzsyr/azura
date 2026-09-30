import { detectNapDrift, type NapSnapshot } from "@/features/search-intelligence/authority";
import { SCHEMA_ENTITY_TYPES, type SchemaEntityType } from "@/features/seo/platform/schema-pipeline/constants";

export type GbpLocationPayload = {
  name?: string;
  title?: string;
  storefrontAddress?: {
    addressLines?: string[];
    locality?: string;
    administrativeArea?: string;
    postalCode?: string;
    regionCode?: string;
  };
  phoneNumbers?: {
    primaryPhone?: string;
    additionalPhones?: string[];
  };
  categories?: {
    primaryCategory?: {
      name?: string;
      displayName?: string;
    };
  };
};

export type ParsedGbpLocation = {
  name: string;
  title: string;
  phone: string | null;
  address: string | null;
  primaryCategory: string | null;
  suggestedEntityType: SchemaEntityType | null;
};

const GCID_TO_SCHEMA: Record<string, SchemaEntityType> = {
  electronics_store: "ElectronicsStore",
  consumer_electronics_store: "ElectronicsStore",
  computer_store: "ComputerStore",
  computer_repair_service: "ComputerStore",
  wholesaler: "WholesaleStore",
  wholesale_store: "WholesaleStore",
  store: "Store",
  professional_services: "ProfessionalService",
  consultant: "ProfessionalService",
  local_business: "LocalBusiness",
  corporation: "Corporation",
};

function tokenizeCategory(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/^categories\/gcid:/, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function mapGbpCategoryToSchemaEntityType(
  category?: { name?: string; displayName?: string } | string | null,
): SchemaEntityType | null {
  if (!category) return null;
  const raw =
    typeof category === "string"
      ? category
      : `${category.name ?? ""} ${category.displayName ?? ""}`.trim();
  if (!raw) return null;

  const token = tokenizeCategory(raw);
  const mapped = GCID_TO_SCHEMA[token];
  if (mapped && SCHEMA_ENTITY_TYPES.includes(mapped)) return mapped;

  for (const [key, type] of Object.entries(GCID_TO_SCHEMA)) {
    if (token.includes(key) || raw.toLowerCase().includes(key.replace(/_/g, " "))) {
      return type;
    }
  }
  return null;
}

export function formatGbpAddress(
  address?: GbpLocationPayload["storefrontAddress"],
): string | null {
  if (!address) return null;
  const parts = [
    ...(address.addressLines ?? []),
    address.locality,
    address.administrativeArea,
    address.postalCode,
    address.regionCode,
  ]
    .map((part) => part?.trim())
    .filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

export function parseGbpLocation(location: GbpLocationPayload): ParsedGbpLocation {
  const title = location.title?.trim() || location.name?.trim() || "Location";
  const phone =
    location.phoneNumbers?.primaryPhone?.trim() ||
    location.phoneNumbers?.additionalPhones?.find((item) => item.trim())?.trim() ||
    null;
  const primaryCategory =
    location.categories?.primaryCategory?.displayName?.trim() ||
    location.categories?.primaryCategory?.name?.trim() ||
    null;
  return {
    name: location.name?.trim() || title,
    title,
    phone,
    address: formatGbpAddress(location.storefrontAddress),
    primaryCategory,
    suggestedEntityType: mapGbpCategoryToSchemaEntityType(location.categories?.primaryCategory),
  };
}

export function compareGbpNapWithSite(input: {
  gbp: { name?: string | null; address?: string | null; phone?: string | null };
  company: { name?: string | null; address?: string | null; phone?: string | null };
  pages?: Array<{ source: string; name?: string | null; address?: string | null; phone?: string | null }>;
}): string[] {
  const snapshots: NapSnapshot[] = [
    {
      source: "google_business_profile",
      name: input.gbp.name,
      address: input.gbp.address,
      phone: input.gbp.phone,
    },
    {
      source: "company",
      name: input.company.name,
      address: input.company.address,
      phone: input.company.phone,
    },
    ...(input.pages ?? []).map((page) => ({
      source: page.source,
      name: page.name,
      address: page.address,
      phone: page.phone,
    })),
  ];
  return detectNapDrift(snapshots);
}
