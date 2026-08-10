import type {
  SeoRecommendation,
  RuleResult,
  ValidationResult,
  ValidationViolation,
  RuleViolation,
} from "@/features/seo/platform/types";
import type { SeoQualityIssue } from "@/features/seo/quality/types";
import { resolveSeoIssueFix } from "../resolve-seo-issue-fix";
import type {
  SeoIssue,
  SeoIssueCategory,
  SeoIssueFixKind,
  SeoIssueImpact,
  SeoIssueSeverity,
} from "../types";

const SEVERITY_PENALTY: Record<SeoIssueSeverity, number> = {
  critical: 15,
  warn: 8,
  info: 3,
};

function impactFromSeverity(severity: SeoIssueSeverity): SeoIssueImpact {
  if (severity === "critical") return "high";
  if (severity === "warn") return "medium";
  return "low";
}

function fixKindFromSource(source: SeoIssue["source"], actions?: ReadonlyArray<"fix" | "autoFix" | "ignore">): SeoIssueFixKind {
  if (actions?.includes("autoFix")) return "auto";
  if (source === "recommendation") return "ai";
  return "manual";
}

function categoryFromCrawlTitle(title: string, source?: string): SeoIssueCategory {
  const hay = `${title} ${source ?? ""}`.toLowerCase();
  if (hay.includes("schema") || hay.includes("json-ld") || hay.includes("structured")) return "schema";
  if (
    hay.includes("canonical") ||
    hay.includes("redirect") ||
    hay.includes("broken") ||
    hay.includes("crawl") ||
    hay.includes("hreflang") ||
    hay.includes("robots") ||
    hay.includes("sitemap")
  ) {
    return "technical";
  }
  return "technical";
}

function categoryFromValidationField(field?: string): SeoIssueCategory {
  if (!field) return "metadata";
  const f = field.toLowerCase();
  if (f.includes("jsonld") || f.includes("schema")) return "schema";
  if (f.includes("h1") || f.includes("heading") || f.includes("content") || f.includes("word")) {
    return "content";
  }
  return "metadata";
}

function fromQualityIssue(issue: SeoQualityIssue, snapshotId: string): SeoIssue {
  const severity = issue.severity;
  const fix =
    issue.fixHref && issue.fixLabel && issue.suggestion
      ? {
          fixHref: issue.fixHref,
          fixLabel: issue.fixLabel,
          suggestion: issue.suggestion,
        }
      : resolveSeoIssueFix({
          title: issue.title,
          message: issue.message,
          href: issue.href,
          source: issue.source,
        });
  return {
    id: `crawl:${issue.id}`,
    snapshotId,
    severity,
    pageUrl: issue.source ?? issue.href,
    title: issue.title,
    message: issue.message,
    category: categoryFromCrawlTitle(issue.title, issue.source),
    impact: impactFromSeverity(severity),
    fixKind: "manual",
    status: "open",
    source: "crawl",
    scorePenalty: SEVERITY_PENALTY[severity],
    analyzerIds: issue.source ? [issue.source] : undefined,
    fixHref: fix?.fixHref,
    fixLabel: fix?.fixLabel,
    suggestion: fix?.suggestion,
  };
}

function fromValidationViolation(
  v: ValidationViolation,
  snapshotId: string | undefined,
  entity?: { entityType: string; entityId: string; locale: string },
): SeoIssue {
  const fix = resolveSeoIssueFix({
    title: v.field ? `Validation: ${v.field}` : "SEO validation",
    message: v.message,
    entityType: entity?.entityType,
    entityId: entity?.entityId,
  });
  return {
    id: `validation:${v.id}`,
    snapshotId,
    severity: v.severity,
    entityType: entity?.entityType,
    entityId: entity?.entityId,
    locale: entity?.locale,
    title: v.field ? `Validation: ${v.field}` : "SEO validation",
    message: v.message,
    category: categoryFromValidationField(v.field),
    impact: impactFromSeverity(v.severity),
    fixKind: "manual",
    status: "open",
    source: "validation",
    scorePenalty: SEVERITY_PENALTY[v.severity],
    fixHref: fix?.fixHref,
    fixLabel: fix?.fixLabel,
    suggestion: fix?.suggestion,
  };
}

