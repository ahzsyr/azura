import type { FormTemplateDefinition } from "@/features/forms/types";
import type { SchemaDocument } from "@/platform/schema-ui/schema/schema-document";
import type { DocumentExtensions } from "@/features/forms/lib/document-envelope";
import { normalizeDocument } from "./normalize";
import { compileFields } from "./compile-fields";
import { compileLayout } from "./compile-layout";
import { compileValidation } from "./compile-validation";
import { compileWorkflow } from "./compile-workflow";

/**
 * One-way compiler: SchemaDocument (+ extensions) → disposable FormTemplateDefinition.
 * Designer must never reverse this path.
 */
export function compileRuntimeDefinition(
  schema: SchemaDocument,
  extensions: DocumentExtensions = {},
): FormTemplateDefinition {
  const normalized = normalizeDocument(schema);
  const fields = compileFields(normalized);
  const { fields: validatedFields } = compileValidation(normalized, fields);
  const layout = compileLayout(normalized);
  const workflow = compileWorkflow(extensions);

  return {
    fields: validatedFields,
    ...layout,
    ...workflow,
  };
}
