import type { SchemaDocument } from "@/platform/schema-ui/schema/schema-document";
import { LATEST_SCHEMA_VERSION } from "@/platform/schema-ui/schema/schema-document";

/** Normalize document shape before compile passes. */
export function normalizeDocument(document: SchemaDocument): SchemaDocument {
  return {
    definitionVersion: document.definitionVersion ?? LATEST_SCHEMA_VERSION,
    nodes: Array.isArray(document.nodes) ? document.nodes : [],
    bindings: Array.isArray(document.bindings) ? document.bindings : [],
    steps: document.steps,
    rules: document.rules,
    stateMachineId: document.stateMachineId,
    theme: document.theme,
  };
}
