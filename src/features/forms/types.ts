export type FormFieldType =
  | "text"
  | "email"
  | "phone"
  | "textarea"
  | "select"
  | "checkbox"
  | "radio"
  | "number"
  | "date"
  | "file"
  | "hidden";

export type FormFieldOption = {
  value: string;
  label: string;
};

export type FormFieldConditional = {
  fieldId: string;
  operator: "equals" | "notEquals" | "contains" | "notEmpty";
  value: string;
  action: "show" | "hide" | "require";
};

export type FormFieldValidation = {
  min?: number;
  max?: number;
  pattern?: string;
  maxFileSizeMb?: number;
  accept?: string;
};

export type FormFieldDefinition = {
  id: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  /** Optional Lucide/marketing icon name shown beside the field. */
  icon?: string;
  validation?: FormFieldValidation;
  options?: FormFieldOption[];
  conditional?: FormFieldConditional;
};

export type FormStepDefinition = {
  id: string;
  title: string;
  fieldIds: string[];
};

export type FormScoringRule = {
  fieldId: string;
  match: string;
  points: number;
};

export type FormWebhookConfig = {
  url: string;
  events: ("submit")[];
  headers?: Record<string, string>;
};

export type FormNotificationsConfig = {
  /** Canonical receiver list for submission copies. */
  receiverEmails: string[];
  sendToSubmitter: boolean;
  /** Named email account from Settings → Email Accounts. */
  accountId?: string;
  /** @deprecated Legacy; use receiverEmails. Kept for stored definitions. */
  adminEmails?: string[];
};

export type FormRoutingRule = {
  id: string;
  condition: string;
  assigneeId?: string;
  pipelineType?: string;
  tags?: string[];
  customerId?: string;
  companyId?: string;
  campaignId?: string;
};

export type FormDestinationConfig = {
  type: "slack" | "email";
  webhookUrl?: string;
  emails?: string[];
};

export type FormAutomationAction =
  | { type: "tag"; tags: string[] }
  | { type: "assign"; assigneeId: string }
  | { type: "setPipeline"; pipelineType: string }
  | { type: "notify"; emails: string[] };

export type FormAutomationRule = {
  id: string;
  event: "interaction.submitted";
  condition?: string;
  actions: FormAutomationAction[];
};

export type FormPipelineConfig = {
  pipelineType?: string;
  defaultAssigneeId?: string;
  defaultTags?: string[];
  defaultCustomerId?: string;
  defaultCompanyId?: string;
  defaultCampaignId?: string;
};

export type FormAbTestVariant = {
  id: string;
  name: string;
  weight: number;
  schemaPatch?: {
    nodes?: unknown[];
    bindings?: unknown[];
    steps?: unknown[];
    rules?: unknown[];
    theme?: Record<string, unknown>;
  };
};

export type FormAbTest = {
  id: string;
  name: string;
  enabled: boolean;
  variants: FormAbTestVariant[];
};

export type FormTemplateDefinition = {
  fields: FormFieldDefinition[];
  steps?: FormStepDefinition[];
  scoringRules?: FormScoringRule[];
  notifications?: FormNotificationsConfig;
  webhooks?: FormWebhookConfig[];
  pipeline?: FormPipelineConfig;
  routingRules?: FormRoutingRule[];
  destinations?: FormDestinationConfig[];
  automationRules?: FormAutomationRule[];
  allowedAdminIds?: string[];
  abTests?: FormAbTest[];
};

export type FormSubmitEntityRefs = {
  pipelineType?: string;
  assigneeId?: string;
  tags?: string[];
  customerId?: string;
  companyId?: string;
  campaignId?: string;
};

export type FormSubmitContext = {
  templateId: string;
  blockType?: string;
  blockId?: string;
  pageId?: string;
  pageSlug?: string;
  locale: string;
  utm?: Record<string, string>;
  entityRefs?: FormSubmitEntityRefs;
  abTestId?: string;
  abVariantId?: string;
  honeypot?: string;
  clientIp?: string;
};
