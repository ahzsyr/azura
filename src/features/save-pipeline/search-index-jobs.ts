import "server-only";

import type { Prisma } from "@prisma/client";
import type { SavePipelineEntityType } from "./metrics";
import { searchIndexer } from "@/features/search/search-indexer.service";
import { prisma } from "@/lib/prisma";

const SEARCH_INDEX_JOBS_NAMESPACE = "search-index-jobs";

export type SearchIndexJobStatus = "queued" | "running" | "completed" | "failed";

export type SearchIndexJob = {
  id: string;
  entityType: SavePipelineEntityType;
  entityId: string;
  status: SearchIndexJobStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  attemptCount: number;
  lastError?: string;
};

function jobId(entityType: SavePipelineEntityType, entityId: string): string {
  return `${entityType}_${entityId}_${Date.now()}`;
}

async function readJobs(): Promise<SearchIndexJob[]> {
  try {
    const { jsonStoreService } = await import("@/features/storage/json-store.service");
    return (await jsonStoreService.get<SearchIndexJob[]>(SEARCH_INDEX_JOBS_NAMESPACE, "all")) ?? [];
  } catch {
    return [];
  }
}

async function writeJobs(jobs: SearchIndexJob[]): Promise<void> {
  const { jsonStoreService } = await import("@/features/storage/json-store.service");
  await jsonStoreService.set(
    SEARCH_INDEX_JOBS_NAMESPACE,
    "all",
    jobs.slice(0, 100) as unknown as Prisma.InputJsonValue,
  );
}

export async function enqueueSearchIndexJob(
  entityType: SavePipelineEntityType,
  entityId: string,
): Promise<SearchIndexJob> {
  const jobs = await readJobs();
  const existing = jobs.find(
    (job) =>
      job.entityType === entityType &&
      job.entityId === entityId &&
      (job.status === "queued" || job.status === "running"),
  );
  if (existing) return existing;

  const job: SearchIndexJob = {
    id: jobId(entityType, entityId),
    entityType,
    entityId,
    status: "queued",
    attemptCount: 0,
    createdAt: new Date().toISOString(),
  };
  await writeJobs([job, ...jobs]);
  return job;
}

async function runJob(job: SearchIndexJob): Promise<SearchIndexJob> {
  const startedAt = new Date().toISOString();
  try {
    if (job.entityType === "CMS_PAGE") {
      const page = await prisma.cmsPage.findUnique({
        where: { id: job.entityId },
        select: { id: true, slug: true, status: true },
      });
      if (page) await searchIndexer.indexCmsPage(page);
    } else if (job.entityType === "POST") {
      const post = await prisma.post.findUnique({
        where: { id: job.entityId },
        select: { id: true, slug: true, status: true },
      });
      if (post) await searchIndexer.indexPost(post);
    } else {
      const item = await prisma.contentItem.findUnique({
        where: { id: job.entityId },
        include: {
          contentType: {
            select: {
              slug: true,
              routePrefix: true,
              fieldSchema: true,
              adminConfig: true,
              isEnabled: true,
            },
          },
          collection: { select: { id: true, slug: true } },
        },
      });
      if (item) await searchIndexer.indexContentItem(item);
    }
    return {
      ...job,
      status: "completed",
      startedAt,
      completedAt: new Date().toISOString(),
      attemptCount: job.attemptCount + 1,
      lastError: undefined,
    };
  } catch (error) {
    return {
      ...job,
      status: "failed",
      startedAt,
      attemptCount: job.attemptCount + 1,
      lastError: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function processSearchIndexJobs(limit = 10): Promise<{
  processed: number;
  completed: number;
  failed: number;
}> {
  const jobs = await readJobs();
  const queued = jobs.filter((job) => job.status === "queued").slice(0, limit);
  if (queued.length === 0) return { processed: 0, completed: 0, failed: 0 };

  const updated = new Map<string, SearchIndexJob>();
  for (const job of queued) {
    updated.set(job.id, await runJob({ ...job, status: "running" }));
  }

  const next = jobs.map((job) => updated.get(job.id) ?? job);
  await writeJobs(next);
  const results = [...updated.values()];
  return {
    processed: results.length,
    completed: results.filter((job) => job.status === "completed").length,
    failed: results.filter((job) => job.status === "failed").length,
  };
}
