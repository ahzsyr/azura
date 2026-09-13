import type { PipelineMiddleware } from "@/platform/schema-ui/pipeline/command-bus";
import type { FormTemplateDefinition } from "@/features/forms/types";
import { scoreSubmission } from "@/features/forms/lib/scoring";

export const formsScoringMiddleware: PipelineMiddleware = async (ctx, next) => {
  const form = ctx.data.form as FormTemplateDefinition | undefined;
  const parsed = ctx.data.parsed as Record<string, unknown> | undefined;
  if (!form || !parsed) throw new Error("Validation must run before scoring");

  ctx.data.score = scoreSubmission(form, parsed);
  return next();
};
