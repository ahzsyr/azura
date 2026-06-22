import "server-only";

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
  _metrics: SavePipelineMetrics | null | undefined,
  _extra: Record<string, unknown> = {},
): void {
  /* metrics hook reserved for future observability */
}

export function failSavePipelineMetrics(
  _metrics: SavePipelineMetrics | null | undefined,
  _error: unknown,
  _extra: Record<string, unknown> = {},
): void {
  /* metrics hook reserved for future observability */
}
