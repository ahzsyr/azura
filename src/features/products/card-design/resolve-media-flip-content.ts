import type { ProductListingRecord } from "@/features/products/listing/types";

const MAX_BENEFITS = 4;

export type MediaFlipContent = {
  front: {
    brand: string;
    title: string;
    description: string;
  };
  back: {
    category: string;
    productType: string;
    benefits: string[];
    idealFor: string[];
  };
};

type MediaFlipProductInput = Pick<
  ProductListingRecord,
  "name" | "brand" | "category" | "categories" | "tags" | "short_description" | "environment"
> & {
  /** Optional long description when present on extended product payloads. */
  description?: string | null;
};

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const value = raw.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function resolveFrontDescription(product: MediaFlipProductInput): string {
  const short = product.short_description?.trim();
  if (short) return short;
  const long = product.description?.trim();
  if (long) return long;
  return "";
}

function resolveBackCategory(product: MediaFlipProductInput): string {
  const category = product.category?.trim();
  if (category) return category;
  const first = product.categories?.[0]?.trim();
  if (first) return first;
  return "";
}

function resolveIdealFor(product: MediaFlipProductInput): string[] {
  const values: string[] = [];
  if (product.environment?.trim()) {
    values.push(product.environment.trim());
  }
  if (product.categories?.length) {
    values.push(...product.categories);
  }
  return dedupeStrings(values);
}

/** Normalize product fields into presentational flip-card content. */
export function resolveMediaFlipContent(product: MediaFlipProductInput): MediaFlipContent {
  const benefits = (product.tags ?? [])
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, MAX_BENEFITS);

  return {
    front: {
      brand: product.brand?.trim() ?? "",
      title: product.name?.trim() || "Product",
      description: resolveFrontDescription(product),
    },
    back: {
      category: resolveBackCategory(product),
      productType: product.name?.trim() || "Product",
      benefits,
      idealFor: resolveIdealFor(product),
    },
  };
}
