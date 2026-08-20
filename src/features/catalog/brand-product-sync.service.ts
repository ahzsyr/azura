import "server-only";

import { matchingBrandsForProduct } from "@/features/catalog/brand-matching";
import {
  normalizeCatalogBrandProfiles,
  type CatalogBrandProfile,
} from "@/features/catalog/types/catalog-brand-profile";
import { loadAllProducts } from "@/features/collections/collection-sync.service";
import { patchProductToDb } from "@/features/products/db/product-db-patch";
import { rebuildProductIndexesForLocale } from "@/features/products/index/product-index-patcher";
import { invalidateProductIndexLoaderCache } from "@/features/products/index/product-index-loader";
import { invalidateListingQueryCaches } from "@/features/products/listing/cache/index-version";
import { productsDataService } from "@/features/products/products-data.service";
import { useCatalogProductsDb } from "@/features/products/products-source";
import { catalogLocaleFromParam } from "@/features/products/fs/product-fs-scan";
import { localeService } from "@/features/i18n/locale.service";
import { resolveCodeToPrefix } from "@/i18n/locale-config";
import { revalidateProductListing } from "@/services/cache";

export type BrandProductSyncReport = {
  productsScanned: number;
  assigned: number;
  unchanged: number;
  skippedNoMatch: number;
  conflicts: number;
  errors: string[];
};

async function refreshListingCachesAfterBrandSync(localeParam: string): Promise<void> {
  productsDataService.invalidateIndex();
  invalidateProductIndexLoaderCache();
  invalidateListingQueryCaches();

  try {
    await rebuildProductIndexesForLocale(localeParam);
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "Index rebuild failed");
  }

  try {
    const catalogLocale = await catalogLocaleFromParam(localeParam);
    const enabled = await localeService.listEnabled();
    const prefix = resolveCodeToPrefix(catalogLocale, enabled);
    revalidateProductListing(prefix);
  } catch {
    revalidateProductListing(localeParam);
  }
}

export async function syncBrandProductMemberships(
  locale: string,
  profilesInput: CatalogBrandProfile[],
): Promise<BrandProductSyncReport> {
  const report: BrandProductSyncReport = {
    productsScanned: 0,
    assigned: 0,
    unchanged: 0,
    skippedNoMatch: 0,
    conflicts: 0,
    errors: [],
  };

  if (!useCatalogProductsDb()) {
    throw new Error("Brand sync requires database catalog mode (Supabase PostgreSQL)");
  }

  const profiles = normalizeCatalogBrandProfiles(profilesInput);
  const products = await loadAllProducts(locale);

  for (const { slug, product } of products) {
    report.productsScanned += 1;
    const matched = matchingBrandsForProduct(slug, product, profiles);
    const winner = matched[0];
    if (!winner) {
      report.skippedNoMatch += 1;
      continue;
    }
    if (matched.length > 1) report.conflicts += 1;

    const current = (product.brand ?? "").trim();
    if (current === winner.name) {
      report.unchanged += 1;
      continue;
    }

    try {
      const patched = await patchProductToDb(
        slug,
        { brand: winner.name },
        {
          sourceType: "manual",
          localeCode: locale,
          localizedSlug: slug,
        },
      );
      if (!patched.ok) {
        report.errors.push(`${slug}: ${patched.error}`);
        continue;
      }
      if (patched.noop) {
        report.unchanged += 1;
      } else {
        report.assigned += 1;
      }
    } catch (e) {
      report.errors.push(`${slug}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  try {
    await refreshListingCachesAfterBrandSync(locale);
  } catch (e) {
    report.errors.push(`Listing refresh: ${e instanceof Error ? e.message : String(e)}`);
  }

  return report;
}
