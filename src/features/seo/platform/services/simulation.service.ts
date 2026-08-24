import type {
  SeoExecutionContext,
  SeoRecommendation,
  SeoSimulation,
  SeoSuggestion,
  SimulationInput,
  ValidationResult,
} from "../types";

function estimateImpact(rec: SeoRecommendation): number {
  if (rec.severity === "critical") return 8;
  if (rec.severity === "warn") return 5;
  return 2;
}

function applyHypotheticalFixes(
  current: ValidationResult,
  recommendations: SeoRecommendation[],
  acceptedIds: string[]
): ValidationResult {
  const accepted = new Set(acceptedIds);
  const remaining = current.violations.filter((v) => !accepted.has(`val-${v.id}`));
  const penalty = remaining.reduce((sum, v) => {
    if (v.severity === "critical") return sum + 15;
    if (v.severity === "warn") return sum + 8;
    return sum + 3;
  }, 0);
  return Object.freeze({
    score: Math.max(0, Math.min(100, 100 - penalty)),
    violations: Object.freeze([...remaining]),
    fieldScores: current.fieldScores,
  });
}

export function projectSimulation(
  _ctx: SeoExecutionContext,
  input: SimulationInput
): SeoSimulation {
  const recommendations = input.recommendations ?? [];
  const accepted = new Set(input.acceptedRecommendationIds);

  const estimates = recommendations
    .filter((r) => accepted.has(r.id))
    .map((r) => ({
      label: r.message,
      impact: estimateImpact(r),
    }));

  const projected = applyHypotheticalFixes(
    input.current,
    recommendations,
    input.acceptedRecommendationIds
  );

  const extraFromSuggestions = (input.suggestions?.length ?? 0) * 2;
  const projectedScore = Math.min(
    100,
    projected.score + estimates.reduce((s, e) => s + e.impact, 0) + extraFromSuggestions
  );

  return Object.freeze({
    currentScore: input.current.score,
    projectedScore,
    delta: projectedScore - input.current.score,
    acceptedRecommendationIds: Object.freeze([...input.acceptedRecommendationIds]),
    estimates: Object.freeze(
      estimates.map((e) => Object.freeze({ ...e }))
    ),
  });
}

export const simulationService = {
  project(ctx: SeoExecutionContext, input: SimulationInput): SeoSimulation {
    return projectSimulation(ctx, input);
  },
};
