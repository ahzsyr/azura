import type { SavePipelineEntityType } from "./metrics";
import type { ExecutionProfile } from "./execution-registry";
import type {
  AsyncTask,
  ContentEvent,
  ContentEventId,
  ExecutionEffect,
  ExecutionEffectId,
  ExecutionPlan,
  GraphEdge,
  InputPatch,
  MutationSignal,
  MutationSignalId,
  ReasoningTraceEntry,
} from "./execution-plan";
import { freezeExecutionPlan } from "./execution-plan";

const SIGNAL_PREFIXES: Record<
  MutationSignalId,
  Partial<Record<SavePipelineEntityType, readonly string[]>>
> = {
  no_op: {},
  slug_changed: {
    CMS_PAGE: ["slug"],
    POST: ["slug"],
    CONTENT_ITEM: ["slug"],
  },
  status_changed: {
    CMS_PAGE: ["status"],
    POST: ["status"],
    CONTENT_ITEM: ["status"],
  },
  publish_transition: {},
  unpublish_transition: {},
  content_changed: {
    CMS_PAGE: ["blocks", "templateKey", "localeFields", "title", "excerpt"],
    POST: ["blocks", "localeFields", "title", "excerpt", "featuredImageAlt", "featuredImageCaption"],
    CONTENT_ITEM: ["attributes", "blocks", "displaySettings"],
  },
  blocks_changed: {
    CMS_PAGE: ["blocks"],
    POST: ["blocks"],
    CONTENT_ITEM: ["blocks"],
  },
  locale_changed: {
    CMS_PAGE: ["localeFields", "title", "excerpt"],
    POST: ["localeFields", "title", "excerpt", "featuredImageAlt", "featuredImageCaption"],
    CONTENT_ITEM: ["attributes", "slug", "blocks"],
  },
  searchable_changed: {
    CMS_PAGE: ["slug", "blocks", "localeFields", "title", "excerpt", "content"],
    POST: ["slug", "blocks", "localeFields", "title", "excerpt", "featuredImageAlt", "featuredImageCaption", "categoryIds", "tagIds"],
    CONTENT_ITEM: ["slug", "attributes", "blocks", "metadata", "collectionId"],
  },
  public_output_changed: {
    CMS_PAGE: ["slug", "blocks", "visualSettings", "title", "templateKey", "localeFields"],
    POST: [
      "slug",
      "blocks",
      "localeFields",
      "featuredImageId",
      "featuredImageSettings",
      "authorId",
      "categoryIds",
      "tagIds",
      "relatedPostIds",
    ],
    CONTENT_ITEM: [
      "slug",
      "attributes",
      "blocks",
      "displaySettings",
      "collectionId",
      "isFeatured",
      "isVisible",
      "sortOrder",
    ],
  },
  metadata_changed: {
    CMS_PAGE: ["visualSettings", "scheduledAt"],
    POST: ["scheduledAt", "authorId", "featuredImageId", "featuredImageSettings"],
    CONTENT_ITEM: ["displaySettings", "sortOrder", "isFeatured", "isVisible"],
  },
};

const SIGNAL_EVENTS: Partial<Record<MutationSignalId, readonly ContentEventId[]>> = {
  no_op: ["NO_OP"],
  slug_changed: [
    "PUBLIC_ROUTE_CHANGED",
    "SEO_RELEVANT_CHANGE",
    "SEARCH_RELEVANT_CHANGE",
    "TRANSLATION_RELEVANT_CHANGE",
  ],
  status_changed: ["PUBLIC_OUTPUT_CHANGED"],
  publish_transition: ["PUBLICATION_PUBLISHED", "SEO_RELEVANT_CHANGE", "SEARCH_RELEVANT_CHANGE"],
  unpublish_transition: ["PUBLICATION_UNPUBLISHED", "SEO_RELEVANT_CHANGE", "SEARCH_RELEVANT_CHANGE"],
  content_changed: ["CONTENT_MODIFIED", "PUBLIC_OUTPUT_CHANGED"],
  blocks_changed: ["BLOCKS_MODIFIED", "TRANSLATION_RELEVANT_CHANGE"],
  locale_changed: ["TRANSLATION_RELEVANT_CHANGE", "SEARCH_RELEVANT_CHANGE"],
  searchable_changed: ["SEARCH_RELEVANT_CHANGE"],
  public_output_changed: ["PUBLIC_OUTPUT_CHANGED", "SEO_RELEVANT_CHANGE"],
  metadata_changed: ["PUBLIC_OUTPUT_CHANGED"],
};

