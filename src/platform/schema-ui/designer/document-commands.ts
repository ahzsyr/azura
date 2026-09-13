import type { SchemaDocument } from "../schema/schema-document";
import type { SchemaNode } from "../schema/schema-node";
import type { ValueBinding } from "../schema/value-binding";
import { createContentNode, createLayoutNode, removeBindingFromTree } from "../layout/layout-engine";
import { schemaRegistry } from "../registry/schema-registry";

export type Selection =
  | { type: "node"; id: string }
  | { type: "binding"; id: string }
  | null;

export type DocumentCommand =
  | {
      type: "InsertNode";
      node: SchemaNode;
      binding?: ValueBinding;
      parentId?: string | null;
      index?: number;
    }
  | { type: "DeleteNode"; selection: NonNullable<Selection> }
  | { type: "DuplicateNode"; selection: NonNullable<Selection> }
  | { type: "MoveNode"; selection: NonNullable<Selection>; direction: "up" | "down" }
  | {
      type: "RelocateNode";
      selection: NonNullable<Selection>;
      targetParentId: string | null;
      index?: number;
    }
  | { type: "IndentNode"; selection: NonNullable<Selection> }
  | { type: "OutdentNode"; selection: NonNullable<Selection> }
  | { type: "WrapNodes"; selection: NonNullable<Selection>; wrapType: "section" | "grid" | "card" | "container" }
  | { type: "UpdateNodeProps"; nodeId: string; props: Record<string, unknown> }
  | { type: "UpdateBinding"; binding: ValueBinding }
  | { type: "ReplaceDocument"; document: SchemaDocument };

export type DesignerHistoryState = {
  document: SchemaDocument;
  selection: Selection;
  past: SchemaDocument[];
  future: SchemaDocument[];
};

function cloneDoc(doc: SchemaDocument): SchemaDocument {
  return structuredClone(doc);
}

function nodeKey(node: SchemaNode): string | null {
  if (node.kind === "binding") return node.bindingId;
  return node.id;
}

function findParentList(
  nodes: SchemaNode[],
  id: string,
): { list: SchemaNode[]; index: number; parent: SchemaNode | null } | null {
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]!;
    if (nodeKey(n) === id) return { list: nodes, index: i, parent: null };
    if (n.kind === "layout") {
      const found = findParentList(n.children, id);
      if (found) {
        if (found.parent === null && found.list === n.children) {
          return { list: n.children, index: found.index, parent: n };
        }
        return found;
      }
    }
  }
  return null;
}

function mapNodes(nodes: SchemaNode[], fn: (n: SchemaNode) => SchemaNode): SchemaNode[] {
  return nodes.map((n) => {
    const next = fn(n);
    if (next.kind === "layout") {
      return { ...next, children: mapNodes(next.children, fn) };
    }
    return next;
  });
}

function removeNodeById(nodes: SchemaNode[], id: string): SchemaNode[] {
  return nodes
    .filter((n) => nodeKey(n) !== id)
    .map((n) => {
      if (n.kind === "layout") {
        return { ...n, children: removeNodeById(n.children, id) };
      }
      return n;
    });
}

function insertIntoParent(
  nodes: SchemaNode[],
  parentId: string | null | undefined,
  node: SchemaNode,
  index?: number,
): SchemaNode[] {
  if (!parentId) {
    const next = [...nodes];
    const at = index == null ? next.length : Math.max(0, Math.min(index, next.length));
    next.splice(at, 0, node);
    return next;
  }
  return mapNodes(nodes, (n) => {
    if (n.kind === "layout" && n.id === parentId) {
      const children = [...n.children];
      const at = index == null ? children.length : Math.max(0, Math.min(index, children.length));
      children.splice(at, 0, node);
      return { ...n, children };
    }
    return n;
  });
}

