import "server-only";

import { seoWorkspaceService } from "@/features/seo/workspace/seo-workspace.service";
import { seoIntegrationRegistry } from "@/features/seo/integrations/registry";
import { seoRepository } from "@/repositories/seo.repository";
import { generateSitemap } from "@/features/seo/sitemap.service";
import { classifySitemapUrl } from "@/features/seo/sitemap-index.service";
import { seoTaskService } from "./task.service";
import { seoSetupStore } from "./setup-store";
import { countTasksBySeverity } from "./task-builder";
import { listMetadataAttention } from "./metadata-attention";
import type { SeoTask } from "./types";
import type { SeoSetupState } from "./types";

export type SeoDashboardVm = {
  health: {
    score: number | null;
    grade: "good" | "fair" | "poor" | null;
    critical: number;
    warnings: number;
    passed: number;
    lastAuditAt: string | null;
  };
  today: {
    critical: number;
    important: number;
    recommended: number;
  };
  recentProblems: SeoTask[];
  searchEngines: Array<{
    id: string;
    label: string;
    connected: boolean;
  }>;
  pendingUrls: number;
  submittedToday: number;
  failedSubmissions: number;
  sitemap: {
    urlCount: number;
    fileCount: number;
    healthy: boolean;
    buckets: Array<{ label: string; count: number }>;
  };
  contentAttention: number;
  technicalCritical: number;
  schemaWarnings: number;
  setup: SeoSetupState;
};

function engineLabel(provider: string): string {
  if (provider === "google" || provider === "google_indexing") return "Google";
  if (provider === "bing") return "Bing";
  if (provider === "indexnow") return "IndexNow";
  return provider;
}

export async function getSeoDashboardVm(): Promise<SeoDashboardVm> {
  const [overview, technical, tasks, health, metrics, setup, metadata] = await Promise.all([
    seoWorkspaceService.getOverview(),
    seoWorkspaceService.getTechnicalAudit(),
    seoTaskService.list(),
    seoIntegrationRegistry.health({ liveGoogle: false }).catch(() => []),
    seoRepository.getSubmissionMetrics().catch(() => ({
      pending: 0,
      failed: 0,
      completed: 0,
      running: 0,
      exhausted: 0,
      failedLast24h: 0,
      stuck: 0,
      providerStats: [],
      recent: [],
    })),
    seoSetupStore.get(),
    listMetadataAttention().catch(() => []),
  ]);

  let urlCount = 0;
  const buckets: Array<{ label: string; count: number }> = [];
  try {
    const generated = await generateSitemap();
    urlCount = generated.length;
    const labels: Record<string, string> = {
      product: "Products",
      page: "Pages",
      post: "Blog",
      category: "Categories",
      brand: "Brands",
    };
    const counts: Record<string, number> = { product: 0, page: 0, post: 0, category: 0, brand: 0 };
    for (const entry of generated) {
      counts[classifySitemapUrl(entry.url)] += 1;
    }
    for (const [type, count] of Object.entries(counts)) {
      buckets.push({ label: labels[type] ?? type, count });
    }
  } catch {
    urlCount = 0;
  }

  const fileCount = Math.max(1, buckets.filter((bucket) => bucket.count > 0).length);
  const openTasks = tasks.filter((task) => task.status === "open");
  const today = countTasksBySeverity(openTasks);

  const engines = ["google", "bing", "indexnow"].map((id) => {
    const row = health.find((item) => item.provider === id || (id === "google" && item.provider === "google_indexing"));
    return {
      id,
      label: engineLabel(id),
      connected: Boolean(row?.enabled && row.ok),
    };
  });

  return {
    health: {
      score: overview.score?.overall ?? null,
      grade: overview.score?.grade ?? null,
      critical: overview.issueCounts.critical,
      warnings: overview.issueCounts.warn,
      passed: technical.cards.filter((card) => card.status === "healthy").length,
      lastAuditAt: overview.snapshot?.completedAt ?? null,
    },
    today,
    recentProblems: openTasks.slice(0, 6),
    searchEngines: engines,
    pendingUrls: metrics.pending,
    submittedToday: metrics.completed,
    failedSubmissions: metrics.failed,
    sitemap: {
      urlCount,
      fileCount,
      healthy: urlCount > 0,
      buckets,
    },
    contentAttention: metadata.length + openTasks.filter((task) => task.category === "content").length,
    technicalCritical: openTasks.filter((task) => task.severity === "critical" && task.category === "technical").length,
    schemaWarnings: openTasks.filter((task) => task.category === "schema").length,
    setup,
  };
}
