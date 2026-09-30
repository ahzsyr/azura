import { NextResponse } from "next/server";
import {
  mergeBrandProfiles,
  mergeTaxonomyLists,
  readCatalogBrandProfiles,
  readCatalogTaxonomy,
  scanTaxonomyFromCatalog,
  syncBrandProfileLinks,
} from "@/features/catalog/admin/catalog-taxonomy";
import { syncBrandProductMemberships } from "@/features/catalog/brand-product-sync.service";
import {
  ensureDefaultBrandMatchRules,
  normalizeCatalogBrandProfiles,
  syncBrandNamesFromProfiles,
  type CatalogBrandProfile,
} from "@/features/catalog/types/catalog-brand-profile";
import {
  adminLocale,
  resolveConfiguredLocaleCode,
} from "@/features/catalog/admin/catalog-admin-config";
import { prefixToCatalogLocaleCode, getCatalogLocaleCodes } from "@/features/catalog/locales";
import { patchSiteSettingsKey } from "@/features/catalog/site-settings.service";
import { requireCatalogAdmin } from "@/lib/catalog-api-auth";

async function persistBrandTaxonomy(
  locale: string,
  brandProfiles: CatalogBrandProfile[],
  tags?: string[],
) {
  const syncedBrands = syncBrandNamesFromProfiles(brandProfiles);
  await patchSiteSettingsKey(locale, "catalogBrands", syncedBrands);
  await patchSiteSettingsKey(locale, "catalogBrandProfiles", brandProfiles);
  if (tags) {
    await patchSiteSettingsKey(locale, "catalogTags", tags);
  }
  return syncedBrands;
}

export async function POST(request: Request) {
  const unauthorized = await requireCatalogAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      locale?: string;
      action?: "autoCreate" | "syncProducts";
      mode?: "merge" | "replace";
      includeCategoriesInTags?: boolean;
      brandProfiles?: CatalogBrandProfile[];
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

    const action = body.action === "syncProducts" ? "syncProducts" : "autoCreate";
    const currentProfiles = Array.isArray(body.brandProfiles)
      ? normalizeCatalogBrandProfiles(body.brandProfiles).map(ensureDefaultBrandMatchRules)
      : (await readCatalogBrandProfiles(locale)).map(ensureDefaultBrandMatchRules);

    if (action === "syncProducts") {
      const brandProfiles = syncBrandProfileLinks(currentProfiles);
      const syncedBrands = await persistBrandTaxonomy(locale, brandProfiles);
      const report = await syncBrandProductMemberships(catalogLocale, brandProfiles);
      return NextResponse.json({
        brands: syncedBrands,
        brandProfiles,
        report,
      });
    }

    const mode = body.mode === "replace" ? "replace" : "merge";
    const scanned = await scanTaxonomyFromCatalog(catalogLocale);
    const current = await readCatalogTaxonomy(locale);
    const tagSource = body.includeCategoriesInTags
      ? [...scanned.tags, ...scanned.categories]
      : scanned.tags;
    const tags = mergeTaxonomyLists(current.tags, tagSource, mode);
    const brandProfiles = syncBrandProfileLinks(
      mergeBrandProfiles(currentProfiles, scanned.brands, mode),
    );
    const syncedBrands = await persistBrandTaxonomy(locale, brandProfiles, tags);

    return NextResponse.json({
      brands: syncedBrands,
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
