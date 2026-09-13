import type { SchemaMigration } from "../../manifests/types";

/** Maps legacy v1 form field types to platform binding component types. */
const FIELD_TYPE_TO_COMPONENT: Record<string, string> = {
  text: "textField",
  email: "emailField",
  phone: "phoneField",
  textarea: "textareaField",
  select: "selectField",
  checkbox: "checkboxField",
  radio: "radioField",
  number: "numberField",
  date: "dateField",
  file: "fileField",
  hidden: "hiddenField",
};

export const migration001V1ToV2: SchemaMigration = {
  from: 1,
  to: 2,
  migrate(raw: Record<string, unknown>) {
    if (raw.definitionVersion === 2 && Array.isArray(raw.nodes) && Array.isArray(raw.bindings)) {
      return raw;
    }

    const fields = Array.isArray(raw.fields) ? raw.fields : [];
    const bindings = fields.map((field: Record<string, unknown>) => {
      const type = String(field.type ?? "text");
      const componentType = FIELD_TYPE_TO_COMPONENT[type] ?? "textField";
      return {
        bindingId: String(field.id),
        componentType,
        version: 1,
        presentation: {
          label: field.label ?? "",
          placeholder: field.placeholder ?? "",
        },
        behavior: {
          required: field.required === true,
        },
        data: {
          options: field.options ?? [],
          min: (field.validation as Record<string, unknown> | undefined)?.min,
          max: (field.validation as Record<string, unknown> | undefined)?.max,
          pattern: (field.validation as Record<string, unknown> | undefined)?.pattern,
          accept: (field.validation as Record<string, unknown> | undefined)?.accept,
          maxFileSizeMb: (field.validation as Record<string, unknown> | undefined)?.maxFileSizeMb,
        },
        validators: field.required ? [{ validatorId: "required" }] : [],
      };
    });

    const nodes = bindings.map((b: { bindingId: string }) => ({
      kind: "binding",
      bindingId: b.bindingId,
    }));

    const steps = Array.isArray(raw.steps)
      ? raw.steps.map((step: Record<string, unknown>) => ({
          id: String(step.id),
          title: String(step.title ?? ""),
          bindingIds: Array.isArray(step.fieldIds) ? step.fieldIds.map(String) : [],
        }))
      : undefined;

    return {
      definitionVersion: 2,
      nodes,
      bindings,
      steps,
      rules: [],
      theme: raw.theme,
      // Preserve feature extensions for forms adapter
      _legacy: {
        scoringRules: raw.scoringRules,
        notifications: raw.notifications,
        webhooks: raw.webhooks,
      },
    };
  },
};
