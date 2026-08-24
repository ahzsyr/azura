import type { SchemaGraph, SchemaContext, PipelineResult } from "./types";
import { merge } from "./merge";
import { dedupe, applyManualOverrides } from "./dedupe";
import { validate } from "./validate";
import { getActiveBuilders } from "./registry/builder-registry";
import {
  mergeJsonLd,
  normalizeGraph,
  parsePageJsonLdNodes,
} from "./merge-jsonld";

function toGraph(nodes: Record<string, unknown>[]): SchemaGraph {
  return {
    "@context": "https://schema.org",
    "@graph": nodes,
  };
}

/** Build final canonical schema graph including page JSON-LD merge + dedupe. */
export function finalizeSchemaGraph(ctx: SchemaContext): PipelineResult {
  const builders = getActiveBuilders(ctx.site.structuredConfig);
  const builderOutputs = builders
    .filter((builder) => builder.supports(ctx))
    .map((builder) => builder.build(ctx));

  const concatenated = merge(builderOutputs);
  const withOverrides = applyManualOverrides(concatenated, ctx.site.structuredConfig);
  const pageNodes = parsePageJsonLdNodes(ctx.page.pageJsonLd);
  const merged = mergeJsonLd(withOverrides, pageNodes);
  const normalized = normalizeGraph(merged);
  const deduped = dedupe(normalized, ctx.site.structuredConfig);
  const graph = toGraph(deduped);
  const issues = validate(graph, ctx);

  return { graph, issues };
}

export const SchemaPipeline = {
  build(ctx: SchemaContext): PipelineResult {
    return finalizeSchemaGraph(ctx);
  },
};

export type { SchemaContext, SchemaGraph, PipelineResult };
