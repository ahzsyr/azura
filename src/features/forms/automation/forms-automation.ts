import "server-only";

import type { InteractionEvent } from "@/platform/schema-ui/manifests/types";
import { expressionEngine } from "@/platform/schema-ui/expressions/evaluator";
import { getFormTemplateById } from "@/features/forms/form-template.service";
import { updateSubmissionWorkflow } from "@/features/forms/form-submission.service";
import { sendFormAdminNotification } from "@/features/email/templates";
import type { FormAutomationRule, FormTemplateDefinition } from "@/features/forms/types";

function ruleMatches(rule: FormAutomationRule, context: Record<string, unknown>): boolean {
  if (!rule.condition?.trim()) return true;
  try {
    return Boolean(expressionEngine.evaluate(rule.condition, context));
  } catch {
    return false;
  }
}

export async function runFormAutomationForEvent(event: InteractionEvent): Promise<void> {
  if (event.type !== "interaction.submitted") return;

  const schemaId = String(event.payload.schemaId ?? "");
  const aggregateId = event.aggregateId;
  if (!schemaId || !aggregateId) return;

  const template = await getFormTemplateById(schemaId);
  if (!template?.definition.automationRules?.length) return;

  const payload = (event.payload.payload as Record<string, unknown>) ?? {};
  const score = Number(event.payload.score ?? 0);
  const context = { ...payload, score };

  for (const rule of template.definition.automationRules) {
    if (rule.event !== "interaction.submitted") continue;
    if (!ruleMatches(rule, context)) continue;

    const workflow: {
      assigneeId?: string;
      pipelineType?: string;
      tags?: string[];
    } = {};

    for (const action of rule.actions) {
      switch (action.type) {
        case "tag":
          workflow.tags = [...(workflow.tags ?? []), ...action.tags];
          break;
        case "assign":
          workflow.assigneeId = action.assigneeId;
          break;
        case "setPipeline":
          workflow.pipelineType = action.pipelineType;
          break;
        case "notify":
          void sendFormAdminNotification({
            to: action.emails,
            templateName: template.name,
            payload,
            submissionId: aggregateId,
            score,
          });
          break;
        default:
          break;
      }
    }

    if (workflow.assigneeId || workflow.pipelineType || workflow.tags?.length) {
      await updateSubmissionWorkflow(aggregateId, workflow);
    }
  }
}

export { parseAutomationRules } from "@/features/forms/lib/automation-rules";
