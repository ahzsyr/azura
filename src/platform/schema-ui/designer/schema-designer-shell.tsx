"use client";

import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import type { ReactNode } from "react";
import type { SchemaDocument } from "../schema/schema-document";
import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Button } from "@/components/ui/button";
import { ComponentPalette } from "./component-palette";
import { NodeInspector } from "./property-inspector";
import { StructurePanel } from "./structure-panel";
import { FloatingToolbar } from "./floating-toolbar";
import { resolveInsertParentId, selectionBreadcrumb } from "./designer-utils";
import { StepEditor } from "./step-editor";
import { SchemaRenderer } from "../layout/schema-renderer";
import { createSchemaRuntime } from "../runtime/schema-runtime";
import { getVisibleBindings } from "../runtime/state-manager";
import {
  applyDocumentCommand,
  createInitialHistory,
  createInsertBindingCommand,
  createInsertLayoutOrContentCommand,
  layoutAncestorIds,
  planRelocate,
  redoDocument,
  undoDocument,
  type DesignerHistoryState,
  type DocumentCommand,
  type Selection,
} from "./document-commands";
import { createBindingPair, createContentNode, createLayoutNode } from "../layout/layout-engine";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Undo2, Redo2, Eye, ZoomIn, ZoomOut, PanelLeftClose, PanelRightClose } from "lucide-react";

export type SchemaDesignerTab =
  | "overview"
  | "builder"
  | "logic"
  | "automation"
  | "analytics"
  | "publish"
  // legacy aliases kept for type compatibility
  | "general"
  | "canvas"
  | "workflow"
  | "experiments"
  | "publishing"
  | "appearance";

type LeftRail = "components" | "structure" | "assets" | "blocks";

type Props = {
  title: string;
  description?: string;
  initialDocument: SchemaDocument;
  onSave: (document: SchemaDocument) => Promise<boolean>;
  onDocumentChange?: (document: SchemaDocument) => void;
  extraTabs?: Partial<Record<SchemaDesignerTab, ReactNode>>;
  headerActions?: ReactNode;
  healthBanner?: ReactNode;
  renderLogicPanel?: (ctx: {
    document: SchemaDocument;
    onChange: (document: SchemaDocument) => void;
    section?: "rules" | "scoring";
  }) => ReactNode;
  /** @deprecated Prefer builderBlocks / builderAssets */
  builderExtras?: ReactNode;
  builderBlocks?: ReactNode;
  builderAssets?: ReactNode;
  previewLocale?: string;
  externalSelection?: Selection;
  onSelectionChange?: (selection: Selection) => void;
  onPreview?: () => void;
};

const BASE_TABS: Array<{ id: SchemaDesignerTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "builder", label: "Design" },
  { id: "logic", label: "Logic" },
];

const EXTRA_TAB_LABELS: Partial<Record<SchemaDesignerTab, string>> = {
  automation: "Automation",
  analytics: "Analytics",
  publish: "Publish",
};

const ZOOM_STEPS = [0.75, 0.9, 1, 1.1, 1.25];

type HistoryAction =
  | { type: "command"; command: DocumentCommand }
  | { type: "select"; selection: Selection }
  | { type: "undo" }
  | { type: "redo" };

function historyReducer(state: DesignerHistoryState, action: HistoryAction): DesignerHistoryState {
  if (action.type === "select") {
    return { ...state, selection: action.selection };
  }
  if (action.type === "undo") return undoDocument(state);
  if (action.type === "redo") return redoDocument(state);
  return applyDocumentCommand(state, action.command);
}

const designerCollision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  if (hits.length <= 1) return hits;
  const areaOf = (id: string | number) => {
    const container = args.droppableContainers.find((entry) => entry.id === id);
    const rect = container?.rect.current;
    if (!rect) return Number.POSITIVE_INFINITY;
    return rect.width * rect.height;
  };
  const isEdge = (id: string | number) => {
    const key = String(id);
    return key.startsWith("before:") || key.startsWith("after:");
  };
  return [...hits].sort((a, b) => {
    if (isEdge(a.id) !== isEdge(b.id)) return isEdge(a.id) ? -1 : 1;
    return areaOf(a.id) - areaOf(b.id);
  });
};

