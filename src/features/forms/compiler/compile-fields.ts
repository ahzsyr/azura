import type { FormFieldConditional, FormFieldDefinition, FormTemplateDefinition } from "@/features/forms/types";
import type { SchemaDocument, RuleDefinition } from "@/platform/schema-ui/schema/schema-document";
import type { ValueBinding } from "@/platform/schema-ui/schema/value-binding";

const COMPONENT_TO_FIELD_TYPE: Record<string, FormFieldDefinition["type"]> = {
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
  likertField: "number",
  emojiField: "select",
  yesNoField: "select",
  matrixField: "text",
};

/** Parse simple IF expressions authored by the logic builder. */
export function parseSimpleRuleExpression(expression: string): {
  fieldId: string;
  operator: FormFieldConditional["operator"];
  value: string;
} | null {
  const trimmed = expression.trim();
  const patterns: Array<{ re: RegExp; operator: FormFieldConditional["operator"] }> = [
    { re: /^([a-zA-Z0-9_-]+)\s*===\s*"([^"]*)"$/, operator: "equals" },
    { re: /^([a-zA-Z0-9_-]+)\s*===\s*'([^']*)'$/, operator: "equals" },
    { re: /^([a-zA-Z0-9_-]+)\s*!==\s*"([^"]*)"$/, operator: "notEquals" },
    { re: /^([a-zA-Z0-9_-]+)\s*!==\s*'([^']*)'$/, operator: "notEquals" },
    { re: /^([a-zA-Z0-9_-]+)\s+contains\s+"([^"]*)"$/i, operator: "contains" },
    { re: /^([a-zA-Z0-9_-]+)\s+contains\s+'([^']*)'$/i, operator: "contains" },
    { re: /^([a-zA-Z0-9_-]+)\s+notEmpty$/i, operator: "notEmpty" },
  ];
  for (const { re, operator } of patterns) {
    const m = trimmed.match(re);
    if (m) {
      return { fieldId: m[1]!, operator, value: m[2] ?? "" };
    }
  }
  return null;
}

export function ruleToConditional(rule: RuleDefinition): FormFieldConditional | null {
  const parsed = parseSimpleRuleExpression(rule.expression);
  if (!parsed) return null;
  const action = rule.actions.find((a) => a.type === "show" || a.type === "hide" || a.type === "require");
  if (!action) return null;
  return {
    fieldId: parsed.fieldId,
    operator: parsed.operator,
    value: parsed.value,
    action: action.type as FormFieldConditional["action"],
  };
}

export function compileFields(document: SchemaDocument): FormTemplateDefinition["fields"] {
  const conditionalsByTarget = new Map<string, FormFieldConditional>();
  for (const rule of document.rules ?? []) {
    const conditional = ruleToConditional(rule);
    if (!conditional) continue;
    const action = rule.actions.find((a) => a.type === "show" || a.type === "hide" || a.type === "require");
    if (!action) continue;
    // Attach conditional to the *affected* binding (action target), keyed by source field in conditional.fieldId
    if (!conditionalsByTarget.has(action.bindingId)) {
      conditionalsByTarget.set(action.bindingId, conditional);
    }
  }

  return document.bindings.map((b) => bindingToField(b, conditionalsByTarget.get(b.bindingId)));
}

function bindingToField(b: ValueBinding, conditional?: FormFieldConditional): FormFieldDefinition {
  const field: FormFieldDefinition = {
    id: b.bindingId,
    type: COMPONENT_TO_FIELD_TYPE[b.componentType] ?? "text",
    label: String(b.presentation.label ?? ""),
    required: b.behavior.required === true,
  };
  if (b.presentation.placeholder) {
    field.placeholder = String(b.presentation.placeholder);
  }
  if (b.presentation.icon) {
    field.icon = String(b.presentation.icon);
  }
  const options = b.data.options as FormFieldDefinition["options"] | undefined;
  if (options?.length) field.options = options;

  const min = b.data.min as number | undefined;
  const max = b.data.max as number | undefined;
  const pattern = b.data.pattern as string | undefined;
  const accept = b.data.accept != null ? String(b.data.accept) : undefined;
  const maxFileSizeMb = b.data.maxFileSizeMb != null ? Number(b.data.maxFileSizeMb) : undefined;
  if (min != null || max != null || pattern || accept != null || maxFileSizeMb != null) {
    field.validation = { min, max, pattern, accept, maxFileSizeMb };
  }
  if (conditional) field.conditional = conditional;
  return field;
}

export function buildSimpleRuleExpression(
  fieldId: string,
  operator: FormFieldConditional["operator"],
  value: string,
): string {
  if (operator === "notEmpty") return `${fieldId} notEmpty`;
  if (operator === "contains") return `${fieldId} contains "${value.replace(/"/g, '\\"')}"`;
  if (operator === "notEquals") return `${fieldId} !== "${value.replace(/"/g, '\\"')}"`;
  return `${fieldId} === "${value.replace(/"/g, '\\"')}"`;
}
