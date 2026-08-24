import "server-only";

import { readSiteSettings } from "@/features/catalog/site-settings.service";
import { applyProductOrdering } from "./apply-product-ordering";
import {
  parseProductOrderingSettings,
  type ProductOrderingSettings,
} from "./product-ordering.schema";
import {
  resolveProductOrderingProfile,
  type ProductOrderingContext,
} from "./resolve-product-ordering-profile";
import type { OrderableListingRecord } from "./apply-product-ordering";

export async function loadProductOrderingSettings(
  localeOrCatalogLocale: string,
): Promise<ProductOrderingSettings> {
  const site = await readSiteSettings(localeOrCatalogLocale);
  return parseProductOrderingSettings(site.productOrdering);
}

/**
 * Resolve profile for an explicit listing surface and apply priority buckets.
 * Pass `null` settings to skip a site-settings read when already loaded.
 */
export async function orderListingRecordsWithSettings<T extends OrderableListingRecord>(
  records: T[],
  context: ProductOrderingContext,
  options?: {
    locale?: string;
    settings?: ProductOrderingSettings | null;
  },
): Promise<T[]> {
  if (records.length <= 1) return records;

  const settings =
    options?.settings ??
    (options?.locale ? await loadProductOrderingSettings(options.locale) : null);

  if (!settings) return records;

  const profile = resolveProductOrderingProfile(settings, context);
  if (!profile) return records;
  return applyProductOrdering(records, profile);
}