export function SchemaDesignerShell({
  title,
  description,
  initialDocument,
  onSave,
  onDocumentChange,
  extraTabs,
  headerActions,
  healthBanner,
  renderLogicPanel,
  builderExtras,
  builderBlocks,
  builderAssets,
  previewLocale = "en",
  externalSelection,
  onSelectionChange,
  onPreview,
}: Props) {
  const [tab, setTab] = useState<SchemaDesignerTab>("builder");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [leftRail, setLeftRail] = useState<LeftRail>("components");
  const [showPalette, setShowPalette] = useState(true);
  const [showInspector, setShowInspector] = useState(true);
  const [zoomIndex, setZoomIndex] = useState(2);
  const [dragLabel, setDragLabel] = useState<string | null>(null);
  const [collapsedSectionIds, setCollapsedSectionIds] = useState<Set<string>>(() => new Set());
  const [logicSection, setLogicSection] = useState<"rules" | "scoring" | "steps">("rules");
  const [history, dispatch] = useReducer(historyReducer, initialDocument, createInitialHistory);

  const blocksContent = builderBlocks ?? builderExtras;
  const assetsContent = builderAssets;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const dispatchCommand = useCallback(
    (command: DocumentCommand) => {
      const next = applyDocumentCommand(history, command);
      dispatch({ type: "command", command });
      onDocumentChange?.(next.document);
    },
    [history, onDocumentChange],
  );

  const undo = useCallback(() => {
    const next = undoDocument(history);
    dispatch({ type: "undo" });
    onDocumentChange?.(next.document);
  }, [history, onDocumentChange]);

  const redo = useCallback(() => {
    const next = redoDocument(history);
    dispatch({ type: "redo" });
    onDocumentChange?.(next.document);
  }, [history, onDocumentChange]);

  const setSelection = useCallback(
    (selection: Selection) => {
      dispatch({ type: "select", selection });
      if (selection) setShowInspector(true);
      onSelectionChange?.(selection);
    },
    [onSelectionChange],
  );

  useEffect(() => {
    if (externalSelection && externalSelection.id !== history.selection?.id) {
      dispatch({ type: "select", selection: externalSelection });
    }
  }, [externalSelection, history.selection?.id]);

  useEffect(() => {
    const selectedId = history.selection?.id;
    if (!selectedId) return;
    const ancestors = layoutAncestorIds(history.document.nodes, selectedId);
    if (!ancestors.length) return;
    setCollapsedSectionIds((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const ancestor of ancestors) {
        if (next.delete(ancestor)) changed = true;
      }
      return changed ? next : prev;
    });
  }, [history.selection, history.document.nodes]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "z") return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  const runtime = useMemo(
    () =>
      createSchemaRuntime({
        document: history.document,
        schemaId: "designer-preview",
        multiStep: Boolean(history.document.steps?.length),
      }),
    [history.document],
  );

  const visibleBindingIds = useMemo(() => {
    const visible = getVisibleBindings(history.document, runtime.getValues());
    return new Set(visible.map((b) => b.bindingId));
  }, [history.document, runtime]);

  const visibleTabs = [
    ...BASE_TABS,
    ...(Object.keys(extraTabs ?? {}) as SchemaDesignerTab[])
      .filter((id) => EXTRA_TAB_LABELS[id])
      .map((id) => ({ id, label: EXTRA_TAB_LABELS[id]! })),
  ];

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    const ok = await onSave(history.document);
    if (!ok) setError("Save failed");
    setSaving(false);
  }, [history.document, onSave]);

  const parentId = resolveInsertParentId(history.document, history.selection);
  const hasSelection = history.selection != null;
  const inspectorOpen = showInspector;
  const selectedId = history.selection?.id ?? null;
  const crumb = selectionBreadcrumb(history.document, history.selection);
  const zoom = ZOOM_STEPS[zoomIndex] ?? 1;

  const onDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as { componentType?: string; label?: string } | undefined;
    setDragLabel(data?.label ?? data?.componentType ?? "Item");
  };

  const onDragEnd = (event: DragEndEvent) => {
    setDragLabel(null);
    const { active, over } = event;
    if (!over) return;
    const activeData = active.data.current as
      | {
          source?: string;
          kind?: string;
          componentType?: string;
          selection?: NonNullable<Selection>;
          parentId?: string | null;
          sourceIndex?: number;
        }
      | undefined;
    const overData = over.data.current as
      | {
          kind?: "edge" | "into";
          edge?: "before" | "after";
          parentId?: string | null;
          rowIndex?: number;
          childCount?: number;
          targetParentId?: string | null;
        }
      | undefined;
    const targetParentId =
      overData?.kind === "edge" || overData?.kind === "into"
        ? (overData.parentId ?? null)
        : overData?.targetParentId !== undefined
          ? overData.targetParentId
          : over.id === "drop:root"
            ? null
            : String(over.id).startsWith("drop:layout:")
              ? String(over.id).replace("drop:layout:", "")
              : parentId;

    if (activeData?.source === "palette" && activeData.componentType) {
      let index: number | undefined;
      if (overData?.kind === "edge") {
        index = overData.edge === "before" ? overData.rowIndex : (overData.rowIndex ?? 0) + 1;
      } else if (overData?.kind === "into") {
        index = overData.childCount;
      }
      if (activeData.kind === "binding") {
        const cmd = createInsertBindingCommand(activeData.componentType, targetParentId);
        if (cmd && cmd.type === "InsertNode") dispatchCommand({ ...cmd, index });
      } else {
        const cmd = createInsertLayoutOrContentCommand(activeData.componentType, targetParentId);
        if (cmd && cmd.type === "InsertNode") dispatchCommand({ ...cmd, index });
      }
      return;
    }

    if (activeData?.source === "canvas" && activeData.selection) {
      const command = planRelocate({
        nodes: history.document.nodes,
        selection: activeData.selection,
        sourceParentId: activeData.parentId ?? null,
        sourceIndex: activeData.sourceIndex ?? 0,
        targetParentId,
        edge: overData?.edge,
        rowIndex: overData?.rowIndex,
        childCount: overData?.childCount,
        into: overData?.kind === "into",
      });
      if (!command) return;
      dispatchCommand(command);
    }
  };

  const stepsPreview =
    history.document.steps && history.document.steps.length > 0 ? (
      <div className="flex gap-1 mb-3">
        {history.document.steps.map((s, i) => (
          <div
            key={s.id}
            className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden"
            title={s.title}
          >
            <div className={`h-full ${i === 0 ? "bg-primary w-full" : "w-0"}`} />
          </div>
        ))}
      </div>
    ) : null;

  const leftRailTabs: Array<{ id: LeftRail; label: string }> = [
    { id: "components", label: "Components" },
    { id: "structure", label: "Structure" },
    { id: "assets", label: "Assets" },
    { id: "blocks", label: "Blocks" },
  ];

  return (
    <div className="text-gray-900" style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
      <AdminPageHeader title={title} description={description} actions={headerActions} />

      <div className="mb-4 flex flex-wrap items-center gap-2 border-b pb-3">
        <div className="flex flex-wrap gap-1">
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === t.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="ms-auto flex flex-wrap items-center gap-1">
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border disabled:opacity-40"
            disabled={history.past.length === 0}
            onClick={undo}
            title="Undo"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border disabled:opacity-40"
            disabled={history.future.length === 0}
            onClick={redo}
            title="Redo"
          >
            <Redo2 className="h-4 w-4" />
          </button>
          {(tab === "builder" || tab === "canvas") && (
            <>
              <button type="button" className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#E5E7EB] bg-white px-2 text-xs hover:bg-gray-50" onClick={() => setShowPalette((value) => !value)} aria-pressed={showPalette} title="Toggle components and structure">
                <PanelLeftClose className="h-3.5 w-3.5" /> Left panel
              </button>
              <button type="button" className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#E5E7EB] bg-white px-2 text-xs hover:bg-gray-50" onClick={() => setShowInspector((value) => !value)} aria-pressed={showInspector} title="Toggle properties">
                <PanelRightClose className="h-3.5 w-3.5" /> Properties
              </button>
              <div className="mx-1 hidden h-5 w-px bg-[#E5E7EB] sm:block" />
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white disabled:opacity-40"
                disabled={zoomIndex <= 0}
                onClick={() => setZoomIndex((i) => Math.max(0, i - 1))}
                title="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="w-10 text-center text-xs text-gray-500">{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white disabled:opacity-40"
                disabled={zoomIndex >= ZOOM_STEPS.length - 1}
                onClick={() => setZoomIndex((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))}
                title="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </>
          )}
          <Button
            type="button"
            size="sm"
            variant="default"
            className="ms-1 gap-1.5"
            onClick={() => {
              setTab("builder");
              onPreview?.();
            }}
          >
            <Eye className="h-3.5 w-3.5" />
            Preview
          </Button>
          <Button
            type="button"
            size="sm"
            className="ms-1 !border-transparent !bg-[#4F46E5] !text-white shadow-none hover:!bg-[#4338CA]"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive mb-4">{error}</p>}
      {healthBanner}

      {(tab === "overview" || tab === "general") &&
        (extraTabs?.overview ?? extraTabs?.general ?? (
          <p className="text-sm text-muted-foreground">Overview settings</p>
        ))}

      {(tab === "builder" || tab === "canvas") && (
        <DndContext
          sensors={sensors}
          collisionDetection={designerCollision}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <div className="flex h-[calc(100vh-11rem)] min-h-[24rem] items-stretch gap-2 overflow-hidden">
            {showPalette ? (
              <aside className="flex h-full w-[240px] shrink-0 flex-col overflow-hidden rounded-lg border border-[#E5E7EB] bg-white">
                <div className="flex flex-wrap gap-0.5 border-b border-[#E5E7EB] p-1.5">
                  {leftRailTabs.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className={`rounded-md px-2 py-1 text-[12px] font-medium ${
                        leftRail === r.id ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:bg-gray-50"
                      }`}
                      onClick={() => setLeftRail(r.id)}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                {leftRail === "components" ? (
                  <ComponentPalette
                    onAddBinding={(type) => {
                      const cmd = createInsertBindingCommand(type, parentId);
                      if (cmd) dispatchCommand(cmd);
                    }}
                    onAddLayout={(type) => {
                      const cmd = createInsertLayoutOrContentCommand(type, parentId);
                      if (cmd) dispatchCommand(cmd);
                    }}
                  />
                ) : (
                  <div className="flex-1 overflow-auto p-2">
                    {leftRail === "structure" ? (
                      <StructurePanel
                        document={history.document}
                        title={title}
                        selection={history.selection}
                        onSelect={setSelection}
                        onMove={(selection, direction) => dispatchCommand({ type: "MoveNode", selection, direction })}
                        onDelete={(selection) => dispatchCommand({ type: "DeleteNode", selection })}
                      />
                    ) : null}
                    {leftRail === "assets" ? (
                      assetsContent ? (
                        <div className="space-y-3">{assetsContent}</div>
                      ) : (
                        <p className="text-xs text-gray-500">No assets for this form.</p>
                      )
                    ) : null}
                    {leftRail === "blocks" ? (
                      blocksContent ? (
                        <div className="space-y-3">{blocksContent}</div>
                      ) : (
                        <p className="text-xs text-gray-500">No reusable blocks yet.</p>
                      )
                    ) : null}
                  </div>
                )}
              </aside>
            ) : null}

            <section className="flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-[#E5E7EB] bg-white">
              <div className="flex shrink-0 items-center gap-2 border-b border-[#E5E7EB] px-3 py-1.5 text-[12px] text-gray-500">
                <span className="truncate">Locale: {previewLocale}</span>
                <span className="ms-auto truncate">{crumb}</span>
              </div>
              <div className="relative min-h-0 flex-1 overflow-auto bg-[#F9FAFB] p-0">
                <FloatingToolbar
                  visible={hasSelection}
                  onWrapSection={() =>
                    history.selection &&
                    dispatchCommand({
                      type: "WrapNodes",
                      selection: history.selection,
                      wrapType: "section",
                    })
                  }
                  onWrapGrid={() =>
                    history.selection &&
                    dispatchCommand({
                      type: "WrapNodes",
                      selection: history.selection,
                      wrapType: "grid",
                    })
                  }
                />
                <div
                  className="w-full origin-top px-1 transition-all"
                  style={{ transform: `scale(${zoom})` }}
                >
                  {stepsPreview}
                  <SchemaRenderer
                    document={history.document}
                    schemaId="designer-preview"
                    runtime={runtime}
                    designerMode
                    selectedId={selectedId}
                    collapsedSectionIds={collapsedSectionIds}
                    onToggleSectionCollapse={(sectionId) => {
                      setCollapsedSectionIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(sectionId)) next.delete(sectionId);
                        else next.add(sectionId);
                        return next;
                      });
                    }}
                    onSelect={(sel) => setSelection(sel)}
                    visibleBindingIds={visibleBindingIds}
                    onDesignerAction={(action, sel) => {
                      if (action === "settings") {
                        setSelection(sel);
                        return;
                      }
                      if (action === "duplicate") {
                        dispatchCommand({ type: "DuplicateNode", selection: sel });
                        return;
                      }
                      if (action === "delete") {
                        dispatchCommand({ type: "DeleteNode", selection: sel });
                        return;
                      }
                      if (action === "move-up" || action === "move-down") {
                        dispatchCommand({
                          type: "MoveNode",
                          selection: sel,
                          direction: action === "move-up" ? "up" : "down",
                        });
                      }
                    }}
                  />
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 border-t border-[#E5E7EB] px-3 py-1 text-[12px] text-gray-500">
                <span className="truncate">
                  {title} / Design / {crumb}
                </span>
                <span className="ms-auto flex items-center gap-1.5">
                  {saving ? "Saving…" : "Ready"}
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${saving ? "bg-amber-500" : "bg-emerald-500"}`}
                  />
                </span>
              </div>
            </section>

            {inspectorOpen ? (
              <aside className="h-full w-[400px] shrink-0 overflow-auto rounded-lg border border-[#E5E7EB] bg-white p-3">
                <NodeInspector
                  document={history.document}
                  selection={history.selection}
                  onUpdateBinding={(binding) => dispatchCommand({ type: "UpdateBinding", binding })}
                  onUpdateNodeProps={(nodeId, props) =>
                    dispatchCommand({ type: "UpdateNodeProps", nodeId, props })
                  }
                />
              </aside>
            ) : null}
          </div>
          <DragOverlay>
            {dragLabel ? (
              <div className="rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-xs shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                {dragLabel}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {tab === "logic" && (
        <div className="flex items-start gap-3">
          <nav className="sticky top-4 flex w-44 shrink-0 flex-col gap-1 rounded-lg border border-[#E5E7EB] bg-white p-1.5">
            {(
              [
                ["rules", "Conditional logic"],
                ["scoring", "Scoring"],
                ["steps", "Multi-step flow"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`rounded-md px-2.5 py-1.5 text-left text-[12px] font-medium ${
                  logicSection === id
                    ? "border border-[#4F46E5] bg-[rgba(79,70,229,0.04)] text-[#4F46E5]"
                    : "border border-transparent text-gray-600 hover:bg-gray-50"
                }`}
                aria-current={logicSection === id ? "page" : undefined}
                onClick={() => setLogicSection(id)}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="min-w-0 flex-1">
            {logicSection === "steps" ? (
              <StepEditor
                document={history.document}
                onChange={(next) => {
                  dispatchCommand({ type: "ReplaceDocument", document: next });
                }}
              />
            ) : (
              renderLogicPanel?.({
                document: history.document,
                onChange: (next) => {
                  dispatchCommand({ type: "ReplaceDocument", document: next });
                },
                section: logicSection,
              })
            )}
          </div>
        </div>
      )}

      {(tab === "automation" || tab === "workflow") && (extraTabs?.automation ?? extraTabs?.workflow ?? null)}
      {(tab === "analytics" || tab === "experiments") && (extraTabs?.analytics ?? extraTabs?.experiments ?? null)}
      {(tab === "publish" || tab === "publishing") && (extraTabs?.publish ?? extraTabs?.publishing ?? null)}
    </div>
  );
}

export { createBindingPair, createLayoutNode, createContentNode };
export type { Selection };
