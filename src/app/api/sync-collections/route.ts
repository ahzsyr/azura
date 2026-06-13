import { NextResponse } from "next/server";
import {
  loadPersistedSyncReport,
  persistedReportToSyncReport,
  savePersistedSyncReport,
  syncCollections,
  validateSync,
} from "@/features/collections/collection-sync.service";
import { requireCatalogAdmin } from "@/lib/catalog-api-auth";
import { isCatalogLocale } from "@/features/catalog/locales";
import { rebuildAllCatalogProductIndexes } from "@/features/products/index/product-index-patcher";

export async function GET(request: Request) {
  const unauthorized = await requireCatalogAdmin();
  if (unauthorized) return unauthorized;

  try {
    const url = new URL(request.url);

    if (url.searchParams.get("loadReport") === "1") {
      const persisted = await loadPersistedSyncReport();
      return NextResponse.json({
        report: persisted ? persistedReportToSyncReport(persisted) : null,
      });
    }

    const locale = String(url.searchParams.get("locale") || "en-us").toLowerCase();
    const report = await validateSync(isCatalogLocale(locale) ? locale : "en-us");
    return NextResponse.json({ report });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Validation failed" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const unauthorized = await requireCatalogAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      locale?: string;
      autoCreate?: boolean;
    };
    const locale = String(body.locale || "en-us").toLowerCase();
    const report = await syncCollections({
      locale: isCatalogLocale(locale) ? locale : "en-us",
      autoCreate: body.autoCreate === true,
    });

    let indexesRebuilt = false;
    let indexRebuildError: string | null = null;
    const indexRebuildCounts: Record<string, number> = {};
    const indexRebuildDetails: Record<
      string,
      { count: number; previousCount: number; orphansRemoved: number }
    > = {};

    try {
      const rebuild = await rebuildAllCatalogProductIndexes();
      indexesRebuilt = true;
      for (const item of rebuild.locales) {
        indexRebuildCounts[item.locale] = item.count;
        indexRebuildDetails[item.locale] = {
          count: item.count,
          previousCount: item.previousCount,
          orphansRemoved: item.orphansRemoved,
        };
      }
    } catch (err) {
      indexRebuildError = err instanceof Error ? err.message : String(err);
      console.warn("[collections] product index rebuild after sync failed", err);
    }

    const enrichedReport = {
      ...report,
      indexesRebuilt,
      indexRebuildError,
      indexRebuildCounts,
      indexRebuildDetails,
    };

    try {
      await savePersistedSyncReport(enrichedReport);
    } catch (err) {
      console.warn("[collections] sync report persistence failed", err);
    }

    return NextResponse.json({ report: enrichedReport });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Sync failed" },
      { status: 500 },
    );
  }
}
