/**
 * Phase 5 job lease contracts — reclaim expired RUNNING; claim race; complete.
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import Module from "node:module";

type Job = {
  id: string;
  entityType: string;
  entityId: string;
  status: string;
  attempts: number;
  lockedUntil: Date | null;
  createdAt: Date;
  startedAt?: Date | null;
  completedAt?: Date | null;
  lastError?: string | null;
};

let jobs: Job[] = [];
let indexed: string[] = [];

function makePrisma() {
  return {
    searchIndexJob: {
      updateMany: async ({
        where,
        data,
      }: {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
      }) => {
        let count = 0;
        for (const job of jobs) {
          if (where.status && job.status !== where.status) continue;
          if (where.id && job.id !== where.id) continue;
          if (where.lockedUntil && typeof where.lockedUntil === "object") {
            const lt = (where.lockedUntil as { lt: Date }).lt;
            if (!job.lockedUntil || !(job.lockedUntil < lt)) continue;
          }
          Object.assign(job, data);
          if (data.attempts && typeof data.attempts === "object") {
            job.attempts += 1;
          }
          count += 1;
        }
        return { count };
      },
      findFirst: async ({
        where,
        orderBy,
      }: {
        where: Record<string, unknown>;
        orderBy?: { createdAt: string };
      }) => {
        let candidates = jobs.filter((j) => {
          if (where.entityType && j.entityType !== where.entityType) return false;
          if (where.entityId && j.entityId !== where.entityId) return false;
          if (typeof where.status === "string") {
            if (j.status !== where.status) return false;
          } else if (
            where.status &&
            typeof where.status === "object" &&
            Array.isArray((where.status as { in: string[] }).in)
          ) {
            if (!(where.status as { in: string[] }).in.includes(j.status)) return false;
          }
          return true;
        });
        if (orderBy?.createdAt === "asc") {
          candidates = [...candidates].sort(
            (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
          );
        }
        return candidates[0] ?? null;
      },
      create: async ({ data }: { data: Partial<Job> }) => {
        const job: Job = {
          id: `job-${jobs.length + 1}`,
          entityType: String(data.entityType),
          entityId: String(data.entityId),
          status: String(data.status ?? "PENDING"),
          attempts: 0,
          lockedUntil: null,
          createdAt: new Date(),
        };
        jobs.push(job);
        return job;
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => {
        const job = jobs.find((j) => j.id === where.id);
        if (!job) throw new Error("missing");
        Object.assign(job, data);
        return job;
      },
    },
    cmsPage: {
      findUnique: async ({ where }: { where: { id: string } }) => ({
        id: where.id,
        slug: "page",
        status: "PUBLISHED",
        blocks: [],
      }),
    },
    post: { findUnique: async () => null },
    contentItem: { findUnique: async () => null },
    $transaction: async <T>(fn: (tx: ReturnType<typeof makePrisma>) => Promise<T>) =>
      fn(makePrisma()),
  };
}

const originalLoad = (Module as unknown as { _load: (...args: unknown[]) => unknown })._load;
(Module as unknown as { _load: (...args: unknown[]) => unknown })._load = function load(
  request: string,
  ...args: unknown[]
) {
  if (request === "server-only") return {};
  if (request.endsWith("/prisma") || request === "@/lib/prisma") {
    return { prisma: makePrisma() };
  }
  if (
    request.endsWith("/search-indexer.service") ||
    request === "@/capabilities/search/search-indexer.service"
  ) {
    return {
      searchIndexer: {
        indexCmsPage: async (page: { id: string }) => {
          indexed.push(page.id);
        },
        indexPost: async () => {},
        indexContentItem: async () => {},
      },
    };
  }
  return originalLoad.call(this, request, ...args);
};

describe("SearchIndexJob lease contracts", () => {
  beforeEach(() => {
    jobs = [];
    indexed = [];
  });

  it("reclaims expired RUNNING then completes PENDING job", async () => {
    jobs = [
      {
        id: "stranded",
        entityType: "CMS_PAGE",
        entityId: "page-1",
        status: "RUNNING",
        attempts: 1,
        lockedUntil: new Date(Date.now() - 60_000),
        createdAt: new Date(Date.now() - 120_000),
      },
    ];

    const { processSearchIndexJobs } = await import(
      "@/features/save-pipeline/search-index-jobs"
    );
    const result = await processSearchIndexJobs(5);
    assert.equal(result.reclaimed, 1);
    assert.equal(result.processed, 1);
    assert.equal(result.completed, 1);
    assert.equal(jobs[0].status, "COMPLETED");
    assert.deepEqual(indexed, ["page-1"]);
  });

  it("enqueue dedupes when PENDING already exists", async () => {
    jobs = [
      {
        id: "existing",
        entityType: "CMS_PAGE",
        entityId: "page-2",
        status: "PENDING",
        attempts: 0,
        lockedUntil: null,
        createdAt: new Date(),
      },
    ];
    const { enqueueSearchIndexJob } = await import(
      "@/features/save-pipeline/search-index-jobs"
    );
    const row = await enqueueSearchIndexJob("CMS_PAGE", "page-2");
    assert.equal(row.id, "existing");
    assert.equal(jobs.length, 1);
  });

  it("double process does not double-complete after first success", async () => {
    jobs = [
      {
        id: "j1",
        entityType: "CMS_PAGE",
        entityId: "page-3",
        status: "PENDING",
        attempts: 0,
        lockedUntil: null,
        createdAt: new Date(),
      },
    ];
    const { processSearchIndexJobs } = await import(
      "@/features/save-pipeline/search-index-jobs"
    );
    const first = await processSearchIndexJobs(5);
    const second = await processSearchIndexJobs(5);
    assert.equal(first.processed, 1);
    assert.equal(second.processed, 0);
    assert.equal(indexed.length, 1);
  });
});
