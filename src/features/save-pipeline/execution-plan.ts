import type { SavePipelineEntityType, SavePipelineOperation } from "./metrics";
import type { ExecutionProfile } from "./execution-registry";

export type MutationSignalId =
  | "no_op"
  | "slug_changed"
  | "status_changed"
  | "publish_transition"
  | "unpublish_transition"
  | "content_changed"
  | "blocks_changed"
  | "locale_changed"
  | "searchable_changed"
  | "public_output_changed"
  | "metadata_changed";

export type ContentEventId =
  | "NO_OP"
  | "CONTENT_MODIFIED"
  | "BLOCKS_MODIFIED"
  | "PUBLICATION_PUBLISHED"
  | "PUBLICATION_UNPUBLISHED"
  | "PUBLIC_ROUTE_CHANGED"
  | "SEO_RELEVANT_CHANGE"
  | "SEARCH_RELEVANT_CHANGE"
  | "TRANSLATION_RELEVANT_CHANGE"
  | "PUBLIC_OUTPUT_CHANGED";

export type ExecutionEffectId =
  | "save_revision"
  | "sync_translations"
  | "sync_block_translations"
  | "revalidate_paths"
  | "enqueue_search_index"
  | "enqueue_seo";

export type AsyncTaskId = "search_index" | "seo_submission";

export type GraphNodeKind = "signal" | "event" | "effect" | "task" | "target";

export type GraphNodeRef = Readonly<{
  kind: GraphNodeKind;
  id: string;
}>;

export type GraphEdge = Readonly<{
  from: GraphNodeRef;
  to: GraphNodeRef;
  reason: string;
}>;

export type ReasoningTraceEntry = Readonly<{
  from: string;
  to: string;
  reason: string;
}>;

export type InputPatch = Readonly<{
  entityType: SavePipelineEntityType;
  operation: SavePipelineOperation;
  paths: readonly string[];
  forcePaths: readonly string[];
  baselineStatus?: string | null;
  finalStatus?: string | null;
}>;

export type MutationSignal = Readonly<{
  id: MutationSignalId;
  paths: readonly string[];
  reason: string;
}>;

export type ContentEvent = Readonly<{
  id: ContentEventId;
  signals: readonly MutationSignalId[];
  reason: string;
}>;

export type ExecutionEffect = Readonly<{
  id: ExecutionEffectId;
  events: readonly ContentEventId[];
  reason: string;
}>;

export type AsyncTask = Readonly<{
  id: AsyncTaskId;
  entityType: SavePipelineEntityType;
  effects: readonly ExecutionEffectId[];
  reason: string;
}>;

export type ExecutionPlan<TState extends Record<string, unknown> = Record<string, unknown>> = Readonly<{
  inputs: InputPatch;
  finalState: TState;
  changeSet: Readonly<{
    paths: readonly string[];
    profile: ExecutionProfile;
  }>;
  graph: Readonly<{
    signals: readonly MutationSignal[];
    events: readonly ContentEvent[];
    edges: readonly GraphEdge[];
  }>;
  effects: readonly ExecutionEffect[];
  asyncTasks: readonly AsyncTask[];
  revalidationTargets: readonly string[];
  revision: Readonly<{ required: boolean; reason?: string }>;
  reasoningTrace: readonly ReasoningTraceEntry[];
}>;

export function hasExecutionEffect(
  plan: Pick<ExecutionPlan, "effects">,
  effectId: ExecutionEffectId,
): boolean {
  return plan.effects.some((effect) => effect.id === effectId);
}

export function hasAsyncTask(plan: Pick<ExecutionPlan, "asyncTasks">, taskId: AsyncTaskId): boolean {
  return plan.asyncTasks.some((task) => task.id === taskId);
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
  }
  return value;
}

export function freezeExecutionPlan<TState extends Record<string, unknown>>(
  plan: ExecutionPlan<TState>,
): ExecutionPlan<TState> {
  return deepFreeze(plan);
}
