import type { FormTemplateDefinition } from "@/features/forms/types";
import type { SchemaDocument } from "@/platform/schema-ui/schema/schema-document";

/**
 * Validation is embedded on fields during compile-fields.
 * This pass is reserved for document-level validation rules.
 */
export function compileValidation(
  _document: SchemaDocument,
  fields: FormTemplateDefinition["fields"],
): Pick<FormTemplateDefinition, "fields"> {
  return { fields };
}
