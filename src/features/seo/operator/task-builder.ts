import type { SeoIssue } from "@/features/seo/workspace/types";
import type {
  SeoTask,
  SeoTaskSeverity,
  SeoTaskSource,
  SeoTaskStatus,
  SeoTaskType,
} from "./types";

const WHY: Record<string, string> = {
  metadata:
    "Search engines may generate their own title or description, which is often less accurate.",
  technical: "Technical problems can block crawling or send mixed signals about the preferred URL.",
  schema: "Incomplete structured data can prevent rich results from appearing in search.",
  content: "Thin or unclear content makes it harder for people and search engines to understand the page.",
  other: "Fixing this improves how search engines understand and rank the site.",
  submission: "Pages that are not submitted may take longer to appear in search results.",
  sitemap: "An outdated sitemap means search engines may miss new or changed pages.",
  audit: "A current site audit is the fastest way to see what needs attention.",
};

function severityFromIssue(severity: SeoIssue["severity"]): SeoTaskSeverity {
  if (severity === "critical") return "critical";
  if (severity === "warn") return "important";
  return "recommended";
}

function typeFromIssue(issue: SeoIssue): SeoTaskType {
  if (issue.severity === "critical") return "critical-issue";
  if (issue.category === "metadata") return "metadata";
  if (issue.category === "schema") return "schema";
  if (issue.category === "content") return "content";
  if (issue.category === "technical") return "technical";
  return "technical";
}

function sourceFromIssue(issue: SeoIssue): SeoTaskSource {
  if (issue.source === "recommendation") return "recommendation";
  if (issue.source === "crawl") return "crawl-check";
  return "workspace-issue";
}

export function taskFromIssue(
  issue: SeoIssue,
  status: SeoTaskStatus = "open",
): SeoTask {
  const category = issue.category;
  return {
    id: `issue:${issue.id}`,
    type: typeFromIssue(issue),
    severity: severityFromIssue(issue.severity),
    title: issue.title,
    description: issue.message,
    whyItMatters: issue.suggestion ?? WHY[category] ?? WHY.other,
    source: sourceFromIssue(issue),
    entity: {
      type: issue.entityType ?? "page",
      id: issue.entityId,
      url: issue.pageUrl,
    },
    action: issue.fixHref
      ? { label: issue.fixLabel ?? "Fix", href: issue.fixHref }
      : { label: "Review", href: "/admin/seo/tasks" },
    status: issue.status === "resolved" ? "completed" : status,
    createdAt: new Date().toISOString(),
    issueId: issue.id,
    category,
  };
}

export function operationalTasks(input: {
  lastAuditAt?: string | null;
  pendingSubmissions: number;
  failedSubmissions: number;
  metadataNeedingAttention: number;
  sitemapUrlCount: number;
}): SeoTask[] {
  const now = new Date();
  const tasks: SeoTask[] = [];
  const lastAudit = input.lastAuditAt ? new Date(input.lastAuditAt) : null;
  const auditAgeHours = lastAudit
    ? (now.getTime() - lastAudit.getTime()) / (1000 * 60 * 60)
    : Number.POSITIVE_INFINITY;

  if (!lastAudit || auditAgeHours > 24) {
    tasks.push({
      id: "scheduled:run-site-audit",
      type: "audit",
      severity: lastAudit ? "important" : "critical",
      title: lastAudit ? "Run a site audit" : "Run your first site audit",
      description: lastAudit
        ? "The last site audit is more than a day old."
        : "There is no site audit yet. Run one to see what needs attention.",
      whyItMatters: WHY.audit,
      source: "audit",
      action: { label: "Run audit", href: "/admin/seo/audit" },
      status: "open",
      createdAt: now.toISOString(),
      dueAt: now.toISOString(),
    });
  }

  if (input.failedSubmissions > 0) {
    tasks.push({
      id: "scheduled:failed-submissions",
      type: "indexing",
      severity: "critical",
      title: `Review ${input.failedSubmissions} failed URL submission${input.failedSubmissions === 1 ? "" : "s"}`,
      description: "Some URLs did not reach search engines.",
      whyItMatters: WHY.submission,
      source: "submission",
      action: { label: "Review submissions", href: "/admin/seo/integrations" },
      status: "open",
      createdAt: now.toISOString(),
    });
  }

  if (input.pendingSubmissions > 0) {
    tasks.push({
      id: "scheduled:pending-submissions",
      type: "indexing",
      severity: "important",
      title: `Submit ${input.pendingSubmissions} waiting URL${input.pendingSubmissions === 1 ? "" : "s"}`,
      description: "These URLs are ready to send to search engines.",
      whyItMatters: WHY.submission,
      source: "submission",
      action: {
        label: "Submit URLs",
        href: "/admin/seo/integrations",
        actionId: "submit-pending",
      },
      status: "open",
      createdAt: now.toISOString(),
    });
  }

  if (input.metadataNeedingAttention > 0) {
    tasks.push({
      id: "scheduled:metadata-attention",
      type: "metadata",
      severity: "important",
      title: `Review ${input.metadataNeedingAttention} page${input.metadataNeedingAttention === 1 ? "" : "s"} that need metadata`,
      description: "Titles or descriptions are missing or too long.",
      whyItMatters: WHY.metadata,
      source: "metadata",
      action: { label: "Review metadata", href: "/admin/seo/metadata" },
      status: "open",
      createdAt: now.toISOString(),
    });
  }

  if (input.sitemapUrlCount === 0) {
    tasks.push({
      id: "scheduled:sitemap-empty",
      type: "sitemap",
      severity: "important",
      title: "Check the sitemap",
      description: "The sitemap currently has no URLs.",
      whyItMatters: WHY.sitemap,
      source: "sitemap",
      action: { label: "View sitemap", href: "/admin/seo/sitemap" },
      status: "open",
      createdAt: now.toISOString(),
    });
  }

  return tasks;
}

export function applyTaskStatuses(
  tasks: SeoTask[],
  statuses: Record<string, SeoTaskStatus>,
): SeoTask[] {
  return tasks.map((task) => {
    const next = statuses[task.id];
    return next ? { ...task, status: next } : task;
  });
}

export function countTasksBySeverity(tasks: SeoTask[]): {
  critical: number;
  important: number;
  recommended: number;
} {
  const open = tasks.filter((task) => task.status === "open");
  return {
    critical: open.filter((task) => task.severity === "critical").length,
    important: open.filter((task) => task.severity === "important").length,
    recommended: open.filter((task) => task.severity === "recommended").length,
  };
}
