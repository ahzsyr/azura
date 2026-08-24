export type LayoutSchemaNode = {
  kind: "layout";
  type: string;
  id: string;
  props: Record<string, unknown>;
  children: SchemaNode[];
};

export type ContentSchemaNode = {
  kind: "content";
  type: string;
  id: string;
  props: Record<string, unknown>;
};

export type BindingSchemaNode = {
  kind: "binding";
  bindingId: string;
};

export type SchemaNode = LayoutSchemaNode | ContentSchemaNode | BindingSchemaNode;

export function isLayoutNode(node: SchemaNode): node is LayoutSchemaNode {
  return node.kind === "layout";
}

export function isContentNode(node: SchemaNode): node is ContentSchemaNode {
  return node.kind === "content";
}

export function isBindingNode(node: SchemaNode): node is BindingSchemaNode {
  return node.kind === "binding";
}

export function collectBindingIds(nodes: SchemaNode[]): string[] {
  const ids: string[] = [];
  const walk = (list: SchemaNode[]) => {
    for (const node of list) {
      if (node.kind === "binding") ids.push(node.bindingId);
      else if (node.kind === "layout") walk(node.children);
    }
  };
  walk(nodes);
  return ids;
}
