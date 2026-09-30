import "server-only";

import "@/platform/schema-ui/init-platform";

import "@/features/forms/platform/register-automation.server";

import { commandBus, composeMiddleware, type PipelineContext } from "@/platform/schema-ui/pipeline/command-bus";
import type { PlatformCommand, SaveDraftCommand } from "@/platform/schema-ui/manifests/types";
import { interactionEventStore } from "@/platform/schema-ui/events/event-store";
import { createInteractionEvent } from "@/platform/schema-ui/events/event-bus";
import { saveFormDraft } from "@/features/forms/form-submission.service";
import {
  FORMS_SUBMIT_MIDDLEWARE,
  formsPersistHandler,
} from "@/features/forms/platform/handlers";

let registered = false;

async function saveDraftHandler(command: PlatformCommand): Promise<Record<string, unknown>> {
  const cmd = command as SaveDraftCommand;
  const draft = await saveFormDraft({
    templateId: cmd.schemaId,
    token: cmd.token,
    payload: cmd.bindingValues,
    currentStep: cmd.currentStep,
  });

  await interactionEventStore.append(
    createInteractionEvent(cmd.schemaId, "interaction.draftSaved", {
      token: draft.token,
      currentStep: cmd.currentStep,
      schemaId: cmd.schemaId,
    }),
  );

  return { token: draft.token, currentStep: draft.currentStep };
}

export function registerFormsPlatformCommands(): void {
  if (registered) return;
  registered = true;

  const submitPipeline = composeMiddleware(
    FORMS_SUBMIT_MIDDLEWARE,
    formsPersistHandler,
  );

  commandBus.register("Submit", async (command) => {
    return submitPipeline({ command, data: {} } as PipelineContext);
  });

  commandBus.register("SaveDraft", saveDraftHandler);
}

registerFormsPlatformCommands();
