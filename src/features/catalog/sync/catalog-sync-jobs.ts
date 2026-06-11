import "server-only";

import type { Prisma } from "@prisma/client";
import type { CatalogLocale } from "@/features/catalog/locales";

export const CATALOG_SYNC_JOBS_NAMESPACE = "catalog-sync-jobs";

export type CatalogSyncJobType =
  | "full_locale_reindex"
  | "full_catalog_sync"
  | "import_finalize"
  | "search_reconcile";

export type CatalogSyncJobStatus = "queued" | "running" | "completed" | "failed";

export type CatalogSyncJob = {
  id: string;
  type: CatalogSyncJobType;
  status: CatalogSyncJobStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  locales?: CatalogLocale[];
  localePrefix?: string;
  progress?: string;
  error?: string;
  result?: Record<string, unknown>;
};

const DEFAULT_ASYNC_THRESHOLD = 500;

export function catalogSyncAsyncThreshold(): number {
  const raw = process.env.CATALOG_SYNC_ASYNC_THRESHOLD;
  if (raw != null && raw !== "") {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return DEFAULT_ASYNC_THRESHOLD;
}

export function shouldDeferCatalogSync(productCount: number): boolean {
  const threshold = catalogSyncAsyncThreshold();
  return threshold > 0 && productCount >= threshold;
}

function jobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

async function readJobs(): Promise<CatalogSyncJob[]> {
  try {
    const { jsonStoreService } = await import("@/features/storage/json-store.service");
    return (await jsonStoreService.get<CatalogSyncJob[]>(CATALOG_SYNC_JOBS_NAMESPACE, "all")) ?? [];
  } catch {
    return [];
  }
}

async function writeJobs(jobs: CatalogSyncJob[]): Promise<void> {
  const { jsonStoreService } = await import("@/features/storage/json-store.service");
  const trimmed = jobs.slice(0, 20);
  await jsonStoreService.set(
    CATALOG_SYNC_JOBS_NAMESPACE,
    "all",
    trimmed as unknown as Prisma.InputJsonValue,
  );
}

export async function createCatalogSyncJob(
  type: CatalogSyncJobType,
  meta?: Pick<CatalogSyncJob, "locales" | "localePrefix">,
): Promise<CatalogSyncJob> {
  const job: CatalogSyncJob = {
    id: jobId(),
    type,
    status: "queued",
    createdAt: new Date().toISOString(),
    ...meta,
  };
  const jobs = await readJobs();
  await writeJobs([job, ...jobs]);
  return job;
}

export async function updateCatalogSyncJob(
  id: string,
  patch: Partial<CatalogSyncJob>,
): Promise<CatalogSyncJob | null> {
  const jobs = await readJobs();
  const idx = jobs.findIndex((j) => j.id === id);
  if (idx < 0) return null;
  jobs[idx] = { ...jobs[idx], ...patch };
  await writeJobs(jobs);
  return jobs[idx];
}

export async function getCatalogSyncJob(id: string): Promise<CatalogSyncJob | null> {
  const jobs = await readJobs();
  return jobs.find((j) => j.id === id) ?? null;
}

export async function listCatalogSyncJobs(): Promise<CatalogSyncJob[]> {
  return readJobs();
}

export async function getLatestCatalogSyncJob(): Promise<CatalogSyncJob | null> {
  const jobs = await readJobs();
  return jobs[0] ?? null;
}
