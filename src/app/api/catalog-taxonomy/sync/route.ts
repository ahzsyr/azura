import { NextResponse } from "next/server";
import {
  mergeTaxonomyLists,
  readCatalogTaxonomy,
  scanTaxonomyFromCatalog,
} from "@/features/catalog/admin/catalog-taxonomy";
import {
  adminLocale,
  resolveConfiguredLocaleCode,
} from "@/features/catalog/admin/catalog-admin-config";
import { urlPrefixToCatalogLocale, isCatalogLocale } from "@/features/catalog/locales";
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
    const catalogLocale = urlPrefixToCatalogLocale(locale);
    if (!isCatalogLocale(catalogLocale)) {
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

    await patchSiteSettingsKey(locale, "catalogBrands", brands);
    await patchSiteSettingsKey(locale, "catalogTags", tags);

    return NextResponse.json({
      brands,
      tags,
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
