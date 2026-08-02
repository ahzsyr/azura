import { describe, it } from "node:test";
import assert from "node:assert/strict";
import Module from "node:module";

const originalLoad = (Module as unknown as { _load: (...args: unknown[]) => unknown })._load;
(Module as unknown as { _load: (...args: unknown[]) => unknown })._load = function load(
  request: string,
  ...args: unknown[]
) {
  if (request === "server-only") return {};
  return originalLoad.call(this, request, ...args);
};

async function loadSeoModules() {
  const [{ seoRepository }, { seoTriggerService }, { seoSubmissionRunner }, { seoHealthScoreService }] = await Promise.all([
    import("@/repositories/seo.repository"),
    import("@/features/seo/triggers/seo-trigger.service"),
    import("@/features/seo/integrations/submission-runner.service"),
    import("@/features/seo/quality/seo-health-score.service"),
  ]);
  return { seoRepository, seoTriggerService, seoSubmissionRunner, seoHealthScoreService };
}

describe("SEO trigger hardening", () => {
  it("queues URL and sitemap jobs for published content", async (t) => {
    const { seoRepository, seoTriggerService } = await loadSeoModules();
    const batches: Array<Parameters<typeof seoRepository.enqueueSubmissionJobs>[0]> = [];
    t.mock.method(seoRepository, "getIntegrationsConfig", async () => ({
      indexnow: { enabled: true, apiKey: "test-key" },
    }));
    t.mock.method(seoRepository, "enqueueSubmissionJobs", async (jobs) => {
      batches.push(jobs);
    });

    await seoTriggerService.handle({
      type: "content.published",
      entityType: "CMS_PAGE",
      entityId: "page-1",
      path: "/en/pages/about",
    });

    const jobs = batches.flat();
    assert.equal(jobs.length, 2);
    assert.deepEqual(
      jobs.map((job) => [job.provider, job.kind, job.reason, job.url]),
      [
        ["indexnow", "URL", "publish", "http://localhost:3000/en/pages/about"],
        ["indexnow", "SITEMAP", "publish", "http://localhost:3000/sitemap.xml"],
      ],
    );
  });

  it("queues old URL, new URL, and sitemap jobs for slug changes", async (t) => {
    const { seoRepository, seoTriggerService } = await loadSeoModules();
    const batches: Array<Parameters<typeof seoRepository.enqueueSubmissionJobs>[0]> = [];
    t.mock.method(seoRepository, "getIntegrationsConfig", async () => ({
      indexnow: { enabled: true, apiKey: "test-key" },
    }));
    t.mock.method(seoRepository, "enqueueSubmissionJobs", async (jobs) => {
      batches.push(jobs);
    });

    await seoTriggerService.handle({
      type: "content.slugChanged",
      entityType: "POST",
      entityId: "post-1",
      oldPath: "/en/blog/old-post",
      newPath: "/en/blog/new-post",
    });

    const jobs = batches.flat();
    assert.deepEqual(
      jobs.map((job) => [job.kind, job.reason, job.url]),
      [
        ["URL", "slug", "http://localhost:3000/en/blog/old-post"],
        ["URL", "slug", "http://localhost:3000/en/blog/new-post"],
        ["SITEMAP", "slug", "http://localhost:3000/sitemap.xml"],
      ],
    );
  });

  it("skips runner processing when another runner holds the lock", async (t) => {
    const { seoRepository, seoSubmissionRunner } = await loadSeoModules();
    t.mock.method(seoRepository, "acquireRunnerLock", async () => false);
    t.mock.method(seoRepository, "listDueSubmissionJobs", async () => {
      throw new Error("listDueSubmissionJobs should not be called when lock is held");
    });

    const result = await seoSubmissionRunner.runDue(5);

    assert.equal(result.skipped, true);
    assert.equal(result.processed, 0);
  });

  it("computes health score from technical and submission signals", async (t) => {
    const { seoRepository, seoHealthScoreService } = await loadSeoModules();
    t.mock.method(seoRepository, "getSubmissionMetrics", async () => ({
      pending: 10,
      running: 0,
      completed: 5,
      failed: 2,
      exhausted: 1,
      failedLast24h: 2,
      stuck: 1,
      providerStats: [],
      recent: [],
    }));
    t.mock.method(seoRepository, "listHealthSnapshots", async () => [
      {
        id: "previous",
        score: 95,
        componentBreakdown: {},
        generatedAt: new Date(),
        createdAt: new Date(),
      },
    ]);
    t.mock.method(seoRepository, "createHealthSnapshot", async () => ({
      id: "snapshot",
      score: 80,
      componentBreakdown: {},
      generatedAt: new Date(),
      createdAt: new Date(),
    }));

    const result = await seoHealthScoreService.compute([
      {
        id: "canonical-1",
        title: "Canonical target may be unreachable",
        severity: "critical",
        message: "Canonical failed",
      },
      {
        id: "schema-1",
        title: "Product schema is incomplete",
        severity: "critical",
        message: "Schema failed",
      },
    ]);

    assert.ok(result.score < 100);
    assert.equal(result.previousScore, 95);
    assert.ok(result.components.some((component) => component.id === "submission-pipeline"));
  });
});
