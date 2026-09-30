import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyTaskStatuses, countTasksBySeverity, operationalTasks, taskFromIssue } from "../task-builder";
import type { SeoIssue } from "@/features/seo/workspace/types";

function issue(partial: Partial<SeoIssue>): SeoIssue {
  return {
    id: "1",
    severity: "critical",
    title: "Missing canonical",
    message: "This page has no canonical URL.",
    category: "technical",
    impact: "high",
    fixKind: "manual",
    status: "open",
    source: "crawl",
    ...partial,
  };
}

describe("SeoTask builder", () => {
  it("maps workspace issues into operator tasks without exposing engines", () => {
    const task = taskFromIssue(issue({}));
    assert.equal(task.severity, "critical");
    assert.equal(task.source, "crawl-check");
    assert.ok(task.whyItMatters);
    assert.equal(task.id, "issue:1");
  });

  it("maps recommendation issues so Tasks can filter source=recommendation", () => {
    const task = taskFromIssue(issue({ source: "recommendation", severity: "info" }));
    assert.equal(task.source, "recommendation");
    assert.equal(task.severity, "recommended");
  });

  it("creates operational checks from live SEO state", () => {
    const tasks = operationalTasks({
      lastAuditAt: null,
      pendingSubmissions: 12,
      failedSubmissions: 1,
      metadataNeedingAttention: 5,
      sitemapUrlCount: 0,
    });
    assert.ok(tasks.some((t) => t.id === "scheduled:run-site-audit"));
    assert.ok(tasks.some((t) => t.id === "scheduled:pending-submissions"));
    assert.ok(tasks.some((t) => t.type === "indexing"));
  });

  it("applies stored task status without changing the issue engine", () => {
    const tasks = applyTaskStatuses(
      [taskFromIssue(issue({}))],
      { "issue:1": "ignored" },
    );
    assert.equal(tasks[0].status, "ignored");
    assert.deepEqual(countTasksBySeverity(tasks), {
      critical: 0,
      important: 0,
      recommended: 0,
    });
  });
});
