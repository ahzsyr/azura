import {
  brandShowcasePropsSchema,
  categoryShowcasePropsSchema,
  megaCollectionShowcasePropsSchema,
  productDiscoveryPropsSchema,
  productShowcasePropsSchema,
  taxonomyProductTabsPropsSchema,
} from "@/features/commerce-showcase/schemas/showcase-blocks";

export function parseProductShowcaseProps(raw: Record<string, unknown>) {
  return productShowcasePropsSchema.parse(raw);
}

export function parseCategoryShowcaseProps(raw: Record<string, unknown>) {
  return categoryShowcasePropsSchema.parse(raw);
}

export function parseBrandShowcaseProps(raw: Record<string, unknown>) {
  return brandShowcasePropsSchema.parse(raw);
}

export function parseTaxonomyProductTabsProps(raw: Record<string, unknown>) {
  return taxonomyProductTabsPropsSchema.parse(raw);
}

export function parseMegaCollectionShowcaseProps(raw: Record<string, unknown>) {
  return megaCollectionShowcasePropsSchema.parse(raw);
}

export function parseProductDiscoveryProps(raw: Record<string, unknown>) {
  return productDiscoveryPropsSchema.parse(raw);
}
