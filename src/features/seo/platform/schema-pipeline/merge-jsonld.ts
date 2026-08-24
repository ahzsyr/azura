import type { SchemaNode } from "./types";

export type MergePolicy = "generated" | "manual" | "merged";

export type MergeJsonLdOptions = {
  /** Per-@id merge policy. Defaults: #organization → merged, others → manual if same @id. */
  idPolicies?: Record<string, MergePolicy>;
  defaultPolicy?: MergePolicy;
};

function nodeId(node: SchemaNode): string | undefined {
  const id = node["@id"];
  return typeof id === "string" ? id : undefined;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Parse page-level JSON-LD from SeoMeta into graph nodes (strips top-level @context). */
export function parsePageJsonLdNodes(
  raw: unknown,
): SchemaNode[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.filter(isPlainObject).map((node) => stripNodeContext(node as SchemaNode));
  }
  if (isPlainObject(raw)) {
    if (Array.isArray(raw["@graph"])) {
      return (raw["@graph"] as unknown[])
        .filter(isPlainObject)
        .map((node) => stripNodeContext(node as SchemaNode));
    }
    return [stripNodeContext(raw as SchemaNode)];
  }
  return [];
}

function stripNodeContext(node: SchemaNode): SchemaNode {
  const { "@context": _ctx, ...rest } = node;
  return rest as SchemaNode;
}

function deepMergeProperties(
  generated: SchemaNode,
  manual: SchemaNode,
): SchemaNode {
  const merged: SchemaNode = { ...generated };
  for (const [key, manualValue] of Object.entries(manual)) {
    if (key === "@type" || key === "@id") continue;
    const generatedValue = merged[key];
    if (manualValue === undefined || manualValue === null || manualValue === "") continue;
    if (generatedValue === undefined || generatedValue === null || generatedValue === "") {
      merged[key] = manualValue;
      continue;
    }
    if (isPlainObject(generatedValue) && isPlainObject(manualValue)) {
      merged[key] = { ...generatedValue, ...manualValue };
      continue;
    }
    merged[key] = manualValue;
  }
  return merged;
}

function resolvePolicy(
  id: string | undefined,
  options: MergeJsonLdOptions,
): MergePolicy {
  if (id && options.idPolicies?.[id]) return options.idPolicies[id];
  if (id?.endsWith("#organization")) return "merged";
  return options.defaultPolicy ?? "manual";
}

/**
 * Merge manual page JSON-LD nodes into generated pipeline nodes with entity-aware @id policy.
 */
export function mergeJsonLd(
  generatedNodes: SchemaNode[],
  pageNodes: SchemaNode[],
  options: MergeJsonLdOptions = {},
): SchemaNode[] {
  if (!pageNodes.length) return generatedNodes;

  const byId = new Map<string, SchemaNode>();
  const withoutId: SchemaNode[] = [];

  for (const node of generatedNodes) {
    const id = nodeId(node);
    if (id) byId.set(id, node);
    else withoutId.push(node);
  }

  for (const manualNode of pageNodes) {
    const id = nodeId(manualNode);
    if (!id) {
      withoutId.push(manualNode);
      continue;
    }

    const existing = byId.get(id);
    if (!existing) {
      byId.set(id, manualNode);
      continue;
    }

    const policy = resolvePolicy(id, options);
    if (policy === "generated") {
      continue;
    }
    if (policy === "merged") {
      byId.set(id, deepMergeProperties(existing, manualNode));
      continue;
    }
    byId.set(id, manualNode);
  }

  return [...byId.values(), ...withoutId];
}

/** Strip per-node @context and normalize empty sameAs arrays. */
export function normalizeGraph(nodes: SchemaNode[]): SchemaNode[] {
  return nodes.map((node) => {
    const normalized = stripNodeContext(node);
    if (
      Array.isArray(normalized.sameAs) &&
      normalized.sameAs.length === 0
    ) {
      const { sameAs: _sameAs, ...rest } = normalized;
      return rest;
    }
    return normalized;
  });
}

export function countDuplicateIds(nodes: SchemaNode[]): number {
  const seen = new Set<string>();
  let duplicates = 0;
  for (const node of nodes) {
    const id = nodeId(node);
    if (!id) continue;
    if (seen.has(id)) duplicates += 1;
    else seen.add(id);
  }
  return duplicates;
}