function stableId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function deepCloneNode(node: SchemaNode, bindingRemap: Map<string, string>): SchemaNode {
  if (node.kind === "binding") {
    const newId = bindingRemap.get(node.bindingId) ?? node.bindingId;
    return { kind: "binding", bindingId: newId };
  }
  if (node.kind === "content") {
    return { ...node, id: stableId(node.type), props: { ...node.props } };
  }
  return {
    ...node,
    id: stableId(node.type),
    props: { ...node.props },
    children: node.children.map((c) => deepCloneNode(c, bindingRemap)),
  };
}

export function applyDocumentCommand(
  state: DesignerHistoryState,
  command: DocumentCommand,
): DesignerHistoryState {
  if (command.type === "ReplaceDocument") {
    return {
      document: cloneDoc(command.document),
      selection: state.selection,
      past: [...state.past, cloneDoc(state.document)].slice(-50),
      future: [],
    };
  }

  const prev = cloneDoc(state.document);
  let next = cloneDoc(state.document);
  let selection = state.selection;

  switch (command.type) {
    case "InsertNode": {
      next.nodes = insertIntoParent(next.nodes, command.parentId, command.node, command.index);
      if (command.binding) {
        next.bindings = [...next.bindings, command.binding];
        selection = { type: "binding", id: command.binding.bindingId };
      } else if (command.node.kind !== "binding") {
        selection = { type: "node", id: command.node.id };
      }
      break;
    }
    case "RelocateNode": {
      const loc = findParentList(next.nodes, command.selection.id);
      if (!loc) break;
      const [item] = loc.list.splice(loc.index, 1);
      if (!item) break;
      // Avoid nesting a layout into itself
      if (
        item.kind === "layout" &&
        command.targetParentId &&
        (command.targetParentId === item.id ||
          findParentList(item.children, command.targetParentId))
      ) {
        loc.list.splice(loc.index, 0, item);
        break;
      }
      next.nodes = insertIntoParent(next.nodes, command.targetParentId, item, command.index);
      break;
    }
    case "DeleteNode": {
      if (command.selection.type === "binding") {
        next.bindings = next.bindings.filter((b) => b.bindingId !== command.selection.id);
        next.nodes = removeBindingFromTree(next.nodes, command.selection.id);
        if (next.steps) {
          next.steps = next.steps.map((s) => ({
            ...s,
            bindingIds: s.bindingIds.filter((id) => id !== command.selection.id),
          }));
        }
      } else {
        next.nodes = removeNodeById(next.nodes, command.selection.id);
      }
      selection = null;
      break;
    }
    case "DuplicateNode": {
      const loc = findParentList(next.nodes, command.selection.id);
      if (!loc) break;
      const original = loc.list[loc.index]!;
      const bindingRemap = new Map<string, string>();
      if (original.kind === "binding") {
        const src = next.bindings.find((b) => b.bindingId === original.bindingId);
        if (!src) break;
        const newId = stableId("binding");
        bindingRemap.set(original.bindingId, newId);
        next.bindings = [...next.bindings, { ...structuredClone(src), bindingId: newId }];
        const dup: SchemaNode = { kind: "binding", bindingId: newId };
        loc.list.splice(loc.index + 1, 0, dup);
        selection = { type: "binding", id: newId };
      } else {
        const collectBindings = (n: SchemaNode) => {
          if (n.kind === "binding") {
            const src = next.bindings.find((b) => b.bindingId === n.bindingId);
            if (src && !bindingRemap.has(n.bindingId)) {
              const newId = stableId("binding");
              bindingRemap.set(n.bindingId, newId);
              next.bindings = [...next.bindings, { ...structuredClone(src), bindingId: newId }];
            }
          } else if (n.kind === "layout") {
            n.children.forEach(collectBindings);
          }
        };
        collectBindings(original);
        const dup = deepCloneNode(original, bindingRemap);
        loc.list.splice(loc.index + 1, 0, dup);
        selection =
          dup.kind === "binding"
            ? { type: "binding", id: dup.bindingId }
            : { type: "node", id: dup.id };
      }
      break;
    }
    case "MoveNode": {
      const loc = findParentList(next.nodes, command.selection.id);
      if (!loc) break;
      const target = command.direction === "up" ? loc.index - 1 : loc.index + 1;
      if (target < 0 || target >= loc.list.length) break;
      const [item] = loc.list.splice(loc.index, 1);
      loc.list.splice(target, 0, item!);
      break;
    }
    case "IndentNode": {
      const loc = findParentList(next.nodes, command.selection.id);
      if (!loc || loc.index === 0) break;
      const prevSibling = loc.list[loc.index - 1]!;
      if (prevSibling.kind !== "layout") break;
      const [item] = loc.list.splice(loc.index, 1);
      prevSibling.children = [...prevSibling.children, item!];
      break;
    }
    case "OutdentNode": {
      const loc = findParentList(next.nodes, command.selection.id);
      if (!loc || !loc.parent || loc.parent.kind !== "layout") break;
      const parentLoc = findParentList(next.nodes, loc.parent.id);
      if (!parentLoc) break;
      const [item] = loc.list.splice(loc.index, 1);
      parentLoc.list.splice(parentLoc.index + 1, 0, item!);
      break;
    }
    case "WrapNodes": {
      const loc = findParentList(next.nodes, command.selection.id);
      if (!loc) break;
      const [item] = loc.list.splice(loc.index, 1);
      const wrapper = createLayoutNode(command.wrapType, {}, item ? [item] : []);
      loc.list.splice(loc.index, 0, wrapper);
      selection = { type: "node", id: wrapper.id };
      break;
    }
    case "UpdateNodeProps": {
      next.nodes = mapNodes(next.nodes, (n) => {
        if ((n.kind === "content" || n.kind === "layout") && n.id === command.nodeId) {
          return { ...n, props: { ...n.props, ...command.props } };
        }
        return n;
      });
      break;
    }
    case "UpdateBinding": {
      next.bindings = next.bindings.map((b) =>
        b.bindingId === command.binding.bindingId ? command.binding : b,
      );
      break;
    }
  }

  return {
    document: next,
    selection,
    past: [...state.past, prev].slice(-50),
    future: [],
  };
}

