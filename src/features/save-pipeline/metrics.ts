import "server-only";

import { agentLog, agentLogError } from "@/lib/debug/agent-log";

export type SavePipelineEntityType = "CMS_PAGE" | "POST" | "CONTENT_ITEM";
export type SavePipelineOperation = "save" | "publish" | "unpublish" | "schedule" | "delete";

export type SavePipelineCounters = {
  dbWrites: number;
  revisions: number;
  searchRuns: number;
  translationSyncRuns: number;
  revalidationRuns: number;
  seoRuns: number;
};

export type SavePipelineMetrics = {
  entityType: SavePipelineEntityType;
  operation: SavePipelineOperation;
  entityId?: string | null;
  startedAt: number;
  counters: SavePipelineCounters;
};

export function startSavePipelineMetrics(params: {
  entityType: SavePipelineEntityType;
  operation: SavePipelineOperation;
  entityId?: string | null;
}): SavePipelineMetrics {
  return {
    ...params,
    startedAt: Date.now(),
    counters: {
      dbWrites: 0,
      revisions: 0,
      searchRuns: 0,
      translationSyncRuns: 0,
      revalidationRuns: 0,
      seoRuns: 0,
    },
  };
}

export function incrementSavePipelineMetric(
  metrics: SavePipelineMetrics | null | undefined,
  counter: keyof SavePipelineCounters,
  amount = 1,
): void {
  if (!metrics) return;
  metrics.counters[counter] += amount;
}

export async function withSavePipelineStep<T>(
  metrics: SavePipelineMetrics | null | undefined,
  counter: keyof SavePipelineCounters | null,
  fn: () => Promise<T> | T,
): Promise<T> {
  if (counter) incrementSavePipelineMetric(metrics, counter);
  return fn();
}

export function finishSavePipelineMetrics(
  metrics: SavePipelineMetrics | null | undefined,
  extra: Record<string, unknown> = {},
): void {
  if (!metrics) return;
  const durationMs = Date.now() - metrics.startedAt;
  agentLog({
    location: "save-pipeline/metrics",
    message: "save_pipeline_complete",
    hypothesisId: "PATCH_SAVE",
    data: {
      entityType: metrics.entityType,
      operation: metrics.operation,
      entityId: metrics.entityId,
      durationMs,
      ...metrics.counters,
      ...extra,
    },
  });
}

export function failSavePipelineMetrics(
  metrics: SavePipelineMetrics | null | undefined,
  error: unknown,
  extra: Record<string, unknown> = {},
): void {
  if (!metrics) return;
  agentLogError("save-pipeline/metrics", error, "PATCH_SAVE", {
    entityType: metrics.entityType,
    operation: metrics.operation,
    entityId: metrics.entityId,
    durationMs: Date.now() - metrics.startedAt,
    ...metrics.counters,
    ...extra,
  });
}
