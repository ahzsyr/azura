import type { FormTemplateDefinition } from "@/features/forms/types";
import type { SchemaDocument } from "@/platform/schema-ui/schema/schema-document";
import { runSchemaMigrations } from "@/platform/schema-ui/schema/migrations";
import { LATEST_SCHEMA_VERSION } from "@/platform/schema-ui/schema/schema-document";

const COMPONENT_TO_FIELD_TYPE: Record<string, string> = {
  textField: "text",
  emailField: "email",
  phoneField: "phone",
  textareaField: "textarea",
  selectField: "select",
  checkboxField: "checkbox",
  radioField: "radio",
  numberField: "number",
  dateField: "date",
  fileField: "file",
  hiddenField: "hidden",
  ratingField: "number",
  npsField: "number",
};

export type FormTemplateDefinitionV2 = FormTemplateDefinition & {
  definitionVersion?: number;
  schema?: SchemaDocument;
};

export function parseSchemaDocument(raw: unknown): SchemaDocument {
  return runSchemaMigrations(raw);
}

export function formDefinitionToSchemaDocument(definition: FormTemplateDefinition): SchemaDocument {
  return runSchemaMigrations({ ...definition, definitionVersion: 1 });
}

export function schemaDocumentToFormDefinition(
  document: SchemaDocument,
  legacy?: Record<string, unknown>,
): FormTemplateDefinition {
  const legacyData = legacy ?? {};
  return {
    fields: document.bindings.map((b) => ({
      id: b.bindingId,
      type: (COMPONENT_TO_FIELD_TYPE[b.componentType] ?? "text") as FormTemplateDefinition["fields"][number]["type"],
      label: String(b.presentation.label ?? ""),
      placeholder: b.presentation.placeholder ? String(b.presentation.placeholder) : undefined,
      required: b.behavior.required === true,
      validation:
        b.data.min != null ||
        b.data.max != null ||
        b.data.pattern ||
        b.data.accept != null ||
        b.data.maxFileSizeMb != null
          ? {
              min: b.data.min as number | undefined,
              max: b.data.max as number | undefined,
              pattern: b.data.pattern as string | undefined,
              accept: b.data.accept != null ? String(b.data.accept) : undefined,
              maxFileSizeMb:
                b.data.maxFileSizeMb != null ? Number(b.data.maxFileSizeMb) : undefined,
            }
          : undefined,
      options: (b.data.options as FormTemplateDefinition["fields"][number]["options"]) ?? undefined,
    })),
    steps: document.steps?.map((s) => ({
      id: s.id,
      title: s.title,
      fieldIds: s.bindingIds,
    })),
    scoringRules: (legacyData.scoringRules as FormTemplateDefinition["scoringRules"]) ?? undefined,
    notifications: (legacyData.notifications as FormTemplateDefinition["notifications"]) ?? undefined,
    webhooks: (legacyData.webhooks as FormTemplateDefinition["webhooks"]) ?? undefined,
    pipeline: (legacyData.pipeline as FormTemplateDefinition["pipeline"]) ?? undefined,
    routingRules: (legacyData.routingRules as FormTemplateDefinition["routingRules"]) ?? undefined,
    destinations: (legacyData.destinations as FormTemplateDefinition["destinations"]) ?? undefined,
    automationRules: (legacyData.automationRules as FormTemplateDefinition["automationRules"]) ?? undefined,
    allowedAdminIds: (legacyData.allowedAdminIds as FormTemplateDefinition["allowedAdminIds"]) ?? undefined,
    abTests: (legacyData.abTests as FormTemplateDefinition["abTests"]) ?? undefined,
  };
}

export function mergeFormDefinitionWithSchema(
  raw: unknown,
): { schema: SchemaDocument; form: FormTemplateDefinition } {
  const migrated = runSchemaMigrations(raw);
  const legacy = (raw as Record<string, unknown>)?._legacy as Record<string, unknown> | undefined;
  const legacyFromRaw = raw as Record<string, unknown>;
  const combinedLegacy = {
    scoringRules: legacy?.scoringRules ?? legacyFromRaw.scoringRules,
    notifications: legacy?.notifications ?? legacyFromRaw.notifications,
    webhooks: legacy?.webhooks ?? legacyFromRaw.webhooks,
    pipeline: legacy?.pipeline ?? legacyFromRaw.pipeline,
    routingRules: legacy?.routingRules ?? legacyFromRaw.routingRules,
    destinations: legacy?.destinations ?? legacyFromRaw.destinations,
    automationRules: legacy?.automationRules ?? legacyFromRaw.automationRules,
    allowedAdminIds: legacy?.allowedAdminIds ?? legacyFromRaw.allowedAdminIds,
    abTests: legacy?.abTests ?? legacyFromRaw.abTests,
  };
  return {
    schema: migrated,
    form: schemaDocumentToFormDefinition(migrated, combinedLegacy),
  };
}

export function wrapSchemaAsFormDefinition(document: SchemaDocument, extensions: Partial<FormTemplateDefinition> = {}): Record<string, unknown> {
  return {
    definitionVersion: LATEST_SCHEMA_VERSION,
    nodes: document.nodes,
    bindings: document.bindings,
    steps: document.steps,
    rules: document.rules,
    theme: document.theme,
    stateMachineId: document.stateMachineId,
    ...extensions,
  };
}

export function parseFormTemplateDefinition(raw: unknown): FormTemplateDefinition {
  const { form } = mergeFormDefinitionWithSchema(raw);
  return form;
}

export function parseFormTemplateSchema(raw: unknown): SchemaDocument {
  return parseSchemaDocument(raw);
}
