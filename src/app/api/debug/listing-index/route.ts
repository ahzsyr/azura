import { NextResponse } from "next/server";
import type { Locale } from "@/i18n/routing";
import { seoService } from "@/features/seo/seo.service";
import { cmsService } from "@/features/cms/cms.service";
import { loadCatalogListingTheme } from "@/features/catalog/lib/load-catalog-theme";
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

    await runStep("loadCatalogListingTheme", () =>
      loadCatalogListingTheme(locale, pageKey as "products" | "collections"),
    );

    const catalog = (await runStep(
      mode === "collection" ? "buildCollectionListingCatalog" : "buildProductListingCatalog",
      () =>
        mode === "collection"
          ? buildCollectionListingCatalog(locale, filterState)
          : buildProductListingCatalog(locale, filterState),
    )) as Awaited<ReturnType<typeof buildProductListingCatalog>>;

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
