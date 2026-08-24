import "server-only";

import { pluginSdk } from "../plugin-sdk";
import { createExecutionContext } from "../execution-context";
import { autofillService } from "../services/autofill.service";
import { buildSegmentMeta, descriptorStreamAction } from "./bulk-segment";
import type {
  BulkDryRunResult,
  BulkEntityFilter,
  BulkExecutionInput,
  BulkExecutionResult,
  BulkSegmentMeta,
  BulkTarget,
} from "../types/autofill";
import type { SeoEntityDescriptor } from "../types/entity-descriptor";

type BulkHandler = (
  descriptor: SeoEntityDescriptor,
  input: BulkExecutionInput
) => Promise<{ changed: boolean; changeSet?: import("../types/change-set").SeoChangeSet; error?: string }>;

const handlers = new Map<string, BulkHandler>();

export function registerBulkHandler(capability: string, handler: BulkHandler): void {
  handlers.set(capability, handler);
}

function providersForTarget(target: BulkTarget) {
  const all = pluginSdk.getEntityProviders();
  switch (target) {
    case "products":
      return all.filter((p) => p.kind === "product");
    case "brands":
      return all.filter((p) => p.kind === "brand");
    case "collections":
      return all.filter((p) => p.kind === "collection");
    case "categories":
      return all.filter((p) => p.kind === "category");
    case "pages":
      return all.filter((p) => p.kind === "cms_page" || p.kind === "static_page");
    case "posts":
      return all.filter((p) => p.kind === "post");
    case "packages":
      return all.filter((p) => p.kind === "package");
    case "static":
      return all.filter((p) => p.kind === "static_page");
    case "all":
      return all;
    default:
      return all;
  }
}

function filterWithoutPagination(filter: BulkEntityFilter = {}): BulkEntityFilter {
  const { offset: _offset, limit: _limit, ...rest } = filter;
  return rest;
}

async function* iterateDescriptorStream(
  target: BulkTarget,
  filter: BulkEntityFilter = {}
): AsyncGenerator<SeoEntityDescriptor> {
  const baseFilter = filterWithoutPagination(filter);
  const providers = providersForTarget(target);
  for (const provider of providers) {
    if (!provider.listEntities) continue;
    for await (const descriptor of provider.listEntities(baseFilter)) {
      yield descriptor;
    }
  }
}

export async function countBulkEntities(input: Pick<BulkExecutionInput, "target" | "filter">): Promise<number> {
  const providers = providersForTarget(input.target);
  const baseFilter = filterWithoutPagination(input.filter ?? {});
  let total = 0;
  for (const provider of providers) {
    if (provider.countEntities) {
      total += await provider.countEntities(baseFilter);
    }
  }
  return total;
}

async function runAutofillHandler(
  descriptor: SeoEntityDescriptor,
  input: BulkExecutionInput
): Promise<{ changed: boolean; changeSet?: import("../types/change-set").SeoChangeSet; error?: string }> {
  const entityType = descriptor.kind;
  const ctx = createExecutionContext({
    entityType,
    entityId: descriptor.id,
    locale: descriptor.locale,
    source: "bulk",
    trigger: "bulk_fill",
    mode: input.dryRun ? "preview" : "commit",
    metadata: descriptor.metadata as Record<string, unknown> | undefined,
  });

  try {
    const result = await autofillService.suggest(ctx, {
      profileId: input.options?.profileId,
      applyMode: input.options?.applyMode ?? (input.dryRun ? "preview" : "fill_empty"),
      origin: input.options?.origin ?? "autofill",
    });

    if (input.dryRun) {
      return { changed: result.changeSet.fields.length > 0, changeSet: result.changeSet };
    }

    if (!result.changeSet.fields.length) {
      return { changed: false, changeSet: result.changeSet };
    }

    const commitCtx = { ...ctx, mode: "commit" as const };
    const committed = await autofillService.commit(commitCtx, result.changeSet);
    return { changed: true, changeSet: committed.changeSet };
  } catch (error) {
    return {
      changed: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

registerBulkHandler("autofill", runAutofillHandler);

function resolveSegmentMeta(
  input: BulkExecutionInput,
  totalItems: number,
  offset: number,
  limit: number | undefined,
  processed: number
): BulkSegmentMeta | undefined {
  if (offset === 0 && limit == null) return undefined;
  const segmentSize = input.options?.segmentSize ?? limit ?? processed;
  const segmentIndex =
    input.options?.segmentIndex ?? (limit != null ? Math.floor(offset / limit) : 0);
  return buildSegmentMeta(totalItems, segmentSize, segmentIndex, offset, limit ?? processed);
}

export async function runBulkExecution(
  input: BulkExecutionInput
): Promise<BulkExecutionResult | BulkDryRunResult> {
  const filter = input.filter ?? {};
  const offset = filter.offset ?? 0;
  const limit = filter.limit;
  const baseFilter = filterWithoutPagination(filter);
  const totalItems = await countBulkEntities({ target: input.target, filter: baseFilter });

  const handler = handlers.get(input.capability);
  if (!handler) {
    throw new Error(`No bulk handler registered for capability: ${input.capability}`);
  }

  const sampleSize = input.options?.sampleSize ?? (input.dryRun ? 5 : undefined);
  const errors: Array<{ descriptor: SeoEntityDescriptor; message: string }> = [];
  let streamIndex = 0;
  let processed = 0;
  let changed = 0;
  let skipped = 0;
  let failed = 0;
  const sampleChangeSets: import("../types/change-set").SeoChangeSet[] = [];

  for await (const descriptor of iterateDescriptorStream(input.target, baseFilter)) {
    const action = descriptorStreamAction(streamIndex, offset, limit, processed);
    streamIndex++;

    if (action === "skip") continue;
    if (action === "stop") break;

    const result = await handler(descriptor, input);
    processed++;

    if (result.error) {
      failed++;
      errors.push({ descriptor, message: result.error });
      continue;
    }

    if (result.changed) {
      changed++;
      if (input.dryRun && result.changeSet && sampleChangeSets.length < (sampleSize ?? 5)) {
        sampleChangeSets.push(result.changeSet);
      }
    } else {
      skipped++;
    }
  }

  const segment = resolveSegmentMeta(input, totalItems, offset, limit, processed);

  if (input.dryRun) {
    return Object.freeze({
      dryRun: true as const,
      totalMatched: processed,
      estimatedChanges: changed,
      skipped,
      failed,
      sampleChangeSets: Object.freeze(sampleChangeSets),
      warnings: Object.freeze(
        failed > 0 ? [`${failed} entities failed during dry run estimation`] : []
      ),
      segment,
    });
  }

  return Object.freeze({
    dryRun: false as const,
    totalMatched: processed,
    processed,
    changed,
    skipped,
    failed,
    errors: Object.freeze(errors),
    segment,
  });
}

export const bulkExecutionEngine = {
  count: countBulkEntities,
  run: runBulkExecution,
};
