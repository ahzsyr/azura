import type {
  AutomationRunResult,
  ContentSnapshot,
  RecommendationInput,
  RuleResult,
  SeoExecutionContext,
  SeoRecommendation,
  SeoSimulation,
  SeoSuggestion,
  SimulationInput,
  ValidationInput,
  ValidationResult,
} from "./types";

export interface SeoPlatform {
  content: {
    analyze(ctx: SeoExecutionContext): Promise<Readonly<ContentSnapshot>>;
  };
  intelligence: {
    generate(
      ctx: SeoExecutionContext,
      snapshot: Readonly<ContentSnapshot>
    ): Promise<SeoSuggestion>;
  };
  governance: {
    validate(ctx: SeoExecutionContext, input: ValidationInput): Promise<ValidationResult>;
    evaluateRules(
      ctx: SeoExecutionContext,
      snapshot: Readonly<ContentSnapshot>
    ): Promise<RuleResult>;
  };
  recommendations: {
    build(
      ctx: SeoExecutionContext,
      input: RecommendationInput
    ): ReadonlyArray<SeoRecommendation>;
  };
  simulation: {
    project(ctx: SeoExecutionContext, input: SimulationInput): SeoSimulation;
  };
  automation: {
    run(ctx: SeoExecutionContext, pipelineId?: string): Promise<AutomationRunResult>;
  };
}
