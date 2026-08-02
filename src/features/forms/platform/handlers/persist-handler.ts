import type { PipelineContext } from "@/platform/schema-ui/pipeline/command-bus";
import type { SubmitCommand } from "@/platform/schema-ui/manifests/types";
import { persistFormSubmission } from "@/features/forms/form-submission.service";
import { resolveSubmissionEntityRefs } from "@/features/forms/lib/pipeline";
import type { FormTemplateDefinition } from "@/features/forms/types";
import type { SubmissionEntityRefs } from "@/features/forms/lib/pipeline";

export async function formsPersistHandler(ctx: PipelineContext): Promise<Record<string, unknown>> {
  const command = ctx.command as SubmitCommand;
  const parsed = ctx.data.parsed as Record<string, unknown> | undefined;
  const score = ctx.data.score as number | undefined;
  const form = ctx.data.form as FormTemplateDefinition | undefined;

  if (!parsed || score == null || !form) {
    throw new Error("Validation and scoring must run before persist");
  }

  const entityRefs = (ctx.data.entityRefs as SubmissionEntityRefs | undefined)
    ?? resolveSubmissionEntityRefs(form, { values: parsed, score });

  const result = await persistFormSubmission(
    {
      templateId: command.schemaId,
      blockType: command.context.blockType,
      blockId: command.context.blockId,
      pageId: command.context.pageId,
      pageSlug: command.context.pageSlug,
      locale: command.context.locale,
      utm: command.context.utm,
      abTestId: command.context.abTestId,
      abVariantId: command.context.abVariantId,
      entityRefs,
    },
    parsed,
    score,
  );

  ctx.data.aggregateId = result.id;
  ctx.data.entityRefs = result.entityRefs;

  return { id: result.id, score: result.score };
}
