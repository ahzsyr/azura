import type { SubmitCommand } from "../manifests/types";
import { commandBus } from "../pipeline/command-bus";

export class SubmissionEngine {
  async submit(command: SubmitCommand): Promise<Record<string, unknown>> {
    return commandBus.execute("Submit", command);
  }
}

export class DraftManager {
  async saveDraft(input: {
    schemaId: string;
    token?: string;
    bindingValues: Record<string, unknown>;
    currentStep: number;
  }): Promise<Record<string, unknown>> {
    return commandBus.execute("SaveDraft", {
      type: "SaveDraft",
      schemaId: input.schemaId,
      token: input.token,
      bindingValues: input.bindingValues,
      currentStep: input.currentStep,
    });
  }
}
