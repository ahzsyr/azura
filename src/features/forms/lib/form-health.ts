import type { DocumentExtensions } from "@/features/forms/lib/document-envelope";
import type { SchemaDocument } from "@/platform/schema-ui/schema/schema-document";

export type FormHealthIssue = {
  id: string;
  severity: "error" | "warning";
  message: string;
  bindingId?: string;
  stepId?: string;
};

export function analyzeFormHealth(
  document: SchemaDocument,
  extensions: DocumentExtensions = {},
): FormHealthIssue[] {
  const issues: FormHealthIssue[] = [];
  const bindingIds = new Set<string>();
  const labelsSeen = new Map<string, string>();

  for (const binding of document.bindings) {
    if (bindingIds.has(binding.bindingId)) {
      issues.push({
        id: `dup-${binding.bindingId}`,
        severity: "error",
        message: `Duplicate field ID: ${binding.bindingId}`,
        bindingId: binding.bindingId,
      });
    }
    bindingIds.add(binding.bindingId);

    const label = String(binding.presentation.label ?? "").trim();
    if (!label && binding.componentType !== "hiddenField") {
      issues.push({
        id: `label-${binding.bindingId}`,
        severity: "warning",
        message: `Field "${binding.bindingId}" has no label`,
        bindingId: binding.bindingId,
      });
      issues.push({
        id: `a11y-label-${binding.bindingId}`,
        severity: "warning",
        message: `Missing accessible label on ${binding.bindingId}`,
        bindingId: binding.bindingId,
      });
    } else if (label) {
      const key = label.toLowerCase();
      if (labelsSeen.has(key)) {
        issues.push({
          id: `a11y-dup-${binding.bindingId}`,
          severity: "warning",
          message: `Duplicate accessible name "${label}"`,
          bindingId: binding.bindingId,
        });
      } else {
        labelsSeen.set(key, binding.bindingId);
      }
    }

    if (
      (binding.componentType === "selectField" || binding.componentType === "radioField") &&
      !(Array.isArray(binding.data.options) && binding.data.options.length > 0)
    ) {
      issues.push({
        id: `options-${binding.bindingId}`,
        severity: "warning",
        message: `${label || binding.bindingId} has no options`,
        bindingId: binding.bindingId,
      });
    }

    if (binding.componentType === "hiddenField") {
      const defaultValue = binding.data.defaultValue;
      const hasDefault = defaultValue != null && String(defaultValue).length > 0;
      const referenced = (document.rules ?? []).some(
        (r) =>
          r.expression.includes(binding.bindingId) ||
          r.actions.some((a) => a.bindingId === binding.bindingId),
      );
      if (!hasDefault && !referenced) {
        issues.push({
          id: `hidden-${binding.bindingId}`,
          severity: "warning",
          message: `Hidden field "${binding.bindingId}" appears unused`,
          bindingId: binding.bindingId,
        });
      }
    }
  }

  for (const step of document.steps ?? []) {
    if (step.bindingIds.length === 0) {
      issues.push({
        id: `step-empty-${step.id}`,
        severity: "warning",
        message: `Step "${step.title}" contains no fields`,
        stepId: step.id,
      });
    }
    for (const id of step.bindingIds) {
      if (!bindingIds.has(id)) {
        issues.push({
          id: `step-missing-${step.id}-${id}`,
          severity: "error",
          message: `Step "${step.title}" references missing field ${id}`,
          stepId: step.id,
          bindingId: id,
        });
      }
    }
  }

  for (const rule of document.rules ?? []) {
    for (const action of rule.actions) {
      if (!bindingIds.has(action.bindingId)) {
        issues.push({
          id: `rule-${rule.id}-${action.bindingId}`,
          severity: "error",
          message: `Conditional rule references missing field ${action.bindingId}`,
          bindingId: action.bindingId,
        });
      }
    }
    const match = rule.expression.match(/([a-zA-Z0-9_-]+)\s*(===|!==|==|!=|contains)/);
    if (match && !bindingIds.has(match[1]!)) {
      issues.push({
        id: `rule-expr-${rule.id}`,
        severity: "error",
        message: `Conditional expression references missing field ${match[1]}`,
        bindingId: match[1],
      });
    }
  }

  for (const scoring of extensions.scoringRules ?? []) {
    if (!bindingIds.has(scoring.fieldId)) {
      issues.push({
        id: `score-${scoring.fieldId}`,
        severity: "warning",
        message: `Scoring rule references missing field ${scoring.fieldId}`,
        bindingId: scoring.fieldId,
      });
    }
  }

  for (const auto of extensions.automationRules ?? []) {
    const condition = auto.condition ?? "";
    const match = condition.match(/([a-zA-Z0-9_-]+)/);
    if (match && condition && !bindingIds.has(match[1]!)) {
      issues.push({
        id: `auto-${auto.id}`,
        severity: "warning",
        message: `Automation references deleted or missing field ${match[1]}`,
        bindingId: match[1],
      });
    }
  }

  return issues;
}

export function hasBlockingHealthIssues(issues: FormHealthIssue[]): boolean {
  return issues.some((i) => i.severity === "error");
}
