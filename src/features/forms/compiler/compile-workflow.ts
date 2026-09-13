import type { FormTemplateDefinition } from "@/features/forms/types";
import type { DocumentExtensions } from "@/features/forms/lib/document-envelope";

/** Project workflow / destination extensions into the runtime definition. */
export function compileWorkflow(extensions: DocumentExtensions = {}): Partial<FormTemplateDefinition> {
  return {
    scoringRules: extensions.scoringRules,
    notifications: extensions.notifications,
    webhooks: extensions.webhooks,
    pipeline: extensions.pipeline,
    routingRules: extensions.routingRules,
    destinations: extensions.destinations,
    automationRules: extensions.automationRules,
    allowedAdminIds: extensions.allowedAdminIds,
    abTests: extensions.abTests,
  };
}
