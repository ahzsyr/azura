import type { SchemaGraph, SchemaContext, PipelineResult } from "./types";
import { merge } from "./merge";
import { dedupe, applyManualOverrides } from "./dedupe";
import { validate } from "./validate";
import { getActiveBuilders } from "./registry/builder-registry";

function toGraph(nodes: Record<string, unknown>[]): SchemaGraph {
  return {
    "@context": "https://schema.org",
    "@graph": nodes,
  };
}

export const SchemaPipeline = {
  build(ctx: SchemaContext): PipelineResult {
    const builders = getActiveBuilders(ctx.site.structuredConfig);
    const builderOutputs = builders
      .filter((builder) => builder.supports(ctx))
      .map((builder) => builder.build(ctx));

    const concatenated = merge(builderOutputs);
    const withOverrides = applyManualOverrides(concatenated, ctx.site.structuredConfig);
    const deduped = dedupe(withOverrides);
    const graph = toGraph(deduped);
    const issues = validate(graph, ctx);

    return { graph, issues };
  },
};

export type { SchemaContext, SchemaGraph, PipelineResult };
