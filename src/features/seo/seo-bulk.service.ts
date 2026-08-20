import "@/features/seo/platform/seo-platform.impl";
import { bulkExecutionEngine } from "@/features/seo/platform/bulk/bulk-execution.engine";
import {
  BULK_SEGMENT_THRESHOLD,
  DEFAULT_BULK_SEGMENT_SIZE,
  planBulkSegments,
} from "@/features/seo/platform/bulk/bulk-segment";
import type { BulkSegmentPlanEntry } from "@/features/seo/platform/bulk/bulk-segment";
import type { ApplyMode } from "@/features/seo/platform/types/change-set";
import type { BulkEntityFilter, BulkTarget } from "@/features/seo/platform/types/autofill";

export type BulkFillScope =
  | "all"
  | "static"
  | "cms"
  | "posts"
  | "products"
  | "collections"
  | "brands";
export type BulkFillMode = "empty-only" | "always";

export type BulkSegmentOptions = Readonly<{
  offset?: number;
  limit?: number;
  segmentIndex?: number;
  segmentSize?: number;
}>;

export { BULK_SEGMENT_THRESHOLD, DEFAULT_BULK_SEGMENT_SIZE };

function scopeToTarget(scope: BulkFillScope): BulkTarget {
  switch (scope) {
    case "static":
      return "static";
    case "cms":
      return "pages";
    case "posts":
      return "posts";
    case "products":
      return "products";
    case "collections":
      return "collections";
    case "brands":
      return "brands";
    case "all":
    default:
      return "all";
  }
}

function modeToApplyMode(mode: BulkFillMode): ApplyMode {
  return mode === "always" ? "overwrite_all" : "fill_empty";
}

function buildFilter(segment?: BulkSegmentOptions): BulkEntityFilter {
  if (!segment?.offset && !segment?.limit) return {};
  return {
    offset: segment.offset ?? 0,
    limit: segment.limit,
  };
}

function buildRunOptions(
  mode: BulkFillMode,
  options?: { profileId?: string; segment?: BulkSegmentOptions }
) {
  return {
    profileId: options?.profileId ?? "balanced",
    applyMode: modeToApplyMode(mode),
    origin: "autofill" as const,
    sampleSize: 5,
    segmentIndex: options?.segment?.segmentIndex,
    segmentSize: options?.segment?.segmentSize ?? options?.segment?.limit ?? DEFAULT_BULK_SEGMENT_SIZE,
  };
}

export const seoBulkService = {
  async bulkFillMetadata(
    scope: BulkFillScope,
    mode: BulkFillMode,
    options?: { profileId?: string; segment?: BulkSegmentOptions }
  ) {
    const result = await bulkExecutionEngine.run({
      capability: "autofill",
      target: scopeToTarget(scope),
      dryRun: false,
      filter: buildFilter(options?.segment),
      options: buildRunOptions(mode, options),
    });

    if (result.dryRun) {
      return {
        dryRun: false as const,
        totalMatched: 0,
        processed: 0,
        changed: 0,
        skipped: 0,
        failed: 0,
        errors: [],
      };
    }

    return result;
  },

  async dryRunBulk(
    scope: BulkFillScope,
    mode: BulkFillMode,
    options?: { profileId?: string; segment?: BulkSegmentOptions }
  ) {
    return bulkExecutionEngine.run({
      capability: "autofill",
      target: scopeToTarget(scope),
      dryRun: true,
      filter: buildFilter(options?.segment),
      options: buildRunOptions(mode, options),
    });
  },

  async countBulk(scope: BulkFillScope) {
    return bulkExecutionEngine.count({
      target: scopeToTarget(scope),
    });
  },

  async planBulkSegments(
    scope: BulkFillScope,
    segmentSize = DEFAULT_BULK_SEGMENT_SIZE
  ): Promise<{ totalItems: number; segments: BulkSegmentPlanEntry[] }> {
    const totalItems = await this.countBulk(scope);
    return {
      totalItems,
      segments: planBulkSegments(totalItems, segmentSize),
    };
  },
};
