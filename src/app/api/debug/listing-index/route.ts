import { NextResponse } from "next/server";
import type { Locale } from "@/i18n/routing";
import { seoService } from "@/features/seo/seo.service";
import { cmsService } from "@/features/cms/cms.service";
import { loadCatalogListingTheme } from "@/features/catalog/lib/load-catalog-theme";
import { collectionsDataService } from "@/features/collections/collections-data.service";
import { orderCollectionsHierarchy } from "@/features/collections/collection-hierarchy";
import { loadListingLabels } from "@/features/products/listing/load-listing-labels";
import { sanitizeSharedElementId } from "@/lib/navigation/shared-elements/names";
import {
  buildCollectionListingCatalog,
  buildProductListingCatalog,
} from "@/features/products/listing/catalog";
import { filterStateFromSearchParams } from "@/features/products/listing/url-state";

export const dynamic = "force-dynamic";

type ListingMode = "product" | "collection";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale")?.trim() || "en";
  const mode = (url.searchParams.get("mode")?.trim() || "product") as ListingMode;
  const filterState = filterStateFromSearchParams(new URLSearchParams());
  const steps: Array<{ step: string; ok: boolean; detail?: unknown; error?: string }> = [];

  async function runStep(step: string, fn: () => Promise<unknown>) {
    try {
      const detail = await fn();
      steps.push({ step, ok: true, detail });
      return detail;
    } catch (error) {
      steps.push({
        step,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  const pageKey = mode === "collection" ? "collections" : "products";
  const cmsSlug = pageKey;

  try {
    await runStep("generateMetadata", () =>
      seoService.resolveMetadata({
        locale: locale as Locale,
        path: pageKey,
        pageKey,
        fallback: {
          title: mode === "collection" ? "Collections" : "Products",
          description: "Catalog listing debug probe.",
        },
      }),
    );

    const cmsPage = (await runStep("cms.getPublishedPageBySlug", () =>
      cmsService.getPublishedPageBySlug(cmsSlug),
    )) as Awaited<ReturnType<typeof cmsService.getPublishedPageBySlug>>;

    const blocks = Array.isArray(cmsPage?.blocks) ? cmsPage.blocks : [];
    steps.push({
      step: "cms.blocks",
      ok: true,
      detail: { hasPage: Boolean(cmsPage), blockCount: blocks.length },
    });

    const theme = (await runStep("loadCatalogListingTheme", () =>
      loadCatalogListingTheme(locale, pageKey as "products" | "collections"),
    )) as Awaited<ReturnType<typeof loadCatalogListingTheme>>;

    const catalog = (await runStep(
      mode === "collection" ? "buildCollectionListingCatalog" : "buildProductListingCatalog",
      () =>
        mode === "collection"
          ? buildCollectionListingCatalog(locale, filterState)
          : buildProductListingCatalog(locale, filterState),
    )) as Awaited<ReturnType<typeof buildProductListingCatalog>>;

    const listingCopy = (await runStep("loadListingLabels", () =>
      loadListingLabels(mode, locale),
    )) as Awaited<ReturnType<typeof loadListingLabels>>;

    const allCols = (await runStep("collectionsDataService.loadAll", () =>
      collectionsDataService.loadAll({ localePrefix: locale }),
    )) as Awaited<ReturnType<typeof collectionsDataService.loadAll>>;

    const collections = orderCollectionsHierarchy(allCols.filter((c) => c.visible !== false));

    const slugProbe = catalog.records.map((record) => ({
      slug: record.slug,
      typeofSlug: typeof record.slug,
      sanitized: sanitizeSharedElementId(record.slug as string),
    }));
    const badSlugs = slugProbe.filter((row) => row.typeofSlug !== "string");
    steps.push({
      step: "probeSanitizeSlugs",
      ok: badSlugs.length === 0,
      detail: {
        recordCount: slugProbe.length,
        badSlugCount: badSlugs.length,
        badSlugs: badSlugs.slice(0, 5),
      },
    });

    try {
      const tpl = listingCopy.labels.resultsCount;
      tpl
        .replace("{first}", "1")
        .replace("{last}", "20")
        .replace("{total}", String(catalog.total ?? catalog.records.length));
      steps.push({
        step: "probeResultsCountReplace",
        ok: true,
        detail: { typeofResultsCount: typeof tpl },
      });
    } catch (error) {
      steps.push({
        step: "probeResultsCountReplace",
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    try {
      listingCopy.hierarchyLabels.levelUnder.replace("{parent}", "Sample");
      steps.push({
        step: "probeLevelUnderReplace",
        ok: true,
        detail: { typeofLevelUnder: typeof listingCopy.hierarchyLabels.levelUnder },
      });
    } catch (error) {
      steps.push({
        step: "probeLevelUnderReplace",
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    const islandProps = {
      locale,
      records: catalog.records,
      facets: catalog.facets,
      collections,
      layoutVariant: "catalog",
      listingMode: mode,
      hierarchyLabels: listingCopy.hierarchyLabels,
      hierarchyVariant: theme.listingLayout.chromeVariant,
      searchDebounceMs: theme.searchDebounceMs,
      searchFuzziness: theme.searchFuzziness,
      defaultViewMode: theme.listingLayout.defaultViewMode,
      viewModes: theme.listingLayout.viewModes,
      labels: listingCopy.labels,
      catalogToolbarLabels: listingCopy.catalogToolbarLabels,
      cardLayoutCssVars: theme.cardLayoutCssVars,
      buyNow: theme.buyNow,
      quoteCta: theme.quoteCta,
      cardLayout: theme.cardLayout,
      pageDisplay: theme.pageDisplay,
      catalogToolbarDock: theme.toolbarDock,
      pageDir: locale.startsWith("ar") ? "rtl" : "ltr",
      serverPaginated: true,
      total: catalog.total ?? catalog.records.length,
      totalPages: catalog.totalPages ?? 1,
    };

    try {
      const payload = JSON.stringify(islandProps);
      steps.push({
        step: "serializeCollectionsIndexProps",
        ok: true,
        detail: { bytes: payload.length, collectionCount: collections.length },
      });
    } catch (error) {
      steps.push({
        step: "serializeCollectionsIndexProps",
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return NextResponse.json({
      locale,
      mode,
      steps,
      result: "ok",
      catalogSummary: {
        recordCount: catalog.records.length,
        total: catalog.total ?? catalog.records.length,
      },
    });
  } catch {
    return NextResponse.json({ locale, mode, steps, result: "error" }, { status: 500 });
  }
}
