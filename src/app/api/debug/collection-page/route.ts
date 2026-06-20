import { NextResponse } from "next/server";
import type { Locale } from "@/i18n/routing";
import { seoService } from "@/features/seo/seo.service";
import { collectionsDataService } from "@/features/collections/collections-data.service";
import { loadCatalogListingTheme } from "@/features/catalog/lib/load-catalog-theme";
import { buildProductListingCatalogForCollection } from "@/features/products/listing/catalog";
import { loadListingLabels } from "@/features/products/listing/load-listing-labels";
import { orderCollectionsHierarchy } from "@/features/collections/collection-hierarchy";
import {
  buildCollectionTrail,
  collectionMapFromList,
  getChildCollections,
  resolveCollectionImages,
} from "@/features/collections/collection-navigation";
import { isAllowedNextImageSrc } from "@/lib/config/next-image";
import { filterStateFromSearchParams } from "@/features/products/listing/url-state";
import { getDirectionByPrefix } from "@/i18n/locale-registry.server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale")?.trim() || "en";
  const slug = url.searchParams.get("slug")?.trim() || "";
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

  try {
    const collection = (await runStep("loadBySlug", () =>
      collectionsDataService.loadBySlug({ localePrefix: locale }, slug),
    )) as Awaited<ReturnType<typeof collectionsDataService.loadBySlug>>;

    if (!collection) {
      return NextResponse.json({ slug, locale, steps, result: "not_found" });
    }

    const filterState = filterStateFromSearchParams(new URLSearchParams());

    const theme = (await runStep("loadCatalogListingTheme", () =>
      loadCatalogListingTheme(locale, "collections"),
    )) as Awaited<ReturnType<typeof loadCatalogListingTheme>>;

    const catalog = (await runStep("buildProductListingCatalogForCollection", () =>
      buildProductListingCatalogForCollection(locale, slug, filterState),
    )) as Awaited<ReturnType<typeof buildProductListingCatalogForCollection>>;

    const allCols = (await runStep("loadAllCollections", () =>
      collectionsDataService.loadAll({ localePrefix: locale }),
    )) as Awaited<ReturnType<typeof collectionsDataService.loadAll>>;

    const listingCopy = (await runStep("loadListingLabels", () =>
      loadListingLabels("product", locale),
    )) as Awaited<ReturnType<typeof loadListingLabels>>;
    const pageDir = (await runStep("getDirectionByPrefix", () =>
      getDirectionByPrefix(locale),
    )) as Awaited<ReturnType<typeof getDirectionByPrefix>>;

    await runStep("generateMetadata", () =>
      seoService.resolveMetadata({
        locale: locale as Locale,
        path: `/collections/${slug}`,
        pageKey: `collection:${slug}`,
        fallback: {
          title: collection.name,
          description: collection.description || "Browse collection products.",
        },
      }),
    );

    const collections = orderCollectionsHierarchy(allCols.filter((c) => c.visible !== false));
    const bySlug = collectionMapFromList(collections);
    const trail = buildCollectionTrail(locale, slug, bySlug);
    const subcollections = getChildCollections(slug, collections);
    const media = resolveCollectionImages(collection, bySlug);
    const coverSrc = media.coverImage?.trim() ?? "";

    steps.push({
      step: "coverImage",
      ok: true,
      detail: {
        hasCover: Boolean(coverSrc),
        coverAllowed: coverSrc ? isAllowedNextImageSrc(coverSrc) : null,
        coverSrcPrefix: coverSrc.slice(0, 120),
        subcollectionCount: subcollections.length,
        trailLength: trail.length,
        recordCount: catalog.records.length,
      },
    });

    const islandProps = {
      locale,
      records: catalog.records,
      facets: catalog.facets,
      collections,
      collectionScope: slug,
      layoutVariant: "collections-catalog",
      listingMode: "product",
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
      catalogToolbarDock: theme.toolbarDock,
      pageDir,
      serverPaginated: true,
      total: catalog.total ?? catalog.records.length,
      totalPages: catalog.totalPages ?? 1,
    };

    try {
      const payload = JSON.stringify(islandProps);
      steps.push({
        step: "serializeIslandProps",
        ok: true,
        detail: { bytes: payload.length, collectionCount: collections.length },
      });
    } catch (error) {
      steps.push({
        step: "serializeIslandProps",
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return NextResponse.json({ slug, locale, steps, result: "ok" });
  } catch {
    return NextResponse.json({ slug, locale, steps, result: "error" }, { status: 500 });
  }
}
