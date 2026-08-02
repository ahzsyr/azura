import type { OperationsEngine } from "../operations";
import type { SearchIntelligencePlatform } from "../platform";
import { simulateSearchImpact } from "../impact";
import { ORGANIZATION_CORE_PROPERTIES, readPropertyValue } from "../entity-graph";
import type { GraphEntity } from "../types";

export type WorkspaceId =
  | "overview"
  | "operations"
  | "pages"
  | "entities"
  | "content"
  | "google"
  | "monitoring"
  | "automation"
  | "settings";

export type RecommendedAction = {
  id: string;
  label: string;
  definitionId: string;
  severity: "critical" | "warn" | "info";
  reason: string;
  href?: string;
};

export type CommandCenterVm = {
  healthScore: number;
  criticalIssues: number;
  warnings: number;
  automationHealthy: boolean;
  lastCrawlLabel: string;
  urlsIndexed: number;
  richResultsPct: number;
  knowledgeReadiness: number;
  queue: ReturnType<OperationsEngine["summarize"]>;
  recommended: RecommendedAction[];
};

export type KnowledgeReadinessItem = {
  category: string;
  status: "ok" | "warn" | "missing";
  actionLabel: string;
  href?: string;
};

export type UrlInspectorVm = {
  url: string;
  indexed: boolean;
  lastCrawledLabel: string;
  canonical: string;
  richResults: "valid" | "invalid" | "unknown";
  breadcrumbValid: boolean;
  faqValid: boolean;
  mobileFriendly: boolean;
  cwv: "good" | "needs_improvement" | "poor";
};

function knowledgeScore(org: GraphEntity | null): number {
  if (!org) return 35;
  let score = 50;
  for (const key of ORGANIZATION_CORE_PROPERTIES) {
    if (readPropertyValue(org, key) != null) score += 5;
  }
  const sameAs = readPropertyValue<string[]>(org, "sameAs") ?? [];
  score += Math.min(15, sameAs.length * 3);
  return Math.min(100, score);
}

export function buildCommandCenter(input: {
  platform: SearchIntelligencePlatform;
  operations: OperationsEngine;
}): CommandCenterVm {
  const issues = input.platform.issues.list().filter((i) => !i.resolvedAt);
  const criticalIssues = issues.filter((i) => i.severity === "critical").length;
  const warnings = issues.filter((i) => i.severity === "warn").length;
  const queue = input.operations.summarize();

  const healthScore = Math.max(
    0,
    Math.min(100, 100 - criticalIssues * 12 - warnings * 2 - queue.failed * 5),
  );

  const recommended: RecommendedAction[] = [];
  if (criticalIssues > 0) {
    recommended.push({
      id: "fix-critical",
      label: `Fix ${criticalIssues} critical page${criticalIssues === 1 ? "" : "s"}`,
      definitionId: "page.inspect_url",
      severity: "critical",
      reason: "Critical crawl/index issues reduce discoverability.",
      href: "/admin/seo/search-operations/pages",
    });
  }
  if (queue.waiting_approval > 0) {
    recommended.push({
      id: "approve-ops",
      label: `Approve ${queue.waiting_approval} waiting operation${queue.waiting_approval === 1 ? "" : "s"}`,
      definitionId: "ai.apply_metadata",
      severity: "warn",
      reason: "Approved operations unblock schema and content updates.",
      href: "/admin/seo/search-operations/operations",
    });
  }
  recommended.push({
    id: "submit-urls",
    label: "Submit priority URLs",
    definitionId: "google.request_indexing",
    severity: "info",
    reason: "Request indexing for updated pages.",
    href: "/admin/seo/search-operations/google",
  });
  recommended.push({
    id: "resolve-entity",
    label: "Resolve entity conflicts",
    definitionId: "entity.validate",
    severity: "warn",
    reason: "Entity consistency improves Knowledge Panel readiness.",
    href: "/admin/seo/search-operations/entities",
  });
  recommended.push({
    id: "perf-scan",
    label: "Run performance scan",
    definitionId: "google.run_pagespeed",
    severity: "info",
    reason: "CWV regressions can suppress CTR.",
    href: "/admin/seo/search-operations/monitoring",
  });

  return {
    healthScore,
    criticalIssues,
    warnings,
    automationHealthy: queue.failed === 0,
    lastCrawlLabel: "2 hours ago",
    urlsIndexed: 0,
    richResultsPct: 98,
    knowledgeReadiness: 78,
    queue,
    recommended,
  };
}

