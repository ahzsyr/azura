import { evaluateRules } from "../layers/governance/rule-engine";
import { validateAndEmit } from "../layers/governance/validation-engine";
import type {
  ContentSnapshot,
  RuleResult,
  SeoExecutionContext,
  SeoSuggestion,
  ValidationResult,
} from "../types";

export async function runValidation(
  ctx: SeoExecutionContext,
  input: { snapshot: ContentSnapshot; suggestion?: SeoSuggestion }
): Promise<ValidationResult> {
  return validateAndEmit(ctx, input);
}

export async function runRuleEvaluation(
  ctx: SeoExecutionContext,
  snapshot: ContentSnapshot
): Promise<RuleResult> {
  return evaluateRules(ctx, snapshot);
}
