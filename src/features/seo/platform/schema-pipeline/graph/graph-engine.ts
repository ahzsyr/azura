import type { SeoStructuredConfig } from "@/features/seo/types";
import type { SchemaContext, SchemaGraph, SchemaNode } from "../types";
import { merge } from "../merge";
import { parsePageJsonLdNodes, normalizeGraph } from "../merge-jsonld";
import { getActiveBuilders } from "../registry/builder-registry";
import {
  deepMergeSchemaNodes,
  detectProtectedIdentityMutations,
  mergeNodesById,
  nodeId,
  stripEmptyValues,
  type SchemaDiagnostic,
} from "./deep-merge";
import { dedupeById, resolveGraphRelationships } from "./relationships";
import { validate } from "../validate";

export type NodeProvenance = Record<string, string>;

export type GraphEngineResult = {
  graph: SchemaGraph;
  diagnostics: SchemaDiagnostic[];
  provenance: Record<string, NodeProvenance>;
  conflicts: SchemaDiagnostic[];
  quarantinedNodes: SchemaNode[];
  issues: import("../types").ValidationIssue[];
};

function toGraph(nodes: SchemaNode[]): SchemaGraph {
  return {
    "@context": "https://schema.org",
    "@graph": nodes,
  };
}

function collectBuilderNodes(ctx: SchemaContext): {
  nodes: SchemaNode[];
  provenance: Record<string, NodeProvenance>;
} {
  const builders = getActiveBuilders(ctx.site.structuredConfig);
  const nodes: SchemaNode[] = [];
  const provenance: Record<string, NodeProvenance> = {};

  for (const builder of builders) {
    if (!builder.supports(ctx)) continue;
    const built = builder.build(ctx);
    for (const node of built) {
      const cleaned = stripEmptyValues(node);
      nodes.push(cleaned);
      const id = nodeId(cleaned);
      if (id && builder.provenance) {
        provenance[id] = builder.provenance(ctx, cleaned);
      }
    }
  }

  return { nodes, provenance };
}

function siteOverrideNodes(config: SeoStructuredConfig): SchemaNode[] {
  const overrides: SchemaNode[] = [];
  if (config.organization) overrides.push(stripEmptyValues(config.organization as SchemaNode));
  if (config.website) overrides.push(stripEmptyValues(config.website as SchemaNode));
  return overrides;
}

function mergeNodeLayers(
  baseNodes: SchemaNode[],
  layerNodes: SchemaNode[],
): { nodes: SchemaNode[]; diagnostics: SchemaDiagnostic[] } {
  const byId = new Map<string, SchemaNode>();
  const withoutId: SchemaNode[] = [];
  const diagnostics: SchemaDiagnostic[] = [];

  for (const node of baseNodes) {
    const id = nodeId(node);
    if (id) byId.set(id, node);
    else withoutId.push(node);
  }

  for (const incoming of layerNodes) {
    const id = nodeId(incoming);
    if (!id) {
      withoutId.push(incoming);
      continue;
    }

    const existing = byId.get(id);
    if (!existing) {
      byId.set(id, incoming);
      continue;
    }

    const { node, diagnostics: mergeDiagnostics } = mergeNodesById(existing, incoming);
    diagnostics.push(...mergeDiagnostics);
    if (!mergeDiagnostics.some((d) => d.severity === "error")) {
      byId.set(id, node);
    }
  }

  return { nodes: [...byId.values(), ...withoutId], diagnostics };
}

/** Validate override JSON before persist (save path). */
export function validateOverrideNodes(
  generatedNodes: SchemaNode[],
  overrideNodes: SchemaNode[],
): SchemaDiagnostic[] {
  const diagnostics: SchemaDiagnostic[] = [];
  const generatedById = new Map<string, SchemaNode>();
  for (const node of generatedNodes) {
    const id = nodeId(node);
    if (id) generatedById.set(id, node);
  }

  for (const override of overrideNodes) {
    const id = nodeId(override);
    if (!id) continue;
    const generated = generatedById.get(id);
    if (generated) {
      diagnostics.push(...detectProtectedIdentityMutations(generated, override));
    } else {
      // New node from override — check it doesn't set protected fields inconsistently
      for (const field of ["@id", "@type", "url"] as const) {
        if (override[field] !== undefined && !override[field]) {
          diagnostics.push({
            severity: "error",
            code: "PROTECTED_IDENTITY_MUTATION",
            message: `Override sets invalid protected field "${field}".`,
            nodeId: id,
          });
        }
      }
    }
  }

  return diagnostics;
}

export function runGraphEngine(ctx: SchemaContext): GraphEngineResult {
  const allDiagnostics: SchemaDiagnostic[] = [];
  const conflicts: SchemaDiagnostic[] = [];

  const { nodes: builderNodes, provenance } = collectBuilderNodes(ctx);

  let nodes = builderNodes;

  const siteOverrides = siteOverrideNodes(ctx.site.structuredConfig);
  if (siteOverrides.length) {
    const merged = mergeNodeLayers(nodes, siteOverrides);
    nodes = merged.nodes;
    allDiagnostics.push(...merged.diagnostics);
  }

  const pageNodes = parsePageJsonLdNodes(ctx.page.pageJsonLd);
  if (pageNodes.length) {
    const merged = mergeNodeLayers(nodes, pageNodes.map(stripEmptyValues));
    nodes = merged.nodes;
    allDiagnostics.push(...merged.diagnostics);
  }

  nodes = normalizeGraph(nodes);

  const relationshipResult = resolveGraphRelationships(nodes, ctx);
  nodes = relationshipResult.nodes;
  allDiagnostics.push(...relationshipResult.diagnostics);

  const dedupeResult = dedupeById(nodes);
  nodes = dedupeResult.nodes;
  allDiagnostics.push(...dedupeResult.diagnostics);
  conflicts.push(...dedupeResult.diagnostics.filter((d) => d.code === "DUPLICATE_ID_TYPE_CONFLICT"));

  const graph = toGraph(nodes);
  const issues = validate(graph, ctx);

  return {
    graph,
    diagnostics: allDiagnostics,
    provenance,
    conflicts,
    quarantinedNodes: dedupeResult.quarantinedNodes,
    issues,
  };
}

/** Build graph from builders only (for save-time override validation). */
export function buildGeneratedNodesOnly(ctx: SchemaContext): SchemaNode[] {
  const builders = getActiveBuilders(ctx.site.structuredConfig);
  const outputs = builders
    .filter((builder) => builder.supports(ctx))
    .map((builder) => builder.build(ctx));
  return merge(outputs).map(stripEmptyValues);
}
