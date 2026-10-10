"use client";

import type { ReactNode } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { SchemaDocument } from "../schema/schema-document";
import type { SchemaNode } from "../schema/schema-node";
import { isBindingNode, isContentNode, isLayoutNode } from "../schema/schema-node";
import { getBindingMap } from "../schema/schema-document";
import { rendererRegistry } from "../registry/renderer-registry";
import type { SchemaRuntime } from "../runtime/schema-runtime";
import { platformEventBus, createInteractionEvent } from "../events/event-bus";
import { behaviorAnalyticsProjection } from "../events/projections";
import { trackFormBehaviorEvent } from "@/features/forms/lib/behavior-tracker.client";
import { mergeTheme, type ThemeTokens } from "../theme/theme-tokens";
import { isBindingRequired } from "../schema/value-binding";
import { Copy, Trash2, Settings, GripVertical, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { designerCanvasMarker } from "./designer-canvas";
import { countDescendantBindings, type DropEdge } from "../designer/document-commands";

export type DesignerSelection = { type: "node" | "binding"; id: string };

export type SchemaRendererProps = {
  document: SchemaDocument;
  schemaId: string;
  locale?: string;
  runtime: SchemaRuntime;
  errors?: Record<string, string>;
  visibleBindingIds?: Set<string>;
  onBindingChange?: (bindingId: string, value: unknown) => void;
  /** Designer selection highlight */
  selectedId?: string | null;
  onSelect?: (selection: DesignerSelection | null) => void;
  designerMode?: boolean;
  themeOverride?: Partial<ThemeTokens>;
  /** Layout hooks from FXS (e.g. fxs-stacked) — merged onto the theme root */
  className?: string;
  onDesignerAction?: (
    action: "duplicate" | "delete" | "settings" | "move-up" | "move-down",
    selection: DesignerSelection,
  ) => void;
  collapsedSectionIds?: ReadonlySet<string>;
  onToggleSectionCollapse?: (sectionId: string) => void;
};

function themeStyle(theme: ThemeTokens): React.CSSProperties {
  return {
    ["--schema-space-sm" as string]: theme.spacing.sm,
    ["--schema-space-md" as string]: theme.spacing.md,
    ["--schema-space-lg" as string]: theme.spacing.lg,
    ["--schema-radius-sm" as string]: theme.radius.sm,
    ["--schema-radius-md" as string]: theme.radius.md,
    ["--schema-radius-lg" as string]: theme.radius.lg,
    ["--schema-input-height" as string]: theme.inputHeight,
  };
}

function nodeContainsId(node: SchemaNode, id: string): boolean {
  if (node.kind === "binding") return node.bindingId === id;
  if (node.kind === "content") return node.id === id;
  if (node.id === id) return false;
  return node.children.some((child) => nodeContainsId(child, id));
}

function EdgeDrop({
  edge,
  rowId,
  parentId,
  rowIndex,
}: {
  edge: DropEdge;
  rowId: string;
  parentId: string | null;
  rowIndex: number;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${edge}:${rowId}`,
    data: { kind: "edge", edge, parentId, rowIndex, rowId },
  });
  return (
    <div
      ref={setNodeRef}
      className={`pointer-events-none absolute inset-x-0 z-10 ${
        edge === "before" ? "top-0 h-1/2" : "bottom-0 h-1/2"
      }`}
    >
      {isOver ? (
        <div
          className={`absolute inset-x-2 h-0.5 rounded-full bg-[#4F46E5] ${
            edge === "before" ? "top-0" : "bottom-0"
          }`}
        />
      ) : null}
    </div>
  );
}

function IntoWell({
  parentId,
  childCount,
  empty,
  children,
}: {
  parentId: string | null;
  childCount: number;
  empty: boolean;
  children?: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: parentId ? `into:${parentId}` : "into:root",
    data: { kind: "into", parentId, childCount },
  });
  return (
    <div
      ref={setNodeRef}
      className={
        empty
          ? `rounded-md border border-dashed px-3 py-8 text-center text-xs text-gray-500 ${
              isOver ? "border-[#4F46E5] bg-[rgba(79,70,229,0.04)]" : "border-[#E5E7EB]"
            }`
          : `rounded-md ${children ? "" : "min-h-8"} ${isOver ? "bg-[rgba(79,70,229,0.04)] ring-1 ring-[#4F46E5]" : ""}`
      }
    >
      {empty ? "Drop components here" : children}
    </div>
  );
}

function DragGrip({
  label,
  selection,
  parentId,
  index,
}: {
  label: string;
  selection: DesignerSelection;
  parentId: string | null;
  index: number;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `canvas:${selection.id}`,
    data: {
      source: "canvas",
      selection,
      parentId,
      sourceIndex: index,
      label,
    },
  });
  return (
    <button
      type="button"
      ref={setNodeRef}
      className={`inline-flex h-6 w-6 shrink-0 cursor-grab items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700 active:cursor-grabbing ${
        isDragging ? "opacity-50" : ""
      }`}
      {...listeners}
      {...attributes}
      aria-label={`Reorder ${label}`}
    >
      <GripVertical className="h-3.5 w-3.5" />
    </button>
  );
}

function DesignerBlock({
  selected,
  selection,
  parentId,
  index,
  siblingCount,
  onSelect,
  onDesignerAction,
  label,
  nodeId,
  required,
  collapsible,
  collapsed,
  hiddenFieldCount,
  onToggleCollapse,
  body,
}: {
  selected: boolean;
  selection: DesignerSelection;
  parentId: string | null;
  index: number;
  siblingCount: number;
  onSelect?: (selection: DesignerSelection | null) => void;
  onDesignerAction?: SchemaRendererProps["onDesignerAction"];
  label: string;
  nodeId: string;
  required?: boolean;
  collapsible?: boolean;
  collapsed?: boolean;
  hiddenFieldCount?: number;
  onToggleCollapse?: () => void;
  body?: ReactNode;
}) {
  const canMoveUp = index > 0;
  const canMoveDown = index < siblingCount - 1;
  return (
    <div
      data-schema-node={selection.type}
      data-schema-id={selection.id}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(selection);
      }}
    >
      <div className="relative">
      <EdgeDrop edge="before" rowId={selection.id} parentId={parentId} rowIndex={index} />
      <EdgeDrop edge="after" rowId={selection.id} parentId={parentId} rowIndex={index} />
      <div
        className={`group flex w-full items-center gap-1 rounded-md border px-1.5 py-1 ${
          required ? "bg-[rgba(245,158,11,0.18)]" : "bg-white"
        } ${selected ? "border-[#4F46E5]" : "border-[#E5E7EB]"}`}
      >
        <DragGrip label={label} selection={selection} parentId={parentId} index={index} />
        <button
          type="button"
          className="inline-flex h-5 w-5 items-center justify-center rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30"
          aria-label={`Move ${label} up`}
          aria-disabled={!canMoveUp}
          disabled={!canMoveUp}
          onClick={(e) => {
            e.stopPropagation();
            onDesignerAction?.("move-up", selection);
          }}
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className="inline-flex h-5 w-5 items-center justify-center rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30"
          aria-label={`Move ${label} down`}
          aria-disabled={!canMoveDown}
          disabled={!canMoveDown}
          onClick={(e) => {
            e.stopPropagation();
            onDesignerAction?.("move-down", selection);
          }}
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
        {collapsible ? (
          <button
            type="button"
            className="inline-flex h-5 w-5 items-center justify-center rounded text-gray-500 hover:bg-gray-100"
            aria-expanded={!collapsed}
            aria-label={collapsed ? `Expand ${label}` : `Collapse ${label}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse?.();
            }}
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${collapsed ? "-rotate-90" : ""}`} />
          </button>
        ) : null}
        <div className="flex min-w-0 flex-1 items-baseline gap-2">
          <span className="truncate text-[12px] font-medium leading-4 text-gray-900">{label}</span>
          <span className="truncate text-[11px] leading-4 text-gray-400">{nodeId}</span>
        </div>
        {collapsed ? (
          <span className="shrink-0 rounded-full bg-gray-100 px-1.5 py-0.5 text-[12px] font-medium text-gray-600">
            {hiddenFieldCount ?? 0} fields
          </span>
        ) : null}
        <div
          className={`absolute end-1 top-1/2 z-20 flex -translate-y-1/2 gap-0.5 rounded-md border border-[#E5E7EB] bg-white p-0.5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-opacity ${
            selected
              ? "opacity-100"
              : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100"
          }`}
        >
          <HoverBtn
            label="Delete"
            onClick={() => onDesignerAction?.("delete", selection)}
            icon={<Trash2 className="h-3 w-3" />}
          />
          <HoverBtn
            label="Duplicate"
            onClick={() => onDesignerAction?.("duplicate", selection)}
            icon={<Copy className="h-3 w-3" />}
          />
          <HoverBtn
            label="Settings"
            onClick={() => {
              onSelect?.(selection);
              onDesignerAction?.("settings", selection);
            }}
            icon={<Settings className="h-3 w-3" />}
          />
        </div>
        </div>
      </div>
      {body}
    </div>
  );
}

function HoverBtn({
  label,
  onClick,
  icon,
}: {
  label: string;
  onClick: () => void;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {icon}
    </button>
  );
}

function renderNode(
  node: SchemaNode,
  props: SchemaRendererProps,
  bindingMap: ReturnType<typeof getBindingMap>,
  place: { parentId: string | null; index: number; siblingCount: number },
): ReactNode {
  const locale = props.locale ?? "en";

  if (isBindingNode(node)) {
    if (props.visibleBindingIds && !props.visibleBindingIds.has(node.bindingId)) return null;
    const binding = bindingMap.get(node.bindingId);
    if (!binding) return null;
    const manifest = rendererRegistry.get(binding.componentType, binding.version);
    if (!manifest?.renderer.renderBinding) return null;
    const trackBehavior = props.schemaId !== "preview" && props.schemaId !== "designer-preview";
    const selected = props.selectedId === node.bindingId;
    if (props.designerMode) {
      const selection: DesignerSelection = { type: "binding", id: node.bindingId };
      return (
        <DesignerBlock
          key={node.bindingId}
          selected={selected}
          selection={selection}
          parentId={place.parentId}
          index={place.index}
          siblingCount={place.siblingCount}
          onSelect={props.onSelect}
          onDesignerAction={props.onDesignerAction}
          label={String(binding.presentation.label ?? binding.bindingId)}
          nodeId={node.bindingId}
          required={isBindingRequired(binding)}
        />
      );
    }
    const content = manifest.renderer.renderBinding({
      binding,
      value: props.runtime.getValue(node.bindingId),
      onChange: (value) => {
        props.runtime.setValue(node.bindingId, value);
        props.onBindingChange?.(node.bindingId, value);
        void platformEventBus.emit(
          createInteractionEvent(props.schemaId, "binding.changed", {
            bindingId: node.bindingId,
            value,
            schemaId: props.schemaId,
          }),
        );
        behaviorAnalyticsProjection.record(
          createInteractionEvent(props.schemaId, "binding.changed", {
            bindingId: node.bindingId,
            schemaId: props.schemaId,
          }),
        );
        if (trackBehavior) {
          void trackFormBehaviorEvent({
            schemaId: props.schemaId,
            type: "binding.changed",
            bindingId: node.bindingId,
          });
        }
      },
      onBlur: () => {
        void platformEventBus.emit(
          createInteractionEvent(props.schemaId, "binding.blurred", {
            bindingId: node.bindingId,
            schemaId: props.schemaId,
          }),
        );
        if (trackBehavior) {
          void trackFormBehaviorEvent({
            schemaId: props.schemaId,
            type: "binding.blurred",
            bindingId: node.bindingId,
          });
        }
      },
      error: props.errors?.[node.bindingId],
      locale,
      runtime: props.runtime,
      schemaId: props.schemaId,
    });

    return content;
  }

  if (isContentNode(node)) {
    if (props.designerMode) {
      const selection: DesignerSelection = { type: "node", id: node.id };
      return (
        <DesignerBlock
          selected={props.selectedId === node.id}
          selection={selection}
          parentId={place.parentId}
          index={place.index}
          siblingCount={place.siblingCount}
          onSelect={props.onSelect}
          onDesignerAction={props.onDesignerAction}
          label={String(node.props.text ?? node.props.title ?? node.type)}
          nodeId={node.id}
        />
      );
    }
    const manifest = rendererRegistry.get(node.type);
    return manifest?.renderer.renderContent?.({ type: node.type, id: node.id, props: node.props, locale }) ?? null;
  }

  if (isLayoutNode(node)) {
    const childNodes = node.children.map((child, index) =>
      renderNode(child, props, bindingMap, { parentId: node.id, index, siblingCount: node.children.length }),
    );

    if (props.designerMode) {
      const selection: DesignerSelection = { type: "node", id: node.id };
      const isSection = node.type === "section";
      const selectedInside = Boolean(props.selectedId && nodeContainsId(node, props.selectedId));
      const collapsed =
        isSection && Boolean(props.collapsedSectionIds?.has(node.id)) && !selectedInside;
      const label = String(node.props.title ?? node.type);
      return (
        <DesignerBlock
          selected={props.selectedId === node.id}
          selection={selection}
          parentId={place.parentId}
          index={place.index}
          siblingCount={place.siblingCount}
          onSelect={props.onSelect}
          onDesignerAction={props.onDesignerAction}
          label={label}
          nodeId={node.id}
          collapsible={isSection}
          collapsed={collapsed}
          hiddenFieldCount={countDescendantBindings(node)}
          onToggleCollapse={() => props.onToggleSectionCollapse?.(node.id)}
          body={
            collapsed ? null : (
              <IntoWell parentId={node.id} childCount={node.children.length} empty={node.children.length === 0}>
                <div className="ps-6">{childNodes}</div>
              </IntoWell>
            )
          }
        />
      );
    }

    const manifest = rendererRegistry.get(node.type);
    return (
      manifest?.renderer.renderLayout?.({
        type: node.type,
        id: node.id,
        props: node.props,
        children: <>{childNodes}</>,
        locale,
      }) ?? <div className="space-y-3">{childNodes}</div>
    );
  }

  return null;
}

export function SchemaRenderer(props: SchemaRendererProps): ReactNode {
  const bindingMap = getBindingMap(props.document);
  const nodes = props.document.nodes.length
    ? props.document.nodes
    : props.document.bindings.map((b) => ({ kind: "binding" as const, bindingId: b.bindingId }));
  const theme = mergeTheme({
    ...(props.document.theme as Partial<ThemeTokens> | undefined),
    ...props.themeOverride,
  });

  const canvasMarker = designerCanvasMarker(props.designerMode);
  return (
    <div
      className={cn(
        "flex flex-col schema-theme",
        props.designerMode ? "gap-0 [&_input]:!h-8 [&_select]:!h-8 [&_textarea]:!min-h-16 [&_label]:!text-[12px] [&_label]:!font-medium" : "gap-5",
        props.className,
      )}
      style={{
        ...themeStyle(theme),
        ...(props.designerMode ? { ["--schema-input-height" as string]: "32px" } : {}),
      }}
      {...(canvasMarker != null ? { "data-designer-canvas": canvasMarker } : {})}
      onClick={() => {
        if (props.designerMode) props.onSelect?.(null);
      }}
    >
      {props.designerMode ? (
        nodes.length === 0 ? (
          <IntoWell parentId={null} childCount={0} empty />
        ) : (
          nodes.map((node, index) => (
            <div
              key={
                node.kind === "binding"
                  ? node.bindingId
                  : node.kind === "layout" || node.kind === "content"
                    ? node.id
                    : index
              }
            >
              {renderNode(node, props, bindingMap, {
                parentId: null,
                index,
                siblingCount: nodes.length,
              })}
            </div>
          ))
        )
      ) : (
        nodes.map((node, i) => (
          <div
            key={
              node.kind === "binding"
                ? node.bindingId
                : node.kind === "layout" || node.kind === "content"
                  ? node.id
                  : i
            }
          >
            {renderNode(node, props, bindingMap, { parentId: null, index: i, siblingCount: nodes.length })}
          </div>
        ))
      )}
    </div>
  );
}
