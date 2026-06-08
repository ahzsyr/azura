import { NextResponse } from "next/server";
import { requireCatalogAdmin } from "@/lib/catalog-api-auth";
import {
  runCollectionImportPipeline,
  type CollectionImportOptions,
} from "@/features/collections/collection-import-pipeline";

/** Bulk collection import (JSON document or array). */
export async function POST(request: Request) {
  const unauthorized = await requireCatalogAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json()) as {
      collections?: unknown;
      options?: Partial<CollectionImportOptions>;
    } & Partial<CollectionImportOptions>;

    const { options, ...importData } = body;
    const opts = options ?? body;

    const result = await runCollectionImportPipeline(importData, {
      dryRun: opts.dryRun === true,
      duplicatePolicy: opts.duplicatePolicy ?? "overwrite",
      syncLocales: opts.syncLocales !== false,
      replaceAll: opts.replaceAll === true,
    });

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Import failed" },
      { status: 500 },
    );
  }
}
