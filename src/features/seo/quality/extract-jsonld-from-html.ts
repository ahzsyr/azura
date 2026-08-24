import type { SchemaNode } from "@/features/seo/platform/schema-pipeline/types";

const JSON_LD_SCRIPT_RE =
  /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nodesFromParsed(parsed: unknown): SchemaNode[] {
  if (!parsed) return [];
  if (Array.isArray(parsed)) {
    return parsed.filter(isPlainObject) as SchemaNode[];
  }
  if (isPlainObject(parsed)) {
    if (Array.isArray(parsed["@graph"])) {
      return (parsed["@graph"] as unknown[]).filter(isPlainObject) as SchemaNode[];
    }
    return [parsed as SchemaNode];
  }
  return [];
}

/** Extract all JSON-LD nodes from rendered HTML. */
export function extractJsonLdFromHtml(html: string): {
  nodes: SchemaNode[];
  invalidBlocks: number;
} {
  const nodes: SchemaNode[] = [];
  let invalidBlocks = 0;

  for (const match of html.matchAll(JSON_LD_SCRIPT_RE)) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as unknown;
      nodes.push(...nodesFromParsed(parsed));
    } catch {
      invalidBlocks += 1;
    }
  }

  return { nodes, invalidBlocks };
}

export function nodePrimaryType(node: SchemaNode): string {
  const type = node["@type"];
  if (typeof type === "string") return type;
  if (Array.isArray(type) && typeof type[0] === "string") return type[0];
  return "";
}

export function indexNodesById(nodes: SchemaNode[]): Map<string, SchemaNode> {
  const map = new Map<string, SchemaNode>();
  for (const node of nodes) {
    const id = node["@id"];
    if (typeof id === "string") map.set(id, node);
  }
  return map;
}

export function indexNodesByType(nodes: SchemaNode[]): Map<string, SchemaNode[]> {
  const map = new Map<string, SchemaNode[]>();
  for (const node of nodes) {
    const type = nodePrimaryType(node);
    if (!type) continue;
    const list = map.get(type) ?? [];
    list.push(node);
    map.set(type, list);
  }
  return map;
}
