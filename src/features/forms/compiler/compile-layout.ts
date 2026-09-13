import type { FormTemplateDefinition } from "@/features/forms/types";
import type { SchemaDocument } from "@/platform/schema-ui/schema/schema-document";

/** Compile multi-step layout from SchemaDocument steps. */
export function compileLayout(document: SchemaDocument): Pick<FormTemplateDefinition, "steps"> {
  if (!document.steps?.length) return {};
  return {
    steps: document.steps.map((s) => ({
      id: s.id,
      title: s.title,
      fieldIds: s.bindingIds,
    })),
  };
}
