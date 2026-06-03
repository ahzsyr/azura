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
import { urlPrefixToCatalogLocale } from "@/features/catalog/locales";

export async function loadPageListingLayout(
  localePrefix: string,
  pageSlug: "products" | "collections",
): Promise<ResolvedProductListingLayout> {
  const catalogLocale = urlPrefixToCatalogLocale(localePrefix);
  const site = await readSiteSettings(catalogLocale);
  const siteLayout = resolveProductListingLayout(
    normalizeProductListingLayoutPartial(site.productListingLayout) ?? undefined,
  );

  const path = join(process.cwd(), "src", "data", catalogLocale, "pages", `${pageSlug}.json`);
  try {
    const raw = JSON.parse(await readFile(path, "utf-8")) as { listingLayout?: unknown };
    const partial = normalizeProductListingLayoutPartial(raw.listingLayout);
    return resolvePageListingLayout(siteLayout, partial);
  } catch {
    return siteLayout;
  }
}
