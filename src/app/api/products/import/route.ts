import { NextResponse } from "next/server";
import { requireCatalogAdmin } from "@/lib/catalog-api-auth";
import {
  runProductImportPipeline,
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
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Import failed" },
      { status: 500 },
    );
  }
}
