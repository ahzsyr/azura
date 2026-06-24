import { z } from "zod";
import type { FormFieldDefinition, FormTemplateDefinition } from "@/features/forms/types";

function fieldSchema(field: FormFieldDefinition): z.ZodTypeAny {
  let schema: z.ZodTypeAny;

  switch (field.type) {
    case "email":
      schema = z.string().email();
      break;
    case "number":
      schema = z.coerce.number();
      if (field.validation?.min != null) schema = (schema as z.ZodNumber).min(field.validation.min);
      if (field.validation?.max != null) schema = (schema as z.ZodNumber).max(field.validation.max);
      break;
    case "checkbox":
      schema = z.union([z.boolean(), z.literal("true"), z.literal("false")]).transform((v) => v === true || v === "true");
      break;
    case "file":
      schema = z.string().min(1);
      break;
    case "hidden":
    case "text":
    case "phone":
    case "textarea":
    case "select":
    case "radio":
    case "date":
    default:
      schema = z.string();
      if (field.validation?.min != null) schema = (schema as z.ZodString).min(field.validation.min);
      if (field.validation?.max != null) schema = (schema as z.ZodString).max(field.validation.max);
      if (field.validation?.pattern) {
        schema = (schema as z.ZodString).regex(new RegExp(field.validation.pattern));
      }
      break;
  }

  if (!field.required && field.type !== "hidden") {
    schema = schema.optional().or(z.literal(""));
  } else if (field.required) {
    if (field.type === "checkbox") {
      // required checkbox must be true
      schema = z.union([z.boolean(), z.literal("true")]).refine((v) => v === true || v === "true", {
        message: "Required",
      });
    }
  }

  return schema;
}

export function buildZodSchemaFromTemplate(definition: FormTemplateDefinition) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of definition.fields) {
    shape[field.id] = fieldSchema(field);
  }
  return z.object(shape);
}

export function evaluateConditional(
  field: FormFieldDefinition,
  values: Record<string, unknown>,
): { visible: boolean; required: boolean } {
  const baseRequired = field.required;
  if (!field.conditional) {
    return { visible: true, required: baseRequired };
  }

  const source = values[field.conditional.fieldId];
  const str = source == null ? "" : String(source);
  let match = false;
  switch (field.conditional.operator) {
    case "equals":
      match = str === field.conditional.value;
      break;
    case "notEquals":
      match = str !== field.conditional.value;
      break;
    case "contains":
      match = str.includes(field.conditional.value);
      break;
    case "notEmpty":
      match = str.trim().length > 0;
      break;
  }

  if (field.conditional.action === "show") {
    return { visible: match, required: match && baseRequired };
  }
  if (field.conditional.action === "hide") {
    return { visible: !match, required: !match && baseRequired };
  }
  if (field.conditional.action === "require") {
    return { visible: true, required: match || baseRequired };
  }
  return { visible: true, required: baseRequired };
}
