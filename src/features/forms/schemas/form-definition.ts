import { z } from "zod";

export const formFieldTypeSchema = z.enum([
  "text",
  "email",
  "phone",
  "textarea",
  "select",
  "checkbox",
  "radio",
  "number",
  "date",
  "file",
  "hidden",
]);

export const formFieldOptionSchema = z.object({
  value: z.string(),
  labelEn: z.string().default(""),
  labelAr: z.string().default(""),
});

export const formFieldConditionalSchema = z.object({
  fieldId: z.string(),
  operator: z.enum(["equals", "notEquals", "contains", "notEmpty"]),
  value: z.string().default(""),
  action: z.enum(["show", "hide", "require"]),
});

export const formFieldValidationSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().optional(),
  maxFileSizeMb: z.number().optional(),
  accept: z.string().optional(),
});

export const formFieldDefinitionSchema = z.object({
  id: z.string(),
  type: formFieldTypeSchema,
  labelEn: z.string().default(""),
  labelAr: z.string().default(""),
  placeholderEn: z.string().optional(),
  placeholderAr: z.string().optional(),
  required: z.boolean().default(false),
  validation: formFieldValidationSchema.optional(),
  options: z.array(formFieldOptionSchema).optional(),
  conditional: formFieldConditionalSchema.optional(),
});

export const formStepDefinitionSchema = z.object({
  id: z.string(),
  titleEn: z.string().default(""),
  titleAr: z.string().default(""),
  fieldIds: z.array(z.string()).default([]),
});

export const formScoringRuleSchema = z.object({
  fieldId: z.string(),
  match: z.string(),
  points: z.coerce.number().default(0),
});

export const formWebhookConfigSchema = z.object({
  url: z.string().url(),
  events: z.array(z.literal("submit")).default(["submit"]),
  headers: z.record(z.string()).optional(),
});

export const formNotificationsConfigSchema = z.object({
  adminEmails: z.array(z.string().email()).default([]),
  sendToSubmitter: z.boolean().default(false),
});

export const formTemplateDefinitionSchema = z.object({
  fields: z.array(formFieldDefinitionSchema).default([]),
  steps: z.array(formStepDefinitionSchema).optional(),
  scoringRules: z.array(formScoringRuleSchema).optional(),
  notifications: formNotificationsConfigSchema.optional(),
  webhooks: z.array(formWebhookConfigSchema).optional(),
});

export const formSubmitRequestSchema = z.object({
  templateId: z.string().min(1),
  payload: z.record(z.unknown()),
  blockType: z.string().optional(),
  blockId: z.string().optional(),
  pageId: z.string().optional(),
  pageSlug: z.string().optional(),
  locale: z.string().default("en"),
  utm: z.record(z.string()).optional(),
});

export const formDraftSaveSchema = z.object({
  templateId: z.string().min(1),
  token: z.string().optional(),
  payload: z.record(z.unknown()),
  currentStep: z.coerce.number().min(0).default(0),
});

export const newsletterSubscribeSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  segment: z.string().default("default"),
  locale: z.string().default("en"),
  doubleOptIn: z.boolean().default(true),
  blockId: z.string().optional(),
  pageSlug: z.string().optional(),
  webhookUrl: z.string().url().optional().or(z.literal("")),
});

export const downloadGateUnlockSchema = z.object({
  mediaAssetId: z.string().min(1),
  unlockMethod: z.enum(["FORM", "NEWSLETTER", "EXTERNAL"]),
  email: z.string().email().optional(),
  submissionId: z.string().optional(),
  subscriberId: z.string().optional(),
  expiryHours: z.coerce.number().min(1).max(720).default(72),
});

export function newFormFieldId(prefix = "field") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function parseFormTemplateDefinition(raw: unknown) {
  return formTemplateDefinitionSchema.parse(raw ?? {});
}
