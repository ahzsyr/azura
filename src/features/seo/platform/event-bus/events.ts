import type {
  ContentSnapshot,
  RuleResult,
  SeoExecutionContext,
  SeoRecommendation,
  SeoSuggestion,
  ValidationResult,
} from "../types";

export type SeoPlatformEventMap = {
  "pipeline.started": { ctx: SeoExecutionContext; pipelineId: string };
  "snapshot.requested": { ctx: SeoExecutionContext };
  "snapshot.built": { ctx: SeoExecutionContext; snapshot: ContentSnapshot };
  "suggestion.generated": { ctx: SeoExecutionContext; suggestion: SeoSuggestion };
  "rules.evaluated": { ctx: SeoExecutionContext; rules: RuleResult };
  "validation.completed": { ctx: SeoExecutionContext; validation: ValidationResult };
  "recommendations.ready": {
    ctx: SeoExecutionContext;
    recommendations: SeoRecommendation[];
  };
  "persist.requested": { ctx: SeoExecutionContext; suggestion: SeoSuggestion };
  "persist.completed": { ctx: SeoExecutionContext; entityId: string };
  "pipeline.completed": { ctx: SeoExecutionContext; pipelineId: string };
};

export type SeoPlatformEventType = keyof SeoPlatformEventMap;

export type SeoPlatformEventHandler<T extends SeoPlatformEventType> = (
  payload: SeoPlatformEventMap[T]
) => void | Promise<void>;
