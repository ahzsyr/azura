import type { SchemaGraph, SchemaContext, PipelineResult } from "./types";
import { runGraphEngine } from "./graph/graph-engine";

/** Build final canonical schema graph via Graph Engine. */
export function finalizeSchemaGraph(ctx: SchemaContext): PipelineResult {
  const result = runGraphEngine(ctx);
  return {
    graph: result.graph,
    issues: result.issues,
    diagnostics: result.diagnostics,
    provenance: result.provenance,
    quarantinedNodes: result.quarantinedNodes,
  };
}

export const SchemaPipeline = {
  build(ctx: SchemaContext): PipelineResult {
    return finalizeSchemaGraph(ctx);
  },
};

export type { SchemaContext, SchemaGraph, PipelineResult };
