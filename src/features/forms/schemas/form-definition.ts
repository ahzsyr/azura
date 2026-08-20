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
  label: z.string().default(""),
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
  label: z.string().default(""),
  placeholder: z.string().optional(),
  required: z.boolean().default(false),
  icon: z.string().optional(),
  validation: formFieldValidationSchema.optional(),
  options: z.array(formFieldOptionSchema).optional(),
  conditional: formFieldConditionalSchema.optional(),
});

export const formStepDefinitionSchema = z.object({
  id: z.string(),
  title: z.string().default(""),
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
  receiverEmails: z.array(z.string().email()).default([]),
  sendToSubmitter: z.boolean().default(false),
  /** Named email account id from Settings → Email Accounts. */
  accountId: z.string().optional(),
  /** Legacy field; prefer receiverEmails. Retained for stored definitions. */
  adminEmails: z.array(z.string().email()).optional(),
});

export const formRoutingRuleSchema = z.object({
  id: z.string(),
  condition: z.string().default(""),
  assigneeId: z.string().optional(),
  pipelineType: z.string().optional(),
  tags: z.array(z.string()).optional(),
  customerId: z.string().optional(),
  companyId: z.string().optional(),
  campaignId: z.string().optional(),
});

export const formDestinationConfigSchema = z.object({
  type: z.enum(["slack", "email"]),
  webhookUrl: z.string().url().optional(),
  emails: z.array(z.string().email()).optional(),
});

export const formPipelineConfigSchema = z.object({
  pipelineType: z.string().optional(),
  defaultAssigneeId: z.string().optional(),
  defaultTags: z.array(z.string()).optional(),
  defaultCustomerId: z.string().optional(),
  defaultCompanyId: z.string().optional(),
  defaultCampaignId: z.string().optional(),
});

export const formAutomationRuleSchema = z.object({
  id: z.string(),
  event: z.literal("interaction.submitted").default("interaction.submitted"),
  condition: z.string().optional(),
  actions: z.array(
    z.union([
      z.object({ type: z.literal("tag"), tags: z.array(z.string()) }),
      z.object({ type: z.literal("assign"), assigneeId: z.string() }),
      z.object({ type: z.literal("setPipeline"), pipelineType: z.string() }),
      z.object({ type: z.literal("notify"), emails: z.array(z.string().email()) }),
    ]),
  ).default([]),
});

export const formAbTestVariantSchema = z.object({
  id: z.string(),
  name: z.string().default(""),
  weight: z.coerce.number().min(0).default(50),
  schemaPatch: z
    .object({
      nodes: z.array(z.unknown()).optional(),
      bindings: z.array(z.unknown()).optional(),
      steps: z.array(z.unknown()).optional(),
      rules: z.array(z.unknown()).optional(),
      theme: z.record(z.unknown()).optional(),
    })
    .optional(),
});

export const formAbTestSchema = z.object({
  id: z.string(),
  name: z.string().default(""),
  enabled: z.boolean().default(false),
  variants: z.array(formAbTestVariantSchema).default([]),
});

export const formTemplateDefinitionSchema = z.object({
  fields: z.array(formFieldDefinitionSchema).default([]),
  steps: z.array(formStepDefinitionSchema).optional(),
  scoringRules: z.array(formScoringRuleSchema).optional(),
  notifications: formNotificationsConfigSchema.optional(),
  webhooks: z.array(formWebhookConfigSchema).optional(),
  pipeline: formPipelineConfigSchema.optional(),
  routingRules: z.array(formRoutingRuleSchema).optional(),
  destinations: z.array(formDestinationConfigSchema).optional(),
  automationRules: z.array(formAutomationRuleSchema).optional(),
  allowedAdminIds: z.array(z.string()).optional(),
  abTests: z.array(formAbTestSchema).optional(),
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
  abTestId: z.string().optional(),
  abVariantId: z.string().optional(),
  honeypot: z.string().optional(),
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

