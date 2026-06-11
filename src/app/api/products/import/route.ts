import { NextResponse } from "next/server";
import { requireCatalogAdmin } from "@/lib/catalog-api-auth";
import {
  runProductImportPipeline,
  finalizeProductImportSync,
  type ProductImportOptions,
  type ImportItem,
} from "@/features/products/lib/product-import-pipeline";

/** Bulk product import (JSON items + options). */
export async function POST(request: Request) {
  const unauthorized = await requireCatalogAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json()) as {
      items?: ImportItem[];
      options?: Partial<ProductImportOptions>;
    } & Partial<ProductImportOptions>;

    const opts = body.options ?? body;
    const result = await runProductImportPipeline(body.items ?? [], {
      dryRun: opts.dryRun === true,
      sourceLocale: opts.sourceLocale ?? "en-us",
      targetLocales: opts.targetLocales ?? ["en-us"],
      duplicatePolicy: opts.duplicatePolicy ?? "skip",
      localizedOverwrite: opts.localizedOverwrite ?? false,
      onlyMissingLocales: opts.onlyMissingLocales ?? true,
      autoGenerateStubs: opts.autoGenerateStubs ?? false,
      slugConflict: opts.slugConflict ?? "suffix",
      skipCollectionSync: opts.skipCollectionSync ?? false,
    });

    if (!opts.dryRun && result.summary.ok > 0) {
      const locales = new Set<string>();
      locales.add(opts.sourceLocale ?? "en-us");
      const targets = opts.targetLocales ?? ["en-us"];
      if (targets === "all") {
        const { configuredLocaleCodes } = await import("@/features/products/lib/i18n/config");
        for (const code of configuredLocaleCodes()) locales.add(code);
      } else {
        for (const t of targets) locales.add(t);
      }
      try {
        await finalizeProductImportSync([...locales]);
      } catch (e) {
        console.warn("[import] catalog sync after import failed", e);
      }
    }

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Import failed" },
      { status: 500 },
    );
  }
}
