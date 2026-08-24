import type { DocumentExtensions } from "@/features/forms/lib/document-envelope";
import type { SchemaDocument } from "@/platform/schema-ui/schema/schema-document";
import { analyzeFormHealth, type FormHealthIssue } from "@/features/forms/lib/form-health";

export type HealthDimension = {
  id: "overall" | "performance" | "accessibility" | "automation";
  label: string;
  score: number;
  status: "excellent" | "good" | "needs_work" | "critical";
  detail: string;
};

export type FormHealthReport = {
  issues: FormHealthIssue[];
  dimensions: HealthDimension[];
  overall: number;
  overallLabel: string;
};

function statusFor(score: number): HealthDimension["status"] {
  if (score >= 90) return "excellent";
  if (score >= 75) return "good";
  if (score >= 50) return "needs_work";
  return "critical";
}

function labelFor(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 50) return "Needs work";
  return "Critical";
}

export function computeFormHealthReport(
  document: SchemaDocument,
  extensions: DocumentExtensions = {},
  opts?: { fieldCompletionRates?: Record<string, number> },
): FormHealthReport {
  const issues = analyzeFormHealth(document, extensions);
  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;

  const a11yIssues = issues.filter(
    (i) =>
      i.id.startsWith("label-") ||
      i.id.startsWith("a11y-") ||
      i.message.toLowerCase().includes("label") ||
      i.message.toLowerCase().includes("accessible"),
  );
  const automationIssues = issues.filter(
    (i) => i.id.startsWith("auto-") || i.id.startsWith("score-") || i.id.startsWith("rule-"),
  );

  let overall = 100;
  overall -= errors * 18;
  overall -= warnings * 6;
  overall = Math.max(0, Math.min(100, overall));

  const a11yScore = Math.max(0, 100 - a11yIssues.length * 12);
  const automationScore =
    automationIssues.length === 0 ? 100 : Math.max(0, 100 - automationIssues.filter((i) => i.severity === "error").length * 25 - automationIssues.filter((i) => i.severity === "warning").length * 10);

  let performanceScore = 80;
  const emptySteps = (document.steps ?? []).filter((s) => s.bindingIds.length === 0).length;
  performanceScore -= emptySteps * 15;
  const rates = opts?.fieldCompletionRates;
  if (rates && Object.keys(rates).length > 0) {
    const avg = Object.values(rates).reduce((a, b) => a + b, 0) / Object.values(rates).length;
    performanceScore = Math.round(avg);
  } else if (document.bindings.length === 0) {
    performanceScore = 40;
  } else {
    performanceScore = Math.max(40, performanceScore);
  }
  performanceScore = Math.max(0, Math.min(100, performanceScore));

  const dimensions: HealthDimension[] = [
    {
      id: "overall",
      label: "Health",
      score: overall,
      status: statusFor(overall),
      detail: labelFor(overall),
    },
    {
      id: "performance",
      label: "Performance",
      score: performanceScore,
      status: statusFor(performanceScore),
      detail: labelFor(performanceScore),
    },
    {
      id: "accessibility",
      label: "Accessibility",
      score: a11yScore,
      status: statusFor(a11yScore),
      detail: a11yIssues.length ? `${a11yIssues.length} warning${a11yIssues.length === 1 ? "" : "s"}` : "Healthy",
    },
    {
      id: "automation",
      label: "Automation",
      score: automationScore,
      status: statusFor(automationScore),
      detail: automationIssues.length ? `${automationIssues.length} issue${automationIssues.length === 1 ? "" : "s"}` : "Healthy",
    },
  ];

  return {
    issues,
    dimensions,
    overall,
    overallLabel: labelFor(overall),
  };
}