export async function buildCommandCenterAsync(input: {
  platform: SearchIntelligencePlatform;
  operations: OperationsEngine;
}): Promise<CommandCenterVm> {
  const base = buildCommandCenter(input);
  const orgs = await input.platform.query.findByType("Organization");
  const readiness = knowledgeScore(orgs[0] ?? null);
  const indexation = input.platform.indexation.list({ state: "indexed" });
  return {
    ...base,
    knowledgeReadiness: readiness,
    urlsIndexed: Math.max(indexation.length, base.urlsIndexed),
  };
}

export function buildKnowledgeReadinessChecklist(org: GraphEntity | null): {
  score: number;
  items: KnowledgeReadinessItem[];
  recommendations: string[];
} {
  const items: KnowledgeReadinessItem[] = [
    {
      category: "Organization Schema",
      status: org ? "ok" : "missing",
      actionLabel: org ? "View" : "Create",
      href: "/admin/seo/search-operations/entities",
    },
    {
      category: "Logo",
      status: org && readPropertyValue(org, "logo") ? "ok" : "warn",
      actionLabel: "Replace",
      href: "/admin/seo/search-operations/entities",
    },
    {
      category: "Google Business Profile",
      status: "warn",
      actionLabel: "Connect",
      href: "/admin/seo/search-operations/google",
    },
    {
      category: "NAP Consistency",
      status: org && readPropertyValue(org, "phone") && readPropertyValue(org, "address") ? "ok" : "warn",
      actionLabel: "Fix",
      href: "/admin/seo/search-operations/entities",
    },
    {
      category: "sameAs Links",
      status: ((readPropertyValue<string[]>(org ?? ({ properties: {} } as GraphEntity), "sameAs") ?? []).length > 0
        ? "ok"
        : "warn"),
      actionLabel: "Add Profiles",
      href: "/admin/seo/search-operations/entities",
    },
    {
      category: "Wikidata",
      status: "missing",
      actionLabel: "Add",
    },
    {
      category: "Merchant Center",
      status: "warn",
      actionLabel: "Configure",
      href: "/admin/seo/search-operations/google",
    },
    {
      category: "Search Console",
      status: "ok",
      actionLabel: "Open",
      href: "/admin/seo/search-operations/google",
    },
    {
      category: "Reviews",
      status: "warn",
      actionLabel: "Improve",
      href: "/admin/seo/search-operations/monitoring",
    },
    {
      category: "Rich Results",
      status: "ok",
      actionLabel: "Validate",
      href: "/admin/seo/search-operations/pages",
    },
  ];

  const score = knowledgeScore(org);
  const recommendations = items
    .filter((i) => i.status !== "ok")
    .map((i) => `${i.actionLabel} ${i.category}`);

  return { score, items, recommendations };
}

export function buildUrlInspector(url: string): UrlInspectorVm {
  return {
    url,
    indexed: true,
    lastCrawledLabel: "2 days ago",
    canonical: url,
    richResults: "valid",
    breadcrumbValid: true,
    faqValid: true,
    mobileFriendly: true,
    cwv: "good",
  };
}

export function buildSerpPreview(input: {
  title: string;
  description: string;
  url: string;
  siteName?: string;
}) {
  const titleTooLong = input.title.length > 60;
  const descriptionTruncated = input.description.length > 160;
  return {
    siteName: input.siteName ?? new URL(input.url).hostname,
    title: input.title,
    description: input.description.slice(0, 160),
    displayUrl: input.url.replace(/^https?:\/\//, ""),
    warnings: [
      ...(titleTooLong ? ["Title Too Long"] : []),
      ...(descriptionTruncated ? ["Description Truncated"] : []),
    ],
    ctrPrediction: titleTooLong || descriptionTruncated ? "Low" : "Average",
  };
}

export { simulateSearchImpact };
