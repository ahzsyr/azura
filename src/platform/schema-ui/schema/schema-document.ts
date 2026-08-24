import type { SchemaNode } from "./schema-node";
import type { ValueBinding } from "./value-binding";

export type StepDefinition = {
  id: string;
  title: string;
  bindingIds: string[];
  type?: "input" | "review" | "submit";
};

export type RuleDefinition = {
  id: string;
  expression: string;
  actions: Array<{
    type: "show" | "hide" | "require" | "setValue";
    bindingId: string;
    value?: unknown;
  }>;
};

export type ThemeTokens = {
  spacing?: Record<string, string>;
  radius?: Record<string, string>;
  inputHeight?: string;
  labelStyle?: "above" | "floating" | "inline";
  buttonVariant?: string;
};

export type SchemaDocument = {
  definitionVersion: number;
  nodes: SchemaNode[];
  bindings: ValueBinding[];
  steps?: StepDefinition[];
  rules?: RuleDefinition[];
  stateMachineId?: string;
  theme?: ThemeTokens;
};

export const LATEST_SCHEMA_VERSION = 2;

export function createEmptySchemaDocument(): SchemaDocument {
  return {
    definitionVersion: LATEST_SCHEMA_VERSION,
    nodes: [],
    bindings: [],
  };
}

export function getBindingMap(document: SchemaDocument): Map<string, ValueBinding> {
  return new Map(document.bindings.map((b) => [b.bindingId, b]));
}
