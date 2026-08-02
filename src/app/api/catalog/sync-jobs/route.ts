import { after } from "next/server";
import { NextResponse } from "next/server";
import { requireCatalogAdmin } from "@/lib/catalog-api-auth";
import {
  createCatalogSyncJob,
  getCatalogSyncJob,
  getLatestCatalogSyncJob,
  listCatalogSyncJobs,
} from "@/features/catalog/sync/catalog-sync-jobs";
import { catalogSyncOrchestrator } from "@/features/catalog/sync/catalog-sync-orchestrator";
import { loadCatalogSyncStatus } from "@/features/catalog/sync/catalog-sync-logger";

export async function GET(request: Request) {
  const unauthorized = await requireCatalogAdmin();
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (id) {
    const job = await getCatalogSyncJob(id);
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    return NextResponse.json({ job });
  }

  const [jobs, status, latest] = await Promise.all([
    listCatalogSyncJobs(),
    loadCatalogSyncStatus(),
    getLatestCatalogSyncJob(),
  ]);

  return NextResponse.json({ jobs, status, latest });
}

export async function POST(request: Request) {
  const unauthorized = await requireCatalogAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json()) as { type?: string; jobId?: string };
    if (body.jobId) {
      const job = await getCatalogSyncJob(body.jobId);
      if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
      after(async () => {
        await catalogSyncOrchestrator.runDeferredJob(body.jobId!);
      });
      return NextResponse.json({ job, queued: true });
    }

    const type = body.type ?? "full_catalog_sync";
    const job = await createCatalogSyncJob(
      type as "full_locale_reindex" | "full_catalog_sync" | "import_finalize" | "search_reconcile",
    );

    after(async () => {
      await catalogSyncOrchestrator.runDeferredJob(job.id);
    });

    return NextResponse.json({ job, queued: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to queue job" },
      { status: 500 },
    );
  }
}
