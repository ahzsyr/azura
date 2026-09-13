// Schema-Driven UI Platform — public API
import "./init-platform";

export type { SchemaDocument, StepDefinition, RuleDefinition, ThemeTokens as SchemaThemeTokens } from "./schema/schema-document";
export type { SchemaNode, LayoutSchemaNode, ContentSchemaNode, BindingSchemaNode } from "./schema/schema-node";
export type { ValueBinding, ValidatorRef } from "./schema/value-binding";
export type { ComponentCapabilities } from "./schema/capabilities";
export { LATEST_SCHEMA_VERSION, createEmptySchemaDocument, getBindingMap } from "./schema/schema-document";
export { runSchemaMigrations } from "./schema/migrations";
export { newBindingId, getBindingLabel, isBindingRequired } from "./schema/value-binding";

export type {
  UIComponentManifest,
  PropertyGroupDefinition,
  RenderContext,
  SubmitCommand,
  SaveDraftCommand,
  InteractionEvent,
  StateMachineDefinition,
} from "./manifests/types";

export { discoverManifests, registerBuiltinPlatform } from "./manifests/discover";
export { schemaRegistry } from "./registry/schema-registry";
export { validatorRegistry } from "./registry/validator-registry";
export { dataSourceRegistry } from "./registry/data-source-registry";
export { destinationRegistry } from "./registry/destination-registry";

export { createManifest, bindingManifest } from "./sdk/create-manifest";

export { SchemaRuntime, createSchemaRuntime } from "./runtime/schema-runtime";
export { SchemaRenderer } from "./layout/schema-renderer";
export { createBindingPair, createLayoutNode, createContentNode, insertBindingNode } from "./layout/layout-engine";

export { expressionEngine, ExpressionEngine } from "./expressions/evaluator";
export { parseExpression, extractExpressionDependencies } from "./expressions/parser";

export { platformEventBus, createInteractionEvent } from "./events/event-bus";
export { interactionEventStore, projectAggregateFromEvents } from "./events/event-store";
export {
  inboxProjection,
  operationalAnalyticsProjection,
  behaviorAnalyticsProjection,
} from "./events/projections";

export { commandBus, composeMiddleware } from "./pipeline/command-bus";

export { SchemaDesignerShell } from "./designer/schema-designer-shell";
export { PropertyInspector, ComponentPalette, NodeInspector } from "./designer/property-inspector";
export { SchemaUiProvider, useSchemaUiReady } from "./provider/schema-ui-provider";
export {
  applyDocumentCommand,
  createInitialHistory,
  undoDocument,
  redoDocument,
} from "./designer/document-commands";
export type { Selection, DocumentCommand, DesignerHistoryState } from "./designer/document-commands";

export { StateMachine, stateMachineRegistry, FORM_LIFECYCLE_MACHINE } from "./state-machine/state-machine";
export { defaultTheme, mergeTheme } from "./theme/theme-tokens";
export { getA11yProps, announceValidationError } from "./a11y/a11y-layer";

export { generateSchemaFromPrompt } from "./ai/schema-generator";
export { listMarketplaceTemplates, MARKETPLACE_TEMPLATES } from "./marketplace/template-marketplace";

export { initializeSchemaUiPlatform } from "./init-platform";
