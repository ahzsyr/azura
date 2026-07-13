import "server-only";
import { brokenLinkCrawlerService } from "./broken-link-crawler.service";
import { canonicalConflictService } from "./canonical-conflict.service";
import { crawlDiagnosticsService } from "./crawl-diagnostics.service";
import { redirectChainService } from "./redirect-chain.service";
import { schemaValidationService } from "./schema-validation.service";
import { seoHealthScoreService } from "./seo-health-score.service";
import { richResultsMonitoringService } from "./rich-results-monitoring.service";
import { seoRepository } from "@/repositories/seo.repository";
import type { SeoQualityIssue, SeoQualityReport } from "./types";

async function safeAnalyze(label: string, fn: () => Promise<SeoQualityIssue[]>) {
  try {
    return await fn();
  } catch (error) {
    return [
      {
        id: `quality-${label}-failed`,
        title: `${label} check failed`,
        severity: "warn" as const,
        message: error instanceof Error ? error.message : String(error),
      },
    ];
  }
}

export const seoQualityService = {
  async buildReport(): Promise<SeoQualityReport> {
    const [canonical, redirects, schema, brokenLinks, crawl] = await Promise.all([
      safeAnalyze("Canonical", () => canonicalConflictService.analyze()),
      safeAnalyze("Redirect", () => redirectChainService.analyze()),
      safeAnalyze("Schema", () => schemaValidationService.analyze()),
      safeAnalyze("Broken link", () => brokenLinkCrawlerService.analyze()),
      safeAnalyze("Crawl", () => crawlDiagnosticsService.analyze()),
    ]);

    const issues = [...canonical, ...redirects, ...schema, ...brokenLinks, ...crawl];
    await seoRepository
      .replaceActiveCrawlIssues(
        issues.map((issue) => ({
          issueKey: issue.id.slice(0, 256),
          type: issue.title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""),
          severity:
            issue.severity === "critical" ? "CRITICAL" : issue.severity === "warn" ? "WARNING" : "INFO",
          url: issue.source ?? issue.href ?? "site",
          details: {
            title: issue.title,
            message: issue.message,
            href: issue.href,
          },
          source: issue.source ?? "quality",
        }))
      )
      .catch(() => undefined);
    await richResultsMonitoringService.analyzeAndPersist().catch(() => undefined);
    const health = await seoHealthScoreService.compute(issues).catch(() => undefined);

    return {
      generatedAt: new Date(),
      issues,
      health,
    };
  },
};
