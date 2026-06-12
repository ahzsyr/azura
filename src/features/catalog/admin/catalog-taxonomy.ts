import "server-only";

import { readSiteSettings } from "@/features/catalog/site-settings.service";
import {
  normalizeCatalogBrandProfiles,
  seedProfilesFromBrandNames,
  type CatalogBrandProfile,
} from "@/features/catalog/types/catalog-brand-profile";
import { getUniqueProductIndexEntries } from "@/features/products/fs/product-catalog-index";
import { productsDataService } from "@/features/products/products-data.service";
import type { CatalogLocale } from "@/features/catalog/locales";

export function normalizeTaxonomyList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const s = String(item ?? "").trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

export function mergeTaxonomyLists(
  base: string[],
  incoming: string[],
  mode: "merge" | "replace",
): string[] {
  if (mode === "replace") return normalizeTaxonomyList(incoming);
  return normalizeTaxonomyList([...base, ...incoming]);
}

export async function readCatalogTaxonomy(locale: string): Promise<{
  brands: string[];
  tags: string[];
}> {
  const site = await readSiteSettings(locale);
  return {
    brands: normalizeTaxonomyList(site.catalogBrands),
    tags: normalizeTaxonomyList(site.catalogTags),
  };
}

export async function readCatalogBrandProfiles(locale: string): Promise<CatalogBrandProfile[]> {
  const site = await readSiteSettings(locale);
  return normalizeCatalogBrandProfiles(site.catalogBrandProfiles);
}

export function mergeBrandProfiles(
  existing: CatalogBrandProfile[],
  incoming: string[],
  mode: "merge" | "replace",
): CatalogBrandProfile[] {
  if (mode === "replace") {
    return seedProfilesFromBrandNames([], incoming);
  }
  return seedProfilesFromBrandNames(existing, incoming);
}

/** Scan on-disk products for distinct brand / tags / categories. */
export async function scanTaxonomyFromCatalog(
  catalogLocale: CatalogLocale,
): Promise<{ brands: string[]; tags: string[]; categories: string[] }> {
  const brandSet = new Set<string>();
  const tagSet = new Set<string>();
  const categorySet = new Set<string>();

  const entries = await getUniqueProductIndexEntries(catalogLocale);
  for (const { slug } of entries) {
    const loaded = await productsDataService.getProduct(catalogLocale, slug);
    if (!loaded) continue;
    const p = loaded.product;
    if (p.brand?.trim()) brandSet.add(p.brand.trim());
    for (const t of p.tags ?? []) {
      if (t?.trim()) tagSet.add(t.trim());
    }
    for (const c of p.categories ?? []) {
      if (c?.trim()) categorySet.add(c.trim());
    }
    if (p.category?.trim()) categorySet.add(p.category.trim());
  }

  const sort = (arr: string[]) =>
    [...arr].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

  return {
    brands: sort([...brandSet]),
    tags: sort([...tagSet]),
    categories: sort([...categorySet]),
  };
}
