import type { SeoDeveloperDetails, SeoOverviewVm, SeoAuditSnapshotRecord } from "../types";
import { SEO_PIPELINE_VERSION } from "../types";
import { countIssuesBySeverity } from "./issue-builder";
import { buildUnifiedScore } from "./score-builder";

export function buildOverviewVm(
  record: SeoAuditSnapshotRecord | null,
): SeoOverviewVm {
  if (!record) {
    const developer: SeoDeveloperDetails = {
      analyzerIds: [],
      ruleIds: [],
      pipelineVersion: SEO_PIPELINE_VERSION,
    };
    return {
      snapshot: null,
      score: null,
      issueCounts: { critical: 0, warn: 0, info: 0 },
      developer,
    };
  }

  const score = buildUnifiedScore(record.issues);
  return {
    snapshot: record.snapshot,
    score,
    issueCounts: countIssuesBySeverity(record.issues),
    developer: {
      correlationId: record.snapshot.correlationId,
      analyzerIds: record.snapshot.analyzerIds,
      ruleIds: record.snapshot.ruleIds,
      executionTimeMs: record.snapshot.durationMs,
      snapshotId: record.snapshot.id,
      pipelineVersion: record.snapshot.pipelineVersion,
    },
  };
}
