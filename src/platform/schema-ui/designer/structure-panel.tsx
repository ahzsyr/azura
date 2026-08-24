"use client";

import { useMemo, useState } from "react";
import type { SchemaDocument } from "../schema/schema-document";
import type { SchemaNode } from "../schema/schema-node";
import type { Selection } from "./document-commands";
import { selectionEquals } from "./designer-utils";
import { ChevronDown, ChevronRight, FileText, Layers } from "lucide-react";

export type TreeRow = {
  selection: NonNullable<Selection>;
  label: string;
  depth: number;
  kind: string;
  hasChildren?: boolean;
};

export function buildDocumentTree(document: SchemaDocument): TreeRow[] {
  const rows: TreeRow[] = [];
  const walk = (nodes: SchemaNode[], depth: number) => {
    for (const n of nodes) {
      if (n.kind === "binding") {
        const b = document.bindings.find((x) => x.bindingId === n.bindingId);
        rows.push({
          selection: { type: "binding", id: n.bindingId },
          label: String(b?.presentation.label ?? n.bindingId),
          depth,
          kind: b?.componentType ?? "binding",
        });
      } else if (n.kind === "content") {
        rows.push({
          selection: { type: "node", id: n.id },
          label: String(n.props.text ?? n.props.title ?? n.type),
          depth,
          kind: n.type,
        });
      } else {
        rows.push({
          selection: { type: "node", id: n.id },
          label: String(n.props.title ?? n.type),
          depth,
          kind: n.type,
          hasChildren: n.children.length > 0,
        });
        walk(n.children, depth + 1);
      }
    }
  };
  walk(document.nodes, 0);
  return rows;
}

export function StructurePanel({
  document,
  title = "Form",
  selection,
  onSelect,
}: {
  document: SchemaDocument;
  title?: string;
  selection: Selection;
  onSelect: (selection: NonNullable<Selection>) => void;
}) {
  const tree = useMemo(() => buildDocumentTree(document), [document]);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  const toggle = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const visibleRows = useMemo(() => {
    const hiddenDepths: number[] = [];
    return tree.filter((row) => {
      while (hiddenDepths.length && hiddenDepths[hiddenDepths.length - 1]! >= row.depth) {
        hiddenDepths.pop();
      }
      if (hiddenDepths.length) return false;
      const key = `${row.selection.type}:${row.selection.id}`;
      if (row.hasChildren && collapsed.has(key)) {
        hiddenDepths.push(row.depth);
      }
      return true;
    });
  }, [tree, collapsed]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1 text-sm font-medium">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span className="truncate">{title}</span>
      </div>
      {tree.length === 0 ? (
        <p className="text-xs text-muted-foreground px-1 py-2">Add components from the palette.</p>
      ) : (
        <div className="space-y-0.5">
          {visibleRows.map((row) => {
            const key = `${row.selection.type}:${row.selection.id}`;
            const isSelected = selectionEquals(selection, row.selection);
            const isCollapsed = collapsed.has(key);
            return (
              <div
                key={key}
                className={`group flex w-full items-center gap-0.5 rounded-lg text-sm ${
                  isSelected ? "bg-muted" : "hover:bg-muted/50"
                }`}
                style={{ paddingInlineStart: 4 + row.depth * 12 }}
              >
                {row.hasChildren ? (
                  <button
                    type="button"
                    className="shrink-0 p-0.5 text-muted-foreground"
                    onClick={() => toggle(key)}
                    aria-label={isCollapsed ? "Expand" : "Collapse"}
                  >
                    {isCollapsed ? (
                      <ChevronRight className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </button>
                ) : (
                  <span className="w-4 shrink-0" />
                )}
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5 pe-2 text-left"
                  onClick={() => onSelect(row.selection)}
                >
                  <Layers className="h-3 w-3 shrink-0 text-muted-foreground opacity-60" />
                  <span className="truncate">{row.label}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
