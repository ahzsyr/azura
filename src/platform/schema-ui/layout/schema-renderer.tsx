"use client";

import type { ReactNode } from "react";
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
import { Copy, Trash2, Settings, GripVertical } from "lucide-react";

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
  onDesignerAction?: (
    action: "duplicate" | "delete" | "settings",
    selection: DesignerSelection,
  ) => void;
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

function DesignerBlock({
  selected,
  selection,
  onSelect,
  onDesignerAction,
  children,
  meta,
}: {
  selected: boolean;
  selection: DesignerSelection;
  onSelect?: (selection: DesignerSelection | null) => void;
  onDesignerAction?: SchemaRendererProps["onDesignerAction"];
  children: ReactNode;
  meta?: { label?: string; required?: boolean; hint?: string };
}) {
  return (
    <div
      className={`group relative rounded-xl border bg-background p-3 transition-shadow ${
        selected
          ? "border-primary shadow-md ring-2 ring-primary/20"
          : "border-transparent hover:border-border hover:shadow-sm"
      }`}
      data-schema-node={selection.type}
      data-schema-id={selection.id}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(selection);
      }}
    >
      {meta?.label ? (
        <div className="mb-2 flex items-center gap-2">
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          <span className="text-sm font-medium">{meta.label}</span>
          {meta.required ? (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
              Required
            </span>
          ) : null}
        </div>
      ) : null}
      {meta?.hint ? <p className="mb-2 text-xs text-muted-foreground">{meta.hint}</p> : null}
      <div className="pointer-events-none">{children}</div>
      <div
        className={`absolute end-2 top-2 flex gap-0.5 rounded-lg border bg-background p-0.5 shadow-sm transition-opacity ${
          selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
      >
        <HoverBtn
          label="Duplicate"
          onClick={() => onDesignerAction?.("duplicate", selection)}
          icon={<Copy className="h-3 w-3" />}
        />
        <HoverBtn
          label="Delete"
          onClick={() => onDesignerAction?.("delete", selection)}
          icon={<Trash2 className="h-3 w-3" />}
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

    if (!props.designerMode) return content;
    const selection: DesignerSelection = { type: "binding", id: node.bindingId };
    return (
      <DesignerBlock
        key={node.bindingId}
        selected={selected}
        selection={selection}
        onSelect={props.onSelect}
        onDesignerAction={props.onDesignerAction}
        meta={{
          label: String(binding.presentation.label ?? binding.bindingId),
          required: isBindingRequired(binding),
          hint: binding.presentation.placeholder
            ? String(binding.presentation.placeholder)
            : undefined,
        }}
      >
        {content}
      </DesignerBlock>
    );
  }

  if (isContentNode(node)) {
    const manifest = rendererRegistry.get(node.type);
    const content =
      manifest?.renderer.renderContent?.({ type: node.type, id: node.id, props: node.props, locale }) ?? null;
    if (!props.designerMode) return content;
    const selection: DesignerSelection = { type: "node", id: node.id };
    return (
      <DesignerBlock
        selected={props.selectedId === node.id}
        selection={selection}
        onSelect={props.onSelect}
        onDesignerAction={props.onDesignerAction}
        meta={{
          label: String(node.props.text ?? node.props.title ?? node.type),
        }}
      >
        {content}
      </DesignerBlock>
    );
  }

  if (isLayoutNode(node)) {
    const manifest = rendererRegistry.get(node.type);
    const children = node.children.map((child) => renderNode(child, props, bindingMap));
    const layout =
      manifest?.renderer.renderLayout?.({
        type: node.type,
        id: node.id,
        props: node.props,
        children: <>{children}</>,
        locale,
      }) ?? <div className="space-y-3">{children}</div>;

    if (!props.designerMode) return layout;
    const selection: DesignerSelection = { type: "node", id: node.id };
    return (
      <DesignerBlock
        selected={props.selectedId === node.id}
        selection={selection}
        onSelect={props.onSelect}
        onDesignerAction={props.onDesignerAction}
        meta={{
          label: String(node.props.title ?? node.type),
        }}
      >
        <div className="min-h-[2rem] pointer-events-auto">{layout}</div>
      </DesignerBlock>
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

  return (
    <div
      className="space-y-3 schema-theme"
      style={themeStyle(theme)}
      onClick={() => {
        if (props.designerMode) props.onSelect?.(null);
      }}
    >
      {nodes.map((node, i) => (
        <div
          key={
            node.kind === "binding"
              ? node.bindingId
              : node.kind === "layout" || node.kind === "content"
                ? node.id
                : i
          }
        >
          {renderNode(node, props, bindingMap)}
        </div>
      ))}
    </div>
  );
}
