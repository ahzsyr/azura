import "server-only";

import { seoWorkspaceService } from "@/features/seo/workspace/seo-workspace.service";
import { seoRepository } from "@/repositories/seo.repository";
import { applyTaskStatuses, operationalTasks, taskFromIssue } from "./task-builder";
import { seoTaskStateStore } from "./task-store";
import { listMetadataAttention } from "./metadata-attention";
import { generateSitemap } from "@/features/seo/sitemap.service";
import type { SeoTask, SeoTaskStatus } from "./types";

async function sitemapUrlCount(): Promise<number> {
  try {
    const entries = await generateSitemap();
    return entries.length;
  } catch {
    return 0;
  }
}

export const seoTaskService = {
  async list(): Promise<SeoTask[]> {
    const [issues, snapshot, metrics, metadata, urlCount, state] = await Promise.all([
      seoWorkspaceService.listIssues({ status: "open" }),
      seoWorkspaceService.getLatestSnapshot(),
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
      listMetadataAttention().catch(() => []),
      sitemapUrlCount(),
      seoTaskStateStore.get(),
    ]);

    const fromIssues = issues.map((issue) => taskFromIssue(issue));
    const operational = operationalTasks({
      lastAuditAt: snapshot?.completedAt,
      pendingSubmissions: metrics.pending,
      failedSubmissions: metrics.failed,
      metadataNeedingAttention: metadata.length,
      sitemapUrlCount: urlCount,
    });

    const seen = new Set<string>();
    const merged: SeoTask[] = [];
    for (const task of [...fromIssues, ...operational]) {
      if (seen.has(task.id)) continue;
      seen.add(task.id);
      merged.push(task);
    }

    return applyTaskStatuses(merged, state.statuses);
  },

  async setStatus(taskId: string, status: SeoTaskStatus) {
    return seoTaskStateStore.setStatus(taskId, status);
  },
};
