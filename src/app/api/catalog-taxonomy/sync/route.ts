import { NextResponse } from "next/server";
import {
  mergeBrandProfiles,
  mergeTaxonomyLists,
  readCatalogBrandProfiles,
  readCatalogTaxonomy,
  scanTaxonomyFromCatalog,
  syncBrandProfileLinks,
} from "@/features/catalog/admin/catalog-taxonomy";
import { syncBrandNamesFromProfiles } from "@/features/catalog/types/catalog-brand-profile";
import {
  adminLocale,
  resolveConfiguredLocaleCode,
} from "@/features/catalog/admin/catalog-admin-config";
import { prefixToCatalogLocaleCode, getCatalogLocaleCodes } from "@/features/catalog/locales";
import { patchSiteSettingsKey } from "@/features/catalog/site-settings.service";
import { requireCatalogAdmin } from "@/lib/catalog-api-auth";

export async function POST(request: Request) {
  const unauthorized = await requireCatalogAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      locale?: string;
      mode?: "merge" | "replace";
      includeCategoriesInTags?: boolean;
    };

    const locale = resolveConfiguredLocaleCode(
      typeof body.locale === "string" ? body.locale : "",
      adminLocale.code,
    );
    const catalogLocale = await prefixToCatalogLocaleCode(locale);
    const enabledCodes = await getCatalogLocaleCodes();
    if (!enabledCodes.some((c) => c.toLowerCase() === catalogLocale.toLowerCase())) {
      return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
    }

    const mode = body.mode === "replace" ? "replace" : "merge";
    const scanned = await scanTaxonomyFromCatalog(catalogLocale);
    const current = await readCatalogTaxonomy(locale);

    const tagSource = body.includeCategoriesInTags
      ? [...scanned.tags, ...scanned.categories]
      : scanned.tags;

    const brands = mergeTaxonomyLists(current.brands, scanned.brands, mode);
    const tags = mergeTaxonomyLists(current.tags, tagSource, mode);
    const existingProfiles = await readCatalogBrandProfiles(locale);
    const brandProfiles = syncBrandProfileLinks(
      mergeBrandProfiles(existingProfiles, scanned.brands, mode),
    );
    const syncedBrands = syncBrandNamesFromProfiles(brandProfiles);

    await patchSiteSettingsKey(locale, "catalogBrands", syncedBrands.length > 0 ? syncedBrands : brands);
    await patchSiteSettingsKey(locale, "catalogTags", tags);
    await patchSiteSettingsKey(locale, "catalogBrandProfiles", brandProfiles);

    return NextResponse.json({
      brands: syncedBrands.length > 0 ? syncedBrands : brands,
      tags,
      brandProfiles,
      scanned: {
        brands: scanned.brands.length,
        tags: scanned.tags.length,
        categories: scanned.categories.length,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Sync failed" },
      { status: 500 },
    );
  }
}
