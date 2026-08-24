import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  normalizeProductListingLayoutPartial,
  resolvePageListingLayout,
  resolveProductListingLayout,
  type ResolvedProductListingLayout,
} from "@/features/catalog/lib/catalog-layout";
import { readSiteSettings } from "@/features/catalog/site-settings.service";
import { prefixToCatalogLocaleCode } from "@/features/catalog/locales";
import { isCloudNativeProduction } from "@/lib/cloud-native-guard";
import { catalogSeedRoot } from "@/lib/catalog-seed-paths";

export async function loadPageListingLayout(
  localePrefix: string,
  pageSlug: "products" | "collections",
): Promise<ResolvedProductListingLayout> {
  const catalogLocale = await prefixToCatalogLocaleCode(localePrefix);
  const site = await readSiteSettings(catalogLocale);
  const siteLayout = resolveProductListingLayout(
    normalizeProductListingLayoutPartial(site.productListingLayout) ?? undefined,
  );

  if (isCloudNativeProduction()) {
    return siteLayout;
  }

  const pagePath = join(catalogSeedRoot(), catalogLocale, "pages", `${pageSlug}.json`);
  try {
    const raw = JSON.parse(await readFile(pagePath, "utf-8")) as { listingLayout?: unknown };
    const partial = normalizeProductListingLayoutPartial(raw.listingLayout);
    return resolvePageListingLayout(siteLayout, partial);
  } catch {
    return siteLayout;
  }
}
