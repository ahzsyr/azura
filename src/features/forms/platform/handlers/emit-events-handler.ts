import type { PipelineContext, PipelineMiddleware } from "@/platform/schema-ui/pipeline/command-bus";
import type { SubmitCommand } from "@/platform/schema-ui/manifests/types";
import { destinationRegistry } from "@/platform/schema-ui/registry/destination-registry";
import { appendInteractionEvent } from "@/features/forms/interaction-event.service";
import { getFormTemplateById } from "@/features/forms/form-template.service";
import { dispatchFormDestinations } from "@/features/forms/destinations/form-destinations";
import type { SubmissionEntityRefs } from "@/features/forms/lib/pipeline";

export const formsEmitEventsMiddleware: PipelineMiddleware = async (ctx, next) => {
  const result = await next();
  const command = ctx.command as SubmitCommand;
  const aggregateId = ctx.data.aggregateId as string | undefined;
  const parsed = ctx.data.parsed as Record<string, unknown> | undefined;
  const score = ctx.data.score as number | undefined;
  const entityRefs = ctx.data.entityRefs as SubmissionEntityRefs | undefined;

  if (!aggregateId || !parsed || score == null) return result;

  await appendInteractionEvent(aggregateId, "interaction.created", {
    schemaId: command.schemaId,
  });

  await appendInteractionEvent(aggregateId, "interaction.submitted", {
    payload: parsed,
    score,
    schemaId: command.schemaId,
  });

  if (entityRefs?.assigneeId) {
    await appendInteractionEvent(aggregateId, "interaction.assigned", {
      assigneeId: entityRefs.assigneeId,
      schemaId: command.schemaId,
    });
  }

  if (entityRefs?.tags && entityRefs.tags.length > 0) {
    await appendInteractionEvent(aggregateId, "interaction.tagged", {
      tags: entityRefs.tags,
      schemaId: command.schemaId,
    });
  }

  return result;
};

export const formsDestinationMiddleware: PipelineMiddleware = async (ctx, next) => {
  const result = await next();
  const command = ctx.command as SubmitCommand;
  const aggregateId = ctx.data.aggregateId as string | undefined;
  const parsed = ctx.data.parsed as Record<string, unknown> | undefined;
  const score = ctx.data.score as number | undefined;

  if (!aggregateId || !parsed) return result;

  for (const destination of destinationRegistry.list()) {
    await destination.dispatch({
      aggregateId,
      schemaId: command.schemaId,
      payload: parsed,
      config: {},
    });
  }

  const template = await getFormTemplateById(command.schemaId);
  if (template && score != null) {
    await dispatchFormDestinations(template.definition.destinations, {
      templateName: template.name,
      payload: parsed,
      submissionId: aggregateId,
      score,
    });
  }

  return result;
};
