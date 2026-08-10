import "@/platform/schema-ui/init-platform";

import { commandBus } from "@/platform/schema-ui/pipeline/command-bus";
import type { SaveDraftCommand, SubmitCommand } from "@/platform/schema-ui/manifests/types";

let registered = false;

async function submitViaApi(command: SubmitCommand): Promise<Record<string, unknown>> {
  const res = await fetch("/api/forms/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      templateId: command.schemaId,
      payload: command.bindingValues,
      blockType: command.context.blockType,
      blockId: command.context.blockId,
      pageId: command.context.pageId,
      pageSlug: command.context.pageSlug,
      locale: command.context.locale,
      utm: command.context.utm,
      abTestId: command.context.abTestId,
      abVariantId: command.context.abVariantId,
      honeypot: command.context.honeypot,
    }),
  });
  if (!res.ok) throw new Error("Submit failed");
  const data = await res.json();
  return { id: data.id, score: data.score };
}

async function saveDraftViaApi(command: SaveDraftCommand): Promise<Record<string, unknown>> {
  const res = await fetch("/api/forms/draft", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      templateId: command.schemaId,
      token: command.token,
      payload: command.bindingValues,
      currentStep: command.currentStep,
    }),
  });
  if (!res.ok) throw new Error("Draft save failed");
  const data = await res.json();
  return { token: data.token, currentStep: data.currentStep };
}

export function registerFormsPlatformCommandsClient(): void {
  if (registered) return;
  registered = true;

  commandBus.register("Submit", (command) => submitViaApi(command as SubmitCommand));
  commandBus.register("SaveDraft", (command) => saveDraftViaApi(command as SaveDraftCommand));
}

registerFormsPlatformCommandsClient();
