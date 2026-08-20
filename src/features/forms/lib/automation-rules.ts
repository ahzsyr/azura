import type { FormAutomationRule, FormTemplateDefinition } from "@/features/forms/types";

export function parseAutomationRules(raw: unknown): FormTemplateDefinition["automationRules"] {
  if (!Array.isArray(raw)) return undefined;
  return raw
    .filter((r): r is Record<string, unknown> => Boolean(r && typeof r === "object"))
    .map((r) => ({
      id: String(r.id ?? `auto-${Math.random().toString(36).slice(2, 8)}`),
      event: "interaction.submitted" as const,
      condition: typeof r.condition === "string" ? r.condition : undefined,
      actions: Array.isArray(r.actions)
        ? r.actions.filter((a): a is FormAutomationRule["actions"][number] => Boolean(a && typeof a === "object"))
        : [],
    }));
}
