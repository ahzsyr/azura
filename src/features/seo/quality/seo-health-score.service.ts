import "server-only";
import { seoRepository } from "@/repositories/seo.repository";
import { seoObservabilityFlags } from "@/features/seo/observability-flags";
import type { SeoQualityIssue } from "./types";

export type SeoHealthComponent = {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  penalty: number;
  message: string;
};

export type SeoHealthScore = {
  score: number;
  generatedAt: Date;
  components: SeoHealthComponent[];
  previousScore?: number;
  delta?: number;
};

function componentStatus(penalty: number): SeoHealthComponent["status"] {
  if (penalty >= 10) return "fail";
  if (penalty > 0) return "warn";
  return "pass";
}

function component(id: string, label: string, penalty: number, message: string): SeoHealthComponent {
  return {
    id,
    label,
    penalty,
    status: componentStatus(penalty),
    message,
  };
}

export const seoHealthScoreService = {
  async compute(issues: SeoQualityIssue[]): Promise<SeoHealthScore> {
    if (!seoObservabilityFlags.seoHealthScore) {
      return { score: 100, generatedAt: new Date(), components: [] };
    }
    const metrics = await seoRepository.getSubmissionMetrics().catch(() => ({
      failed: 0,
      exhausted: 0,
      pending: 0,
      running: 0,
      failedLast24h: 0,
      stuck: 0,
      completed: 0,
      providerStats: [],
      recent: [],
    }));

    const canonicalIssues = issues.filter((issue) => /canonical/i.test(issue.title)).length;
    const redirectLoops = issues.filter((issue) => /loop/i.test(issue.title)).length;
    const schemaFailures = issues.filter((issue) => /schema|json-ld|structured/i.test(issue.title)).length;
    const brokenLinks = issues.filter((issue) => /broken|unreachable|404|500/i.test(issue.title)).length;
    const criticalIssues = issues.filter((issue) => issue.severity === "critical").length;

    const components = [
      component(
        "technical",
        "Technical checks",
        canonicalIssues * 2 + redirectLoops * 3 + brokenLinks * 2 + criticalIssues * 2,
        `${issues.length} technical issue${issues.length === 1 ? "" : "s"} detected`
      ),
      component(
        "structured-data",
        "Structured data",
        schemaFailures * 5,
        `${schemaFailures} structured data issue${schemaFailures === 1 ? "" : "s"} detected`
      ),
      component(
        "submission-pipeline",
        "Submission pipeline",
        metrics.failed + metrics.exhausted * 10 + Math.floor(metrics.pending / 10) + metrics.stuck * 3,
        `${metrics.failed} failed, ${metrics.exhausted} exhausted, ${metrics.pending} pending`
      ),
      component(
        "crawl",
        "Crawl signals",
        brokenLinks * 2,
        `${brokenLinks} crawl/discoverability issue${brokenLinks === 1 ? "" : "s"} detected`
      ),
    ];

    const score = Math.max(
      0,
      Math.min(
        100,
        100 - components.reduce((sum, item) => sum + item.penalty, 0)
      )
    );
    const previous = (await seoRepository.listHealthSnapshots(1).catch(() => []))[0];

    await seoRepository
      .createHealthSnapshot({
        score,
        componentBreakdown: {
          components,
          issueCount: issues.length,
          metrics: {
            pending: metrics.pending,
            running: metrics.running,
            completed: metrics.completed,
            failed: metrics.failed,
            exhausted: metrics.exhausted,
            failedLast24h: metrics.failedLast24h,
            stuck: metrics.stuck,
            providerStats: metrics.providerStats,
          },
        },
      })
      .catch(() => undefined);

    return {
      score,
      generatedAt: new Date(),
      components,
      previousScore: previous?.score,
      delta: previous ? score - previous.score : undefined,
    };
  },
};
