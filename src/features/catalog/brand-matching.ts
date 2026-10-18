import {
  isEmptyRuleTree,
  matchEntityToRulesBool,
  productToRuleFields,
  upgradeLegacyRuleSet,
  type RuleEntityFields,
} from "@/features/categories/matching";
import type { CatalogBrandProfile } from "@/features/catalog/types/catalog-brand-profile";
import type { Product } from "@/features/products/types";
import type { ProductListingRecord } from "@/features/products/listing/types";

function orderedBrandProfiles(profiles: CatalogBrandProfile[]): CatalogBrandProfile[] {
  return [...profiles].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

/** Map a listing index row to the Matching Rules field bag (PRODUCT scope). */
export function listingRecordToRuleFields(record: ProductListingRecord): RuleEntityFields {
  const specification: string[] = [];
  const specFields: Record<string, string[]> = {};
  for (const [typeRaw, options] of Object.entries(record.variationFacets ?? {})) {
    const type = typeRaw.trim();
    if (!type || !options?.length) continue;
    specFields[`spec:${type}`] = options;
    for (const option of options) {
      const value = option.trim();
      if (!value) continue;
      specification.push(`${type}:${value}`, `${type}: ${value}`, value);
    }
  }

  return {
    id: record.id ?? record.slug,
    slug: record.slug,
    name: record.name,
    title: record.name,
    category: record.category ?? "",
    categories: record.categories ?? [],
    brand: record.brand ?? "",
    mainCategory: record.mainCategory ?? "",
    environment: record.environment ?? "",
    mountingMethod: record.mountingMethod ?? "",
    generation: record.generation ?? "",
    antennaDesign: record.antennaDesign ?? "",
    price: record.priceMin ?? Number(record.price?.value ?? 0),
    comparePrice: record.old_price ?? null,
    badge: "",
    tags: record.tags ?? [],
    status: record.availability ?? "",
    stock: record.stock_status ?? (record.in_stock ? "in-stock" : "out-of-stock"),
    mpn: record.mpn ?? "",
    description: record.short_description ?? "",
    specification,
    matchingRules: record.matchingRules ?? [],
    ...specFields,
  };
}

export function recordMatchesBrandProfile(
  record: ProductListingRecord,
  profile: CatalogBrandProfile,
): boolean {
  const root = upgradeLegacyRuleSet(profile.conditions);
  if (isEmptyRuleTree(root)) {
    return (record.brand ?? "").trim().toLowerCase() === profile.name.trim().toLowerCase();
  }
  return matchEntityToRulesBool(listingRecordToRuleFields(record), root);
}

export function filterRecordsForBrandProfile(
  records: ProductListingRecord[],
  profile: CatalogBrandProfile,
): ProductListingRecord[] {
  return records.filter((record) => recordMatchesBrandProfile(record, profile));
}

export function countRecordsForBrandProfile(
  records: ProductListingRecord[],
  profile: CatalogBrandProfile,
): number {
  return filterRecordsForBrandProfile(records, profile).length;
}

export function matchingBrandsForFields(
  fields: RuleEntityFields,
  profiles: CatalogBrandProfile[],
): CatalogBrandProfile[] {
  return orderedBrandProfiles(profiles).filter((profile) => {
    const root = upgradeLegacyRuleSet(profile.conditions);
    if (isEmptyRuleTree(root)) return false;
    return matchEntityToRulesBool(fields, root);
  });
}

export function matchingBrandsForProduct(
  slug: string,
  product: Product,
  profiles: CatalogBrandProfile[],
): CatalogBrandProfile[] {
  return matchingBrandsForFields(productToRuleFields(slug, product), profiles);
}

export function winningBrandForProduct(
  slug: string,
  product: Product,
  profiles: CatalogBrandProfile[],
): CatalogBrandProfile | null {
  return matchingBrandsForProduct(slug, product, profiles)[0] ?? null;
}
