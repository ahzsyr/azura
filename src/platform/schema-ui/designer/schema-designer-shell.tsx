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
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Monitor, Tablet, Smartphone, Undo2, Redo2, Eye, ZoomIn, ZoomOut } from "lucide-react";

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

type Breakpoint = "desktop" | "tablet" | "mobile";

const BREAKPOINT_WIDTH: Record<Breakpoint, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "390px",
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

function CanvasDropZone({
  children,
  parentId,
}: {
  children: ReactNode;
  parentId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: parentId ? `drop:layout:${parentId}` : "drop:root",
    data: { targetParentId: parentId },
  });
  return (
    <div
      ref={setNodeRef}
      className={`relative min-h-[160px] rounded-xl transition-colors ${
        isOver ? "bg-primary/5 ring-2 ring-primary" : ""
      }`}
    >
      {isOver ? (
        <div className="pointer-events-none absolute inset-x-4 top-2 z-10 h-1 rounded-full bg-primary shadow-[0_0_0_2px_rgba(59,130,246,0.25)]" />
      ) : null}
      {children}
    </div>
  );
}

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
  const [breakpoint, setBreakpoint] = useState<Breakpoint>("desktop");
  const [leftRail, setLeftRail] = useState<LeftRail>("components");
  const [zoomIndex, setZoomIndex] = useState(2);
  const [dragLabel, setDragLabel] = useState<string | null>(null);
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
      onSelectionChange?.(selection);
    },
    [onSelectionChange],
  );

  useEffect(() => {
    if (externalSelection && externalSelection.id !== history.selection?.id) {
      dispatch({ type: "select", selection: externalSelection });
    }
  }, [externalSelection, history.selection?.id]);

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
  const selectedId = history.selection?.id ?? null;
  const crumb = selectionBreadcrumb(history.document, history.selection);
  const zoom = ZOOM_STEPS[zoomIndex] ?? 1;

  const onDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as { componentType?: string } | undefined;
    setDragLabel(data?.componentType ?? "Item");
  };

  const onDragEnd = (event: DragEndEvent) => {
    setDragLabel(null);
    const { active, over } = event;
    if (!over) return;
    const activeData = active.data.current as
      | { source?: string; kind?: string; componentType?: string; selection?: NonNullable<Selection> }
      | undefined;
    const overData = over.data.current as { targetParentId?: string | null } | undefined;
    const targetParentId =
      overData?.targetParentId !== undefined
        ? overData.targetParentId
        : over.id === "drop:root"
          ? null
          : String(over.id).startsWith("drop:layout:")
            ? String(over.id).replace("drop:layout:", "")
            : parentId;

    if (activeData?.source === "palette" && activeData.componentType) {
      if (activeData.kind === "binding") {
        const cmd = createInsertBindingCommand(activeData.componentType, targetParentId);
        if (cmd) dispatchCommand(cmd);
      } else {
        const cmd = createInsertLayoutOrContentCommand(activeData.componentType, targetParentId);
        if (cmd) dispatchCommand(cmd);
      }
      return;
    }

    if (activeData?.selection) {
      dispatchCommand({
        type: "RelocateNode",
        selection: activeData.selection,
        targetParentId: targetParentId ?? null,
      });
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
    <>
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
              <div className="mx-1 hidden h-5 w-px bg-border sm:block" />
              {(
                [
                  ["desktop", Monitor],
                  ["tablet", Tablet],
                  ["mobile", Smartphone],
                ] as const
              ).map(([bp, Icon]) => (
                <button
                  key={bp}
                  type="button"
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border ${
                    breakpoint === bp ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  }`}
                  onClick={() => setBreakpoint(bp)}
                  title={bp}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border disabled:opacity-40"
                disabled={zoomIndex <= 0}
                onClick={() => setZoomIndex((i) => Math.max(0, i - 1))}
                title="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="w-10 text-center text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border disabled:opacity-40"
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
          <Button type="button" size="sm" variant="outline" onClick={handleSave} disabled={saving}>
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
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="grid gap-4 lg:grid-cols-[240px_1fr_300px]">
            <aside className="flex max-h-[calc(100vh-12rem)] flex-col overflow-hidden rounded-xl border bg-background shadow-sm">
              <div className="flex flex-wrap gap-0.5 border-b p-1.5">
                {leftRailTabs.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className={`rounded-lg px-2 py-1 text-[11px] font-medium ${
                      leftRail === r.id ? "bg-muted" : "text-muted-foreground hover:bg-muted/50"
                    }`}
                    onClick={() => setLeftRail(r.id)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-auto p-3">
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
                ) : null}
                {leftRail === "structure" ? (
                  <StructurePanel
                    document={history.document}
                    title={title}
                    selection={history.selection}
                    onSelect={setSelection}
                  />
                ) : null}
                {leftRail === "assets" ? (
                  assetsContent ? (
                    <div className="space-y-3">{assetsContent}</div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No assets for this form.</p>
                  )
                ) : null}
                {leftRail === "blocks" ? (
                  blocksContent ? (
                    <div className="space-y-3">{blocksContent}</div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No reusable blocks yet.</p>
                  )
                ) : null}
              </div>
            </aside>

            <section className="flex max-h-[calc(100vh-12rem)] flex-col overflow-hidden rounded-xl border bg-background shadow-sm">
              <div className="flex items-center gap-2 border-b px-3 py-2 text-xs text-muted-foreground">
                <span className="truncate">Locale: {previewLocale}</span>
                <span className="ms-auto truncate">{crumb}</span>
              </div>
              <div className="relative flex-1 overflow-auto p-4">
                <FloatingToolbar
                  visible={hasSelection}
                  onDuplicate={() =>
                    history.selection &&
                    dispatchCommand({ type: "DuplicateNode", selection: history.selection })
                  }
                  onDelete={() =>
                    history.selection &&
                    dispatchCommand({ type: "DeleteNode", selection: history.selection })
                  }
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
                  className="mx-auto w-full origin-top transition-all"
                  style={{
                    maxWidth: BREAKPOINT_WIDTH[breakpoint],
                    transform: `scale(${zoom})`,
                  }}
                >
                  <CanvasDropZone parentId={parentId}>
                    {stepsPreview}
                    <SchemaRenderer
                      document={history.document}
                      schemaId="designer-preview"
                      runtime={runtime}
                      designerMode
                      selectedId={selectedId}
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
                        }
                      }}
                    />
                    {history.document.nodes.length === 0 && (
                      <p className="py-16 text-center text-sm text-muted-foreground">
                        Drag components here or click items in the palette.
                      </p>
                    )}
                  </CanvasDropZone>
                </div>
              </div>
              <div className="flex items-center gap-2 border-t px-3 py-2 text-xs text-muted-foreground">
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

            <aside className="max-h-[calc(100vh-12rem)] overflow-auto rounded-xl border bg-background p-3 shadow-sm">
              <NodeInspector
                document={history.document}
                selection={history.selection}
                onUpdateBinding={(binding) => dispatchCommand({ type: "UpdateBinding", binding })}
                onUpdateNodeProps={(nodeId, props) =>
                  dispatchCommand({ type: "UpdateNodeProps", nodeId, props })
                }
              />
            </aside>
          </div>
          <DragOverlay>
            {dragLabel ? (
              <div className="rounded-xl border bg-background px-3 py-2 text-xs shadow-lg">{dragLabel}</div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {tab === "logic" && (
        <div className="space-y-6">
          {renderLogicPanel?.({
            document: history.document,
            onChange: (next) => {
              dispatchCommand({ type: "ReplaceDocument", document: next });
            },
          })}
          <StepEditor
            document={history.document}
            onChange={(next) => {
              dispatchCommand({ type: "ReplaceDocument", document: next });
            }}
          />
        </div>
      )}

      {(tab === "automation" || tab === "workflow") && (extraTabs?.automation ?? extraTabs?.workflow ?? null)}
      {(tab === "analytics" || tab === "experiments") && (extraTabs?.analytics ?? extraTabs?.experiments ?? null)}
      {(tab === "publish" || tab === "publishing") && (extraTabs?.publish ?? extraTabs?.publishing ?? null)}
    </>
  );
}

export { createBindingPair, createLayoutNode, createContentNode };
export type { Selection };