const EVENT_EFFECTS: Partial<Record<ContentEventId, readonly ExecutionEffectId[]>> = {
  CONTENT_MODIFIED: ["save_revision"],
  BLOCKS_MODIFIED: ["save_revision", "sync_block_translations"],
  PUBLICATION_PUBLISHED: ["revalidate_paths", "enqueue_search_index", "enqueue_seo"],
  PUBLICATION_UNPUBLISHED: ["revalidate_paths", "enqueue_search_index", "enqueue_seo"],
  PUBLIC_ROUTE_CHANGED: ["revalidate_paths", "enqueue_seo"],
  SEO_RELEVANT_CHANGE: ["enqueue_seo"],
  SEARCH_RELEVANT_CHANGE: ["enqueue_search_index"],
  TRANSLATION_RELEVANT_CHANGE: ["sync_translations"],
  PUBLIC_OUTPUT_CHANGED: ["revalidate_paths"],
};

function pathMatchesPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}.`);
}

function addEdge(
  edges: GraphEdge[],
  trace: ReasoningTraceEntry[],
  from: GraphEdge["from"],
  to: GraphEdge["to"],
  reason: string,
) {
  const key = `${from.kind}:${from.id}->${to.kind}:${to.id}`;
  if (!edges.some((edge) => `${edge.from.kind}:${edge.from.id}->${edge.to.kind}:${edge.to.id}` === key)) {
    edges.push({ from, to, reason });
    trace.push({ from: `${from.kind}:${from.id}`, to: `${to.kind}:${to.id}`, reason });
  }
}

function signalReason(signalId: MutationSignalId, paths: readonly string[]): string {
  if (signalId === "publish_transition") return "status moved to PUBLISHED";
  if (signalId === "unpublish_transition") return "status moved away from PUBLISHED";
  if (signalId === "no_op") return "no mutation paths were present";
  return `${signalId} from ${paths.join(", ")}`;
}

export function deriveMutationSignals(input: InputPatch): readonly MutationSignal[] {
  const paths = [...input.paths];
  if (paths.length === 0) {
    return [{ id: "no_op", paths: [], reason: signalReason("no_op", []) }];
  }

  const signals: MutationSignal[] = [];
  for (const signalId of Object.keys(SIGNAL_PREFIXES) as MutationSignalId[]) {
    if (signalId === "no_op" || signalId === "publish_transition" || signalId === "unpublish_transition") {
      continue;
    }
    const prefixes = SIGNAL_PREFIXES[signalId][input.entityType] ?? [];
    const matchedPaths = paths.filter((path) => prefixes.some((prefix) => pathMatchesPrefix(path, prefix)));
    if (matchedPaths.length > 0) {
      signals.push({ id: signalId, paths: matchedPaths, reason: signalReason(signalId, matchedPaths) });
    }
  }

  if (input.baselineStatus !== "PUBLISHED" && input.finalStatus === "PUBLISHED") {
    signals.push({ id: "publish_transition", paths: ["status"], reason: signalReason("publish_transition", []) });
  }
  if (input.baselineStatus === "PUBLISHED" && input.finalStatus !== "PUBLISHED") {
    signals.push({ id: "unpublish_transition", paths: ["status"], reason: signalReason("unpublish_transition", []) });
  }

  return signals;
}

function effectAllowedByProfile(effectId: ExecutionEffectId, profile: ExecutionProfile): boolean {
  if (effectId === "save_revision") return profile.revision !== "flexible";
  if (effectId === "enqueue_search_index") return profile.search !== "flexible";
  if (effectId === "enqueue_seo") return profile.seo !== "flexible";
  if (effectId === "revalidate_paths") return profile.revalidation !== "flexible";
  return true;
}

function taskForEffect(effectId: ExecutionEffectId, entityType: SavePipelineEntityType): AsyncTask | null {
  if (effectId === "enqueue_search_index") {
    return {
      id: "search_index",
      entityType,
      effects: [effectId],
      reason: "search index task derives from enqueue_search_index effect",
    };
  }
  if (effectId === "enqueue_seo") {
    return {
      id: "seo_submission",
      entityType,
      effects: [effectId],
      reason: "SEO submission task derives from enqueue_seo effect",
    };
  }
  return null;
}

export function compileExecutionGraph<TState extends Record<string, unknown>>(params: {
  input: InputPatch;
  finalState: TState;
  profile: ExecutionProfile;
}): ExecutionPlan<TState> {
  const signals = deriveMutationSignals(params.input);
  const edges: GraphEdge[] = [];
  const reasoningTrace: ReasoningTraceEntry[] = [];

  const events = new Map<ContentEventId, ContentEvent>();
  for (const signal of signals) {
    for (const eventId of SIGNAL_EVENTS[signal.id] ?? []) {
      const existing = events.get(eventId);
      events.set(eventId, {
        id: eventId,
        signals: existing ? [...new Set([...existing.signals, signal.id])] : [signal.id],
        reason: `event ${eventId} derives from ${signal.id}`,
      });
      addEdge(
        edges,
        reasoningTrace,
        { kind: "signal", id: signal.id },
        { kind: "event", id: eventId },
        `signal ${signal.id} maps to event ${eventId}`,
      );
    }
  }

  const effects = new Map<ExecutionEffectId, ExecutionEffect>();
  for (const event of events.values()) {
    for (const effectId of EVENT_EFFECTS[event.id] ?? []) {
      if (!effectAllowedByProfile(effectId, params.profile)) continue;
      const existing = effects.get(effectId);
      effects.set(effectId, {
        id: effectId,
        events: existing ? [...new Set([...existing.events, event.id])] : [event.id],
        reason: `effect ${effectId} derives from ${event.id}`,
      });
      addEdge(
        edges,
        reasoningTrace,
        { kind: "event", id: event.id },
        { kind: "effect", id: effectId },
        `event ${event.id} maps to effect ${effectId}`,
      );
    }
  }

  const tasks = new Map<string, AsyncTask>();
  for (const effect of effects.values()) {
    const task = taskForEffect(effect.id, params.input.entityType);
    if (!task) continue;
    tasks.set(task.id, task);
    addEdge(
      edges,
      reasoningTrace,
      { kind: "effect", id: effect.id },
      { kind: "task", id: task.id },
      `effect ${effect.id} maps to async task ${task.id}`,
    );
  }

  const revalidationTargets = effects.has("revalidate_paths")
    ? [`${params.input.entityType}:public`, `${params.input.entityType}:admin`]
    : [];
  for (const target of revalidationTargets) {
    addEdge(
      edges,
      reasoningTrace,
      { kind: "effect", id: "revalidate_paths" },
      { kind: "target", id: target },
      `revalidate_paths effect targets ${target}`,
    );
  }

  const revisionRequired = effects.has("save_revision");
  return freezeExecutionPlan({
    inputs: params.input,
    finalState: params.finalState,
    changeSet: {
      paths: params.input.paths,
      profile: params.profile,
    },
    graph: {
      signals,
      events: [...events.values()],
      edges,
    },
    effects: [...effects.values()],
    asyncTasks: [...tasks.values()],
    revalidationTargets,
    revision: {
      required: revisionRequired,
      reason: revisionRequired ? "save_revision effect is present" : undefined,
    },
    reasoningTrace,
  });
}
