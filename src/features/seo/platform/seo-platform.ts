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
import type {
  AutoFillCommitOptions,
  AutoFillCommitResult,
  AutoFillSuggestOptions,
  AutoFillSuggestionResult,
  BulkDryRunResult,
  BulkExecutionInput,
  BulkExecutionResult,
  SeoDiffResult,
  SeoPreviewModel,
} from "./types/autofill";
import type { SeoChangeSet } from "./types/change-set";
import type { SeoEntityDescriptor } from "./types/entity-descriptor";

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
  diff: {
    compare(
      descriptor: SeoEntityDescriptor,
      locale: string,
      suggestion: SeoSuggestion,
      writeTarget?: import("./types/change-set").SeoWriteTarget
    ): Promise<SeoDiffResult>;
    toPreviewModel(
      correlationId: string,
      descriptor: SeoEntityDescriptor,
      diff: SeoDiffResult,
      validation?: ValidationResult
    ): SeoPreviewModel;
  };
  autofill: {
    suggest(ctx: SeoExecutionContext, options?: AutoFillSuggestOptions): Promise<AutoFillSuggestionResult>;
    commit(
      ctx: SeoExecutionContext,
      changeSet: SeoChangeSet,
      options?: AutoFillCommitOptions
    ): Promise<AutoFillCommitResult>;
  };
  bulk: {
    count(input: Pick<BulkExecutionInput, "target" | "filter">): Promise<number>;
    run(input: BulkExecutionInput): Promise<BulkExecutionResult | BulkDryRunResult>;
  };
  automation: {
    run(ctx: SeoExecutionContext, pipelineId?: string): Promise<AutomationRunResult>;
  };
}
