import { z } from "zod";
import type { ContentFieldDefinition } from "@/features/content/types";

const fieldOptionSchema = z
  .object({
    value: z.string(),
    label: z.string().optional(),
    labelEn: z.string().optional(),
    labelAr: z.string().optional(),
  })
  .transform((opt) => ({
    value: opt.value,
    labelEn: opt.labelEn ?? opt.label ?? opt.value,
    labelAr: opt.labelAr,
  }));

const rawFieldDefinitionSchema = z.object({
  key: z.string().min(1).regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, "Invalid field key"),
  type: z.enum(["text", "textarea", "number", "select", "boolean", "json", "price", "url", "date"]),
  label: z.string().optional(),
  labelEn: z.string().optional(),
  labelAr: z.string().optional(),
  required: z.boolean().optional(),
  localized: z.boolean().optional(),
  group: z.string().optional(),
  placeholder: z.string().optional(),
  options: z.array(fieldOptionSchema).optional(),
  compare: z.boolean().optional(),
  compareOrder: z.coerce.number().optional(),
  compareGroup: z.string().optional(),
  highlightDifferences: z.boolean().optional(),
  compareLabel: z.string().optional(),
  compareLabelEn: z.string().optional(),
  compareLabelAr: z.string().optional(),
  search: z
    .union([
      z.boolean(),
      z.object({
        weight: z.number().optional(),
        facet: z.boolean().optional(),
      }),
    ])
    .optional(),
});

export function normalizeContentFieldDefinition(raw: z.infer<typeof rawFieldDefinitionSchema>): ContentFieldDefinition {
  const labelEn = raw.labelEn ?? raw.label;
  if (!labelEn?.trim()) {
    throw new Error(`Field "${raw.key}" requires labelEn or label`);
  }
  return {
    key: raw.key,
    type: raw.type,
    labelEn: labelEn.trim(),
    labelAr: raw.labelAr?.trim(),
    required: raw.required,
    localized: raw.localized,
    group: raw.group,
    placeholder: raw.placeholder,
    options: raw.options,
    compare: raw.compare,
    compareOrder: raw.compareOrder,
    compareGroup: raw.compareGroup,
    highlightDifferences: raw.highlightDifferences,
    compareLabelEn: raw.compareLabelEn ?? raw.compareLabel,
    compareLabelAr: raw.compareLabelAr,
    search: raw.search,
  };
}

export const contentFieldDefinitionSchema = rawFieldDefinitionSchema.transform(normalizeContentFieldDefinition);

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