export function undoDocument(state: DesignerHistoryState): DesignerHistoryState {
  if (state.past.length === 0) return state;
  const past = [...state.past];
  const previous = past.pop()!;
  return {
    document: previous,
    selection: state.selection,
    past,
    future: [cloneDoc(state.document), ...state.future].slice(0, 50),
  };
}

export function redoDocument(state: DesignerHistoryState): DesignerHistoryState {
  if (state.future.length === 0) return state;
  const [next, ...rest] = state.future;
  return {
    document: next!,
    selection: state.selection,
    past: [...state.past, cloneDoc(state.document)].slice(-50),
    future: rest,
  };
}

export function createInsertBindingCommand(
  componentType: string,
  parentId?: string | null,
): DocumentCommand | null {
  const manifest = schemaRegistry.getComponent(componentType);
  if (!manifest || manifest.category !== "binding") return null;
  const bindingId = stableId("binding");
  const binding: ValueBinding = {
    bindingId,
    componentType,
    version: manifest.version,
    presentation: { label: manifest.name },
    behavior: {},
    data: {},
  };
  return {
    type: "InsertNode",
    node: { kind: "binding", bindingId },
    binding,
    parentId,
  };
}

export function createInsertLayoutOrContentCommand(
  componentType: string,
  parentId?: string | null,
): DocumentCommand | null {
  const manifest = schemaRegistry.getComponent(componentType);
  if (!manifest || manifest.category === "binding") return null;
  const node =
    manifest.category === "layout"
      ? createLayoutNode(componentType, { ...manifest.node.defaultProps })
      : createContentNode(componentType, { ...manifest.node.defaultProps });
  return { type: "InsertNode", node, parentId };
}

export function createInitialHistory(document: SchemaDocument): DesignerHistoryState {
  return {
    document: cloneDoc(document),
    selection: null,
    past: [],
    future: [],
  };
}
