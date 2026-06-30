import "server-only";

import { readCatalogBrandProfiles, readCatalogTaxonomy } from "@/features/catalog/admin/catalog-taxonomy";
import type { CatalogBrandProfile } from "@/features/catalog/types/catalog-brand-profile";
import { brandNameToSlug } from "@/features/catalog/types/catalog-brand-profile";
import type { ProductListingRecord } from "@/features/products/listing/types";

export type BrandPageEntry = {
  slug: string;
  name: string;
  productCount: number;
  profile?: CatalogBrandProfile;
};

export type TagPageEntry = {
  slug: string;
  name: string;
  productCount: number;
};

export function tagNameToSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uniqueSlug(base: string, used: Set<string>, fallbackPrefix: string): string {
  const root = base.trim() || `${fallbackPrefix}-${used.size + 1}`;
  if (!used.has(root)) {
    used.add(root);
    return root;
  }
  let i = 2;
  while (used.has(`${root}-${i}`)) i += 1;
  const next = `${root}-${i}`;
  used.add(next);
  return next;
}

function countBrands(records: ProductListingRecord[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const record of records) {
    const brand = record.brand?.trim();
    if (!brand) continue;
    const key = brand.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function countTags(records: ProductListingRecord[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const record of records) {
    for (const rawTag of record.tags) {
      const tag = rawTag.trim();
      if (!tag) continue;
      const key = tag.toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return counts;
}

export function buildBrandPageEntries(
  records: ProductListingRecord[],
  taxonomyBrands: string[],
  profiles: CatalogBrandProfile[],
): BrandPageEntry[] {
  const counts = countBrands(records);
  const profileByName = new Map(
    profiles.map((profile) => [profile.name.trim().toLowerCase(), profile]),
  );

  const names = new Set<string>();
  for (const brand of taxonomyBrands) {
    const value = brand.trim();
    if (value) names.add(value);
  }
  for (const profile of profiles) {
    const value = profile.name.trim();
    if (value) names.add(value);
  }
  for (const record of records) {
    const value = record.brand?.trim();
    if (value) names.add(value);
  }

  const usedSlugs = new Set<string>();
  const entries = [...names]
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
    .map((name) => {
      const profile = profileByName.get(name.toLowerCase());
      const slugBase = profile?.slug?.trim() || brandNameToSlug(name);
      const slug = uniqueSlug(slugBase, usedSlugs, "brand");
      return {
        slug,
        name,
        profile,
        productCount: counts.get(name.toLowerCase()) ?? 0,
      };
    });

  return entries.sort((a, b) => {
    const featuredDelta = Number(Boolean(b.profile?.featured)) - Number(Boolean(a.profile?.featured));
    if (featuredDelta !== 0) return featuredDelta;
    if (b.productCount !== a.productCount) return b.productCount - a.productCount;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

export function buildTagPageEntries(
  records: ProductListingRecord[],
  taxonomyTags: string[],
): TagPageEntry[] {
  const counts = countTags(records);
  const names = new Set<string>();
  for (const tag of taxonomyTags) {
    const value = tag.trim();
    if (value) names.add(value);
  }
  for (const record of records) {
    for (const rawTag of record.tags) {
      const value = rawTag.trim();
      if (value) names.add(value);
    }
  }

  const usedSlugs = new Set<string>();
  const entries = [...names]
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
    .map((name) => ({
      slug: uniqueSlug(tagNameToSlug(name), usedSlugs, "tag"),
      name,
      productCount: counts.get(name.toLowerCase()) ?? 0,
    }));

  return entries.sort((a, b) => {
    if (b.productCount !== a.productCount) return b.productCount - a.productCount;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

export async function loadBrandAndTagEntries(
  localePrefix: string,
  records: ProductListingRecord[],
): Promise<{ brands: BrandPageEntry[]; tags: TagPageEntry[] }> {
  const [taxonomy, profiles] = await Promise.all([
    readCatalogTaxonomy(localePrefix),
    readCatalogBrandProfiles(localePrefix),
  ]);
  return {
    brands: buildBrandPageEntries(records, taxonomy.brands, profiles),
    tags: buildTagPageEntries(records, taxonomy.tags),
  };
}

export function findBrandBySlug(entries: BrandPageEntry[], slug: string): BrandPageEntry | null {
  const target = slug.trim().toLowerCase();
  return entries.find((entry) => entry.slug.toLowerCase() === target) ?? null;
}

export function findTagBySlug(entries: TagPageEntry[], slug: string): TagPageEntry | null {
  const target = slug.trim().toLowerCase();
  return entries.find((entry) => entry.slug.toLowerCase() === target) ?? null;
}

export function brandHref(localePrefix: string, brandName: string): string {
  return `/${localePrefix}/brands/${brandNameToSlug(brandName)}`;
}

export function tagHref(localePrefix: string, tagName: string): string {
  return `/${localePrefix}/tags/${tagNameToSlug(tagName)}`;
}
