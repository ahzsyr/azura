"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Code2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import type { BlockNode } from "@/types/builder";
import type { HtmlElement } from "../types";
import { getCustomHtmlElements } from "../get-elements";
import { createDefaultElement, type ElementMenuItem } from "../defaults";
import { createTableElement } from "../lib/table-structure";
import { validateElements } from "../validate";
import { InsertElementMenu } from "./insert-element-menu";
import { TableCreateDialog } from "./table-create-dialog";
import { ElementCard } from "./element-card";
import { EditSourcePanel } from "./edit-source-panel";
import { CustomHtmlView } from "../components/custom-html-view";
import { SortableElementList } from "./sortable-element-list";
import { ValidationPanel } from "./validation-panel";
import { useAdminEditingLocaleContextOptional } from "@/components/admin/admin-editing-locale-provider";
import { DEFAULT_ADMIN_LOCALE } from "@/i18n/locale-config";

type Props = {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
};

export function CustomHtmlBlockFields({ block, onChange }: Props) {
  const adminLocale = useAdminEditingLocaleContextOptional();
  const activeCode = adminLocale?.activeLocaleCode ?? DEFAULT_ADMIN_LOCALE.code;

  const [showSource, setShowSource] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [expandedElementId, setExpandedElementId] = useState<string | null>(null);
  const [pendingTableWizard, setPendingTableWizard] = useState(false);

  const blockRef = useRef(block);
  blockRef.current = block;

  const elements = getCustomHtmlElements(block.props, activeCode);
  const warnings = useMemo(() => validateElements(elements), [elements]);

  const setElements = useCallback(
    (next: HtmlElement[]) => {
      onChange(patchBlockSettings(blockRef.current, { elements: next }));
    },
    [onChange]
  );

  const insertElement = (item: ElementMenuItem) => {
    if (item.preset === "tableWizard") {
      setPendingTableWizard(true);
      return;
    }
    const inserted = createDefaultElement(item.tag, item.preset ?? "default");
    setElements([...elements, inserted]);
    setExpandedElementId(inserted.id);
  };

  const confirmTableWizard = (config: import("../lib/table-structure").TableConfig) => {
    const inserted = createTableElement(config);
    setElements([...elements, inserted]);
    setExpandedElementId(inserted.id);
    setPendingTableWizard(false);
  };

  const updateElement = (id: string, patch: Partial<HtmlElement>) => {
    setElements(
      elements.map((el) => (el.id === id ? { ...el, ...patch } : el))
    );
  };

  const removeElement = (id: string) => {
    setElements(elements.filter((el) => el.id !== id));
    if (expandedElementId === id) {
      setExpandedElementId(null);
    }
  };

  const moveElement = (id: string, dir: -1 | 1) => {
    const idx = elements.findIndex((el) => el.id === id);
    if (idx < 0) return;
    const next = [...elements];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setElements(next);
  };

  const reorderByIds = (newIds: string[]) => {
    const map = new Map(elements.map((el) => [el.id, el]));
    setElements(newIds.map((id) => map.get(id)!).filter(Boolean));
  };

  const toggleHidden = (id: string) => {
    setElements(elements.map((el) => (el.id === id ? { ...el, hidden: !el.hidden } : el)));
  };

  const insertLineBreakAt = (index: number) => {
    const lineBreak = createDefaultElement("br");
    const next = [...elements];
    next.splice(index, 0, lineBreak);
    setElements(next);
    setExpandedElementId(null);
  };

  return (
    <div className="space-y-3">
      {/* Fixed top controls row (non-scrollable) */}
      <div className="flex items-center justify-end gap-1">
        {!showSource && (
          <InsertElementMenu
            onInsert={insertElement}
            label="Add Element"
          />
        )}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant={showPreview ? "secondary" : "ghost"}
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => setShowPreview((v) => !v)}
            title="Toggle live preview"
          >
            <Eye className="h-3.5 w-3.5" />
            Preview
          </Button>
          <Button
            type="button"
            variant={showSource ? "secondary" : "ghost"}
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => setShowSource((v) => !v)}
            title="Edit raw HTML source"
          >
            <Code2 className="h-3.5 w-3.5" />
            Source
          </Button>
        </div>
      </div>

      {/* Table wizard */}
      {pendingTableWizard && (
        <div className="flex justify-end">
          <TableCreateDialog
            onConfirm={confirmTableWizard}
            onCancel={() => setPendingTableWizard(false)}
          />
        </div>
      )}

      {/* Scrollable content area */}
      <div className="max-h-[72vh] overflow-y-auto overflow-x-visible pr-1 space-y-3">
        {/* Source editor */}
        {showSource && (
          <div className="rounded-md border bg-muted/20">
            <EditSourcePanel elements={elements} onChange={setElements} />
          </div>
        )}

        {/* Preview pane */}
        {showPreview && (
          <div className="rounded-md border bg-background p-4 min-h-[80px]">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Preview
            </p>
            {elements.length === 0 ? (
              <p className="text-xs text-muted-foreground">No elements yet.</p>
            ) : (
              <CustomHtmlView elements={elements} locale={activeCode} previewMode className="text-sm" />
            )}
          </div>
        )}

        {/* Validation warnings */}
        <ValidationPanel warnings={warnings} />

        {/* Element list */}
        {!showSource && (
          <div>
            {elements.length === 0 && (
              <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                No elements yet. Use &ldquo;Add Element&rdquo; to insert your first HTML element.
              </p>
            )}

            <SortableElementList
              ids={elements.map((el) => el.id)}
              onReorder={reorderByIds}
            >
              {(id, dragHandle) => {
                const el = elements.find((e) => e.id === id);
                if (!el) return null;
                const index = elements.findIndex((e) => e.id === id);
                return (
                  <ElementCard
                    key={el.id}
                    element={el}
                    index={index}
                    total={elements.length}
                    open={expandedElementId === el.id}
                    onToggleOpen={() =>
                      setExpandedElementId((prev) => (prev === el.id ? null : el.id))
                    }
                    onChange={(patch) => updateElement(el.id, patch)}
                    onMoveUp={() => moveElement(el.id, -1)}
                    onMoveDown={() => moveElement(el.id, 1)}
                    onToggleHidden={() => toggleHidden(el.id)}
                    onInsertLineBreakAfter={() => insertLineBreakAt(index + 1)}
                    onRemove={() => removeElement(el.id)}
                    dragHandle={dragHandle}
                  />
                );
              }}
            </SortableElementList>
          </div>
        )}

        {elements.length > 0 && (
          <p className="text-[10px] text-muted-foreground">
            {elements.length} element{elements.length !== 1 ? "s" : ""}
            {elements.filter((e) => e.hidden).length > 0 &&
              ` · ${elements.filter((e) => e.hidden).length} hidden`}
          </p>
        )}
      </div>
    </div>
  );
}
