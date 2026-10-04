import "server-only";

import type { SavePipelineEntityType } from "./metrics";
import { searchIndexer } from "@/capabilities/search/search-indexer.service";
import { prisma } from "@/lib/prisma";
import { LogEvents, logger } from "@/lib/logger";

const LEASE_MS = 5 * 60 * 1000;

export type SearchIndexJobStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

async function reclaimExpiredLeases(): Promise<number> {
  const result = await prisma.searchIndexJob.updateMany({
    where: {
      status: "RUNNING",
      lockedUntil: { lt: new Date() },
    },
    data: { status: "PENDING", lockedUntil: null },
  });
  return result.count;
}

async function claimNextJob(): Promise<{
  id: string;
  entityType: string;
  entityId: string;
  attempts: number;
} | null> {
  return prisma.$transaction(async (tx) => {
    const next = await tx.searchIndexJob.findFirst({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
    });
    if (!next) return null;

    const lockedUntil = new Date(Date.now() + LEASE_MS);
    const claimed = await tx.searchIndexJob.updateMany({
      where: { id: next.id, status: "PENDING" },
      data: {
        status: "RUNNING",
        startedAt: new Date(),
        lockedUntil,
        attempts: { increment: 1 },
      },
    });
    if (claimed.count === 0) return null;
    return {
      id: next.id,
      entityType: next.entityType,
      entityId: next.entityId,
      attempts: next.attempts + 1,
    };
  });
}

async function runClaimedJob(job: {
  id: string;
  entityType: string;
  entityId: string;
}): Promise<"COMPLETED" | "FAILED"> {
  try {
    if (job.entityType === "CMS_PAGE") {
      const page = await prisma.cmsPage.findUnique({
        where: { id: job.entityId },
        select: { id: true, slug: true, status: true, blocks: true },
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
    await prisma.searchIndexJob.update({
      where: { id: job.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        lockedUntil: null,
        lastError: null,
      },
    });
    return "COMPLETED";
  } catch (error) {
    await prisma.searchIndexJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        lockedUntil: null,
        lastError: error instanceof Error ? error.message : String(error),
      },
    });
    return "FAILED";
  }
}

export async function enqueueSearchIndexJob(
  entityType: SavePipelineEntityType,
  entityId: string,
) {
  const existing = await prisma.searchIndexJob.findFirst({
    where: {
      entityType,
      entityId,
      status: { in: ["PENDING", "RUNNING"] },
    },
  });
  if (existing) return existing;

  return prisma.searchIndexJob.create({
    data: {
      entityType,
      entityId,
      status: "PENDING",
    },
  });
}

export async function processSearchIndexJobs(limit = 10): Promise<{
  processed: number;
  completed: number;
  failed: number;
  reclaimed: number;
}> {
  const reclaimed = await reclaimExpiredLeases();
  if (reclaimed > 0) {
    logger.info(LogEvents.jobReclaimed, { entity: "SearchIndexJob", count: reclaimed });
  }
  let completed = 0;
  let failed = 0;
  let processed = 0;

  for (let i = 0; i < limit; i++) {
    const job = await claimNextJob();
    if (!job) break;
    processed += 1;
    logger.info(LogEvents.jobStarted, {
      jobId: job.id,
      entity: job.entityType,
      entityId: job.entityId,
    });
    const result = await runClaimedJob(job);
    if (result === "COMPLETED") {
      completed += 1;
      logger.info(LogEvents.jobCompleted, {
        jobId: job.id,
        entity: job.entityType,
        entityId: job.entityId,
      });
    } else {
      failed += 1;
      logger.error(LogEvents.jobFailed, {
        jobId: job.id,
        entity: job.entityType,
        entityId: job.entityId,
      });
    }
  }

  return { processed, completed, failed, reclaimed };
}
