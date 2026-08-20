import type { ReactNode } from "react";
import type { ComponentCapabilities } from "../schema/capabilities";
import type { SchemaDocument } from "../schema/schema-document";
import type { ValueBinding } from "../schema/value-binding";
import type { SchemaRuntime } from "../runtime/schema-runtime";

export type PropertyFieldType =
  | "text"
  | "number"
  | "boolean"
  | "select"
  | "textarea"
  | "expression"
  | "options"
  | "icon";

export type PropertyFieldDefinition = {
  key: string;
  label: string;
  type: PropertyFieldType;
  namespace: "presentation" | "behavior" | "data";
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
};

export type PropertyGroupDefinition = {
  id: string;
  label: string;
  fields: PropertyFieldDefinition[];
};

export type RenderContext = {
  binding: ValueBinding;
  value: unknown;
  onChange: (value: unknown) => void;
  onBlur?: () => void;
  error?: string;
  locale: string;
  runtime: SchemaRuntime;
  schemaId?: string;
  readOnly?: boolean;
  disabled?: boolean;
};

export type LayoutRenderContext = {
  type: string;
  id: string;
  props: Record<string, unknown>;
  children: ReactNode;
  locale: string;
};

export type ContentRenderContext = {
  type: string;
  id: string;
  props: Record<string, unknown>;
  locale: string;
};

export type ValidatorDefinition = {
  id: string;
  name: string;
  validate: (
    value: unknown,
    config: Record<string, unknown> | undefined,
    ctx: { binding: ValueBinding; allValues: Record<string, unknown> },
  ) => string | null | Promise<string | null>;
};

export type ComponentMigration = {
  from: number;
  to: number;
  migrate: (props: Record<string, unknown>) => Record<string, unknown>;
};

export type ToolbarAction = {
  id: string;
  label: string;
  icon?: string;
};

export type UIComponentManifest = {
  id: string;
  version: number;
  name: string;
  icon: string;
  category: "layout" | "content" | "binding";
  capabilities: ComponentCapabilities;
  node: {
    defaultProps: Record<string, unknown>;
  };
  renderer: {
    renderBinding?: (ctx: RenderContext) => ReactNode;
    renderLayout?: (ctx: LayoutRenderContext) => ReactNode;
    renderContent?: (ctx: ContentRenderContext) => ReactNode;
    renderPreview?: (ctx: RenderContext | LayoutRenderContext | ContentRenderContext) => ReactNode;
    getA11yProps?: (binding: ValueBinding) => Record<string, string | boolean | undefined>;
  };
  properties: {
    groups: PropertyGroupDefinition[];
  };
  validators?: string[];
  toolbarActions?: ToolbarAction[];
  defaultValue?: unknown;
  migrations?: ComponentMigration[];
};

export type DataSourceDefinition = {
  id: string;
  name: string;
  resolve: (
    config: Record<string, unknown> | undefined,
    ctx: { parentValue?: unknown; locale: string },
  ) => Promise<Array<{ value: string; label: string }>> | Array<{ value: string; label: string }>;
};

export type DestinationDefinition = {
  id: string;
  name: string;
  dispatch: (ctx: {
    aggregateId: string;
    schemaId: string;
    payload: Record<string, unknown>;
    config: Record<string, unknown>;
  }) => Promise<void>;
};

export type SchemaMigration = {
  from: number;
  to: number;
  migrate: (doc: Record<string, unknown>) => Record<string, unknown>;
};

export type SubmitCommand = {
  type: "Submit";
  schemaId: string;
  bindingValues: Record<string, unknown>;
  context: {
    blockType?: string;
    blockId?: string;
    pageId?: string;
    pageSlug?: string;
    locale: string;
    utm?: Record<string, string>;
    abTestId?: string;
    abVariantId?: string;
    /** Bot trap — must be empty when submitted by humans. */
    honeypot?: string;
    /** Client IP for rate limiting (set by API route). */
    clientIp?: string;
  };
};

export type SaveDraftCommand = {
  type: "SaveDraft";
  schemaId: string;
  token?: string;
  bindingValues: Record<string, unknown>;
  currentStep: number;
};

export type PlatformCommand = SubmitCommand | SaveDraftCommand;

export type CommandHandlerContext = {
  document: SchemaDocument;
  command: PlatformCommand;
  aggregateId?: string;
};

export type CommandMiddleware = (
  ctx: CommandHandlerContext,
  next: () => Promise<Record<string, unknown>>,
) => Promise<Record<string, unknown>>;

export type InteractionEventType =
  | "interaction.created"
  | "interaction.draftSaved"
  | "interaction.stepCompleted"
  | "interaction.validated"
  | "interaction.submitted"
  | "interaction.assigned"
  | "interaction.tagged"
  | "interaction.archived"
  | "interaction.replied"
  | "interaction.forwarded"
  | "binding.changed"
  | "binding.focused"
  | "binding.blurred"
  | "schema.viewed";

export type InteractionEvent = {
  id: string;
  aggregateId: string;
  type: InteractionEventType;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  timestamp: Date;
};

export type StateMachineDefinition = {
  id: string;
  states: Array<{ id: string; label: string; color?: string }>;
  transitions: Array<{ from: string; to: string; trigger: string }>;
  initial: string;
};
