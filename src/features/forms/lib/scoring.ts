import type { FormScoringRule, FormTemplateDefinition } from "@/features/forms/types";

export function scoreSubmission(
  definition: FormTemplateDefinition,
  payload: Record<string, unknown>,
): number {
  const rules = definition.scoringRules ?? [];
  let total = 0;
  for (const rule of rules) {
    total += scoreRule(rule, payload);
  }
  return total;
}

function scoreRule(rule: FormScoringRule, payload: Record<string, unknown>): number {
  const raw = payload[rule.fieldId];
  if (raw == null) return 0;
  const str = String(raw).trim().toLowerCase();
  const match = rule.match.trim().toLowerCase();
  if (!match) return 0;
  if (str === match || str.includes(match)) {
    return rule.points;
  }
  return 0;
}
