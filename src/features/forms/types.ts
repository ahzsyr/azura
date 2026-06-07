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
  labelEn: string;
  labelAr: string;
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
  labelEn: string;
  labelAr: string;
  placeholderEn?: string;
  placeholderAr?: string;
  required: boolean;
  validation?: FormFieldValidation;
  options?: FormFieldOption[];
  conditional?: FormFieldConditional;
};

export type FormStepDefinition = {
  id: string;
  titleEn: string;
  titleAr: string;
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
  adminEmails: string[];
  sendToSubmitter: boolean;
};

export type FormTemplateDefinition = {
  fields: FormFieldDefinition[];
  steps?: FormStepDefinition[];
  scoringRules?: FormScoringRule[];
  notifications?: FormNotificationsConfig;
  webhooks?: FormWebhookConfig[];
};

export type FormSubmitContext = {
  templateId: string;
  blockType?: string;
  blockId?: string;
  pageId?: string;
  pageSlug?: string;
  locale: string;
  utm?: Record<string, string>;
};
