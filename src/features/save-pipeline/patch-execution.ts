import "server-only";

import { applyPatch, flattenPatchPaths } from "@/lib/patch";
import { getExecutionProfile } from "./execution-registry";
import type { SavePipelineEntityType, SavePipelineOperation } from "./metrics";
import { compileExecutionGraph } from "./execution-graph";
import type { ExecutionPlan } from "./execution-plan";

/**
 * Contract layer for patch execution.
 *
 * Merge semantics:
 * - object fields deep-merge by default
 * - arrays replace atomically in v1
 * - undefined is ignored by applyPatch
 * - null is an explicit clear when accepted by the target schema
 */
export function executePatch<TState extends Record<string, unknown>>(params: {
  entityType: SavePipelineEntityType;
  operation?: SavePipelineOperation;
  baselineState: TState;
  patchInput: Record<string, unknown>;
  forcePaths?: string[];
}): ExecutionPlan<TState> {
  const profile = getExecutionProfile(params.entityType);
  const finalState = applyPatch(params.baselineState, params.patchInput) as TState;
  const paths = [...new Set([...flattenPatchPaths(params.patchInput), ...(params.forcePaths ?? [])])];
  return compileExecutionGraph({
    input: {
      entityType: params.entityType,
      operation: params.operation ?? "save",
      paths,
      forcePaths: params.forcePaths ?? [],
      baselineStatus:
        typeof params.baselineState.status === "string" ? params.baselineState.status : null,
      finalStatus: typeof finalState.status === "string" ? finalState.status : null,
    },
    finalState,
    profile,
  });
}
