import type { PipelineMiddleware } from "@/platform/schema-ui/pipeline/command-bus";
import type { FormTemplateDefinition } from "@/features/forms/types";
import { resolveSubmissionEntityRefs } from "@/features/forms/lib/pipeline";

export const formsRoutingMiddleware: PipelineMiddleware = async (ctx, next) => {
  const form = ctx.data.form as FormTemplateDefinition | undefined;
  const parsed = ctx.data.parsed as Record<string, unknown> | undefined;
  const score = ctx.data.score as number | undefined;

  if (form && parsed) {
    ctx.data.entityRefs = resolveSubmissionEntityRefs(form, { values: parsed, score });
  }

  return next();
};
