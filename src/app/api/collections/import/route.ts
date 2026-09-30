import { NextResponse, after } from "next/server";
import { requireCatalogAdmin } from "@/lib/catalog-api-auth";
import {
  runCollectionImportPipeline,
  type CollectionImportOptions,
} from "@/features/collections/collection-import-pipeline";
import { catalogSyncOrchestrator } from "@/features/catalog/sync/catalog-sync-orchestrator";

export const maxDuration = 300;

async function schedulePostImportIndexRebuild(): Promise<void> {
  try {
    const result = await catalogSyncOrchestrator.onCollectionChanged(true);
    if (result.jobId) {
      after(async () => {
        await catalogSyncOrchestrator.runDeferredJob(result.jobId!);
      });
    }
  } catch (err) {
    console.warn("[collections/import] deferred index rebuild scheduling failed", err);
  }
}

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
    const dryRun = opts.dryRun === true;

    const result = await runCollectionImportPipeline(importData, {
      dryRun,
      duplicatePolicy: opts.duplicatePolicy ?? "overwrite",
      syncLocales: opts.syncLocales !== false,
      replaceAll: opts.replaceAll === true,
      knownSlugs: opts.knownSlugs,
      clearExisting: opts.clearExisting === true,
      finalizeReplaceAll: opts.finalizeReplaceAll === true,
    });

    if (!dryRun && result.aggregate.error === 0) {
      await schedulePostImportIndexRebuild();
    }

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Import failed" },
      { status: 500 },
    );
  }
}
