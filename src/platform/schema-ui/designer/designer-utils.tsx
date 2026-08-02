"use client";

import type { SchemaDocument } from "../schema/schema-document";
import type { SchemaNode } from "../schema/schema-node";
import type { Selection } from "./document-commands";

export function selectionEquals(a: Selection, b: Selection): boolean {
  if (a == null || b == null) return a === b;
  return a.type === b.type && a.id === b.id;
}

export function findNode(nodes: SchemaNode[], id: string): SchemaNode | null {
  for (const n of nodes) {
    if (n.kind !== "binding" && n.id === id) return n;
    if (n.kind === "layout") {
      const found = findNode(n.children, id);
      if (found) return found;
    }
  }
  return null;
}

export function resolveInsertParentId(document: SchemaDocument, selection: Selection): string | null {
  if (!selection || selection.type !== "node") return null;
  const node = findNode(document.nodes, selection.id);
  if (node?.kind === "layout") return node.id;
  return null;
}

export function selectionBreadcrumb(
  document: SchemaDocument,
  selection: Selection,
): string {
  if (!selection) return "No selection";
  if (selection.type === "binding") {
    const b = document.bindings.find((x) => x.bindingId === selection.id);
    return b?.presentation.label ? String(b.presentation.label) : selection.id;
  }
  const node = findNode(document.nodes, selection.id);
  if (!node || node.kind === "binding") return selection.id;
  return String(node.props.title ?? node.props.text ?? node.type);
}
