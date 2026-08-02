import type { SchemaDocument } from "@/platform/schema-ui/schema/schema-document";
import type { FormAbTestVariant } from "@/features/forms/types";

/** Build a schemaPatch that replaces bindings/nodes/steps with the variant document. */
export function documentToSchemaPatch(variantDoc: SchemaDocument): FormAbTestVariant["schemaPatch"] {
  return {
    nodes: variantDoc.nodes as unknown[],
    bindings: variantDoc.bindings as unknown[],
    steps: variantDoc.steps as unknown[],
    rules: variantDoc.rules as unknown[],
    theme: variantDoc.theme as Record<string, unknown> | undefined,
  };
}

export function cloneDocument(doc: SchemaDocument): SchemaDocument {
  return structuredClone(doc);
}
