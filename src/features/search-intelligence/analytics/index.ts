import type { SearchIntelligenceIssue } from "../types";
import type { ConnectorHealth } from "../types";
import type { PageAuditScore } from "../ai";
import type { AuthorityReport } from "../authority";
import type { PerformanceCorrelation } from "../performance";

export type SearchIntelligenceDashboard = {
  issueCounts: Record<SearchIntelligenceIssue["severity"], number>;
  openIssues: number;
  resolvedIssues: number;
  connectorHealth: ConnectorHealth[];
  averageAuditScore: number | null;
  authorityScore: number | null;
  highPerfRiskPages: number;
  generatedAt: string;
};

export function buildAnalyticsDashboard(input: {
  issues: SearchIntelligenceIssue[];
  connectors: ConnectorHealth[];
  audits?: PageAuditScore[];
  authority?: AuthorityReport | null;
  performance?: PerformanceCorrelation[];
}): SearchIntelligenceDashboard {
  const issueCounts = { critical: 0, warn: 0, info: 0 };
  let resolvedIssues = 0;
  for (const issue of input.issues) {
    if (issue.resolvedAt) {
      resolvedIssues += 1;
      continue;
    }
    issueCounts[issue.severity] += 1;
  }

  const audits = input.audits ?? [];
  const averageAuditScore =
    audits.length === 0 ? null : Math.round(audits.reduce((sum, a) => sum + a.total, 0) / audits.length);

  return {
    issueCounts,
    openIssues: issueCounts.critical + issueCounts.warn + issueCounts.info,
    resolvedIssues,
    connectorHealth: input.connectors,
    averageAuditScore,
    authorityScore: input.authority?.score ?? null,
    highPerfRiskPages: (input.performance ?? []).filter((p) => p.risk === "high").length,
    generatedAt: new Date().toISOString(),
  };
}
