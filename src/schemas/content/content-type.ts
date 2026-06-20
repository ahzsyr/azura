import { z } from "zod";

export const contentFieldDefinitionSchema = z.object({
  key: z.string().min(1).regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, "Invalid field key"),
  type: z.enum(["text", "textarea", "number", "select", "boolean", "json", "price", "url", "date"]),
  label: z.string().min(1),
  required: z.boolean().optional(),
  localized: z.boolean().optional(),
  group: z.string().optional(),
  placeholder: z.string().optional(),
  options: z
    .array(
      z.object({
        value: z.string(),
        label: z.string(),
      })
    )
    .optional(),
  compare: z.boolean().optional(),
  compareOrder: z.coerce.number().optional(),
  compareGroup: z.string().optional(),
  highlightDifferences: z.boolean().optional(),
  compareLabel: z.string().optional(),
});

export const contentTypeSchema = z.object({
  id: z.string().optional(),
  slug: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  name: z.string().min(1),
  labelSingular: z.string().min(1),
  labelPlural: z.string().min(1),
  icon: z.string().default("box"),
  routePrefix: z
    .string()
    .max(64)
    .regex(/^[a-z0-9-]*$/, "Route prefix must be lowercase alphanumeric with hyphens")
    .optional()
    .nullable(),
  isEnabled: z.boolean().default(true),
  sortOrder: z.coerce.number().default(0),
  fieldSchema: z.array(contentFieldDefinitionSchema).default([]),
  displaySchema: z.record(z.unknown()).default({}),
  adminConfig: z.record(z.unknown()).default({}),
});

export type ContentTypeInput = z.infer<typeof contentTypeSchema>;
