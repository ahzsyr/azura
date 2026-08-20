import { z } from "zod";
import type { FormFieldDefinition, FormTemplateDefinition } from "@/features/forms/types";

function acceptMatches(value: string, accept?: string): boolean {
  if (!accept?.trim()) return true;
  const name = value.split("?")[0].split("/").pop() ?? value;
  const ext = name.includes(".") ? `.${name.split(".").pop()!.toLowerCase()}` : "";
  const tokens = accept.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
  return tokens.some((token) => {
    if (token.startsWith(".")) return ext === token;
    if (token.endsWith("/*")) {
      // mime wildcards cannot be checked from a stored URL/id alone
      return true;
    }
    if (token.includes("/")) return true;
    return name.toLowerCase().endsWith(token);
  });
}

function fileUrlFromValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    if (typeof record.url === "string") return record.url;
    if (typeof record.href === "string") return record.href;
    if (typeof record.name === "string") return record.name;
    if (typeof record.filename === "string") return record.filename;
  }
  return "";
}

const fileAttachmentSchema = z.union([
  z.string().min(1),
  z.object({
    url: z.string().min(1),
    name: z.string().optional(),
    filename: z.string().optional(),
    mimeType: z.string().optional(),
    size: z.number().optional(),
    id: z.string().optional(),
  }),
]);

function fieldSchema(field: FormFieldDefinition, required: boolean): z.ZodTypeAny {
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
      schema = fileAttachmentSchema;
      if (field.validation?.accept) {
        const accept = field.validation.accept;
        schema = schema.refine((v) => acceptMatches(fileUrlFromValue(v), accept), {
          message: `File type not allowed (${accept})`,
        });
      }
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

  if (!required && field.type !== "hidden") {
    schema = schema.optional().or(z.literal(""));
  } else if (required) {
    if (field.type === "checkbox") {
      schema = z.union([z.boolean(), z.literal("true")]).refine((v) => v === true || v === "true", {
        message: "Required",
      });
    } else if (field.type === "file") {
      schema = schema.refine((v) => fileUrlFromValue(v).trim().length > 0, {
        message: "Required",
      });
    } else if (field.type !== "number") {
      schema = (schema as z.ZodString).min(1, { message: "Required" });
    }
  }

  return schema;
}

/**
 * Build Zod schema for a template.
 * When `submittedValues` is provided, applies conditionals: hidden fields are stripped;
 * dynamic `required` follows `evaluateConditional`.
 */
export function buildZodSchemaFromTemplate(
  definition: FormTemplateDefinition,
  submittedValues?: Record<string, unknown>,
) {
  const shape: Record<string, z.ZodTypeAny> = {};
  const hiddenIds: string[] = [];

  for (const field of definition.fields) {
    if (submittedValues) {
      const { visible, required } = evaluateConditional(field, submittedValues);
      if (!visible) {
        hiddenIds.push(field.id);
        shape[field.id] = z.any().optional();
        continue;
      }
      shape[field.id] = fieldSchema(field, required);
    } else {
      shape[field.id] = fieldSchema(field, field.required);
    }
  }

  const objectSchema = z.object(shape);
  if (hiddenIds.length === 0) return objectSchema;

  return objectSchema.transform((data) => {
    const out = { ...data } as Record<string, unknown>;
    for (const id of hiddenIds) delete out[id];
    return out;
  });
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