function fromRuleViolation(
  v: RuleViolation,
  snapshotId: string | undefined,
  entity?: { entityType: string; entityId: string; locale: string },
): SeoIssue {
  const fix = resolveSeoIssueFix({
    title: `Rule: ${v.ruleId}`,
    message: v.message,
    entityType: entity?.entityType,
    entityId: entity?.entityId,
  });
  return {
    id: `rule:${v.ruleId}`,
    snapshotId,
    severity: v.severity,
    entityType: entity?.entityType,
    entityId: entity?.entityId,
    locale: entity?.locale,
    title: `Rule: ${v.ruleId}`,
    message: v.message,
    category: v.ruleId.includes("schema") || v.ruleId.includes("og") ? "schema" : "content",
    impact: impactFromSeverity(v.severity),
    fixKind: "manual",
    status: "open",
    source: "rule",
    scorePenalty: SEVERITY_PENALTY[v.severity],
    ruleIds: [v.ruleId],
    fixHref: fix?.fixHref,
    fixLabel: fix?.fixLabel,
    suggestion: fix?.suggestion,
  };
}

function fromRecommendation(
  r: SeoRecommendation,
  snapshotId: string | undefined,
  entity?: { entityType: string; entityId: string; locale: string },
): SeoIssue {
  const fix = resolveSeoIssueFix({
    title: r.message.slice(0, 80) || "Recommended improvement",
    message: r.message,
    entityType: entity?.entityType,
    entityId: entity?.entityId,
  });
  return {
    id: `recommendation:${r.id}`,
    snapshotId,
    severity: r.severity,
    entityType: entity?.entityType,
    entityId: entity?.entityId,
    locale: entity?.locale,
    title: r.message.slice(0, 80) || "Recommended improvement",
    message: r.message,
    category: r.derivedFrom.includes("signals")
      ? "content"
      : r.suggestedFix?.jsonLd
        ? "schema"
        : "metadata",
    impact: impactFromSeverity(r.severity),
    fixKind: fixKindFromSource("recommendation", r.actions),
    status: "open",
    source: "recommendation",
    scorePenalty: SEVERITY_PENALTY[r.severity],
    fixHref: fix?.fixHref,
    fixLabel: fix?.fixLabel,
    suggestion: fix?.suggestion,
  };
}

export function buildIssuesFromQualityReport(
  issues: SeoQualityIssue[],
  snapshotId: string,
): SeoIssue[] {
  return issues.map((issue) => fromQualityIssue(issue, snapshotId));
}

export function buildIssuesFromEntityAudit(input: {
  snapshotId?: string;
  entityType: string;
  entityId: string;
  locale: string;
  validation: ValidationResult;
  rules: RuleResult;
  recommendations: ReadonlyArray<SeoRecommendation>;
}): SeoIssue[] {
  const entity = {
    entityType: input.entityType,
    entityId: input.entityId,
    locale: input.locale,
  };
  return [
    ...input.validation.violations.map((v) =>
      fromValidationViolation(v, input.snapshotId, entity),
    ),
    ...input.rules.violations.map((v) => fromRuleViolation(v, input.snapshotId, entity)),
    ...input.recommendations.map((r) => fromRecommendation(r, input.snapshotId, entity)),
  ];
}

export function filterIssues(issues: SeoIssue[], filter: {
  severity?: SeoIssueSeverity;
  category?: SeoIssue["category"];
  source?: SeoIssue["source"];
  status?: SeoIssue["status"];
}): SeoIssue[] {
  return issues.filter((issue) => {
    if (filter.severity && issue.severity !== filter.severity) return false;
    if (filter.category && issue.category !== filter.category) return false;
    if (filter.source && issue.source !== filter.source) return false;
    if (filter.status && issue.status !== filter.status) return false;
    return true;
  });
}

export function countIssuesBySeverity(issues: SeoIssue[]) {
  return {
    critical: issues.filter((i) => i.severity === "critical" && i.status === "open").length,
    warn: issues.filter((i) => i.severity === "warn" && i.status === "open").length,
    info: issues.filter((i) => i.severity === "info" && i.status === "open").length,
  };
}

export { SEVERITY_PENALTY };
