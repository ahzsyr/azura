import type { ContentSchemaNode, LayoutSchemaNode, SchemaNode } from "../schema/schema-node";
import { isBindingNode, isLayoutNode } from "../schema/schema-node";
import type { ValueBinding } from "../schema/value-binding";
import { newBindingId } from "../schema/value-binding";

export function findNodeById(nodes: SchemaNode[], id: string): SchemaNode | null {
  for (const node of nodes) {
    if (node.kind === "layout" && node.id === id) return node;
    if (node.kind === "content" && node.id === id) return node;
    if (node.kind === "layout") {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

export function insertBindingNode(nodes: SchemaNode[], bindingId: string): SchemaNode[] {
  return [...nodes, { kind: "binding", bindingId }];
}

export function removeBindingFromTree(nodes: SchemaNode[], bindingId: string): SchemaNode[] {
  return nodes
    .filter((n) => !(n.kind === "binding" && n.bindingId === bindingId))
    .map((n) => {
      if (n.kind === "layout") {
        return { ...n, children: removeBindingFromTree(n.children, bindingId) };
      }
      return n;
    });
}

export function createLayoutNode(
  type: string,
  props: Record<string, unknown> = {},
  children: SchemaNode[] = [],
): LayoutSchemaNode {
  return {
    kind: "layout",
    type,
    id: `${type}-${crypto.randomUUID().slice(0, 8)}`,
    props,
    children,
  };
}

export function createContentNode(type: string, props: Record<string, unknown> = {}): ContentSchemaNode {
  return {
    kind: "content",
    type,
    id: `${type}-${crypto.randomUUID().slice(0, 8)}`,
    props,
  };
}

export function createBindingPair(
  componentType: string,
  presentation: Record<string, unknown> = {},
): { node: SchemaNode; binding: ValueBinding } {
  const bindingId = newBindingId();
  return {
    node: { kind: "binding", bindingId },
    binding: {
      bindingId,
      componentType,
      version: 1,
      presentation: { label: "New field", ...presentation },
      behavior: { required: false },
      data: {},
    },
  };
}

export function flattenBindingNodes(nodes: SchemaNode[]): string[] {
  const ids: string[] = [];
  const walk = (list: SchemaNode[]) => {
    for (const node of list) {
      if (isBindingNode(node)) ids.push(node.bindingId);
      if (isLayoutNode(node)) walk(node.children);
    }
  };
  walk(nodes);
  return ids;
}
