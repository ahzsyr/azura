import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildIssuesFromQualityReport, filterIssues, countIssuesBySeverity } from "../builders/issue-builder";
import { buildUnifiedScore, CATEGORY_WEIGHTS } from "../builders/score-builder";
import { buildOverviewVm } from "../builders/overview-builder";
import { buildTechnicalAuditVm } from "../builders/technical-builder";
import type { SeoAuditSnapshotRecord } from "../types";
import { SEO_PIPELINE_VERSION } from "../types";

describe("SEO workspace issue + score builders", () => {
  it("normalizes quality issues into canonical Issues", () => {
    const issues = buildIssuesFromQualityReport(
      [
        {
          id: "canon-1",
          title: "Duplicate canonical",
          severity: "critical",
          message: "Two pages claim the same canonical",
          href: "/a",
        },
        {
          id: "schema-1",
          title: "Schema missing @type",
          severity: "warn",
          message: "Product schema incomplete",
        },
      ],
      "snap-1",
    );

    assert.equal(issues.length, 2);
    assert.equal(issues[0].source, "crawl");
    assert.equal(issues[0].category, "technical");
    assert.equal(issues[1].category, "schema");
    assert.equal(issues[0].snapshotId, "snap-1");
  });

  it("builds explainable unified score with weights", () => {
    const issues = buildIssuesFromQualityReport(
      [
        {
          id: "b1",
          title: "Broken link",
          severity: "warn",
          message: "404",
          href: "/x",
        },
      ],
      "snap-1",
    );
    const score = buildUnifiedScore(issues);
    assert.ok(score.overall >= 0 && score.overall <= 100);
    assert.equal(score.categories.technical.weight, CATEGORY_WEIGHTS.technical);
    assert.ok(score.categories.technical.issueIds.includes("crawl:b1"));
    assert.equal(score.categories.content.score, 100);
  });

  it("overview and technical builders never invent execution", () => {
    const empty = buildOverviewVm(null);
    assert.equal(empty.snapshot, null);
    assert.equal(empty.score, null);

    const techEmpty = buildTechnicalAuditVm(null);
    assert.equal(techEmpty.snapshot, null);
    assert.ok(techEmpty.cards.every((c) => c.status === "unknown"));

    const record: SeoAuditSnapshotRecord = {
      snapshot: {
        id: "snap-1",
        status: "completed",
        completedAt: new Date().toISOString(),
        durationMs: 1200,
        pagesCrawled: 2,
        overallScore: 90,
        categoryScores: buildUnifiedScore([]).categories,
        issueCounts: { critical: 0, warn: 0, info: 0 },
        correlationId: "c1",
        pipelineVersion: SEO_PIPELINE_VERSION,
        analyzerIds: ["canonical"],
        ruleIds: [],
      },
      issues: buildIssuesFromQualityReport(
        [{ id: "r1", title: "Redirect chain", severity: "info", message: "A→B→C" }],
        "snap-1",
      ),
    };

    const overview = buildOverviewVm(record);
    assert.equal(overview.snapshot?.id, "snap-1");
    assert.ok(overview.score);

    const technical = buildTechnicalAuditVm(record);
    assert.equal(technical.snapshot?.id, "snap-1");
    const redirects = technical.cards.find((c) => c.id === "redirects");
    assert.ok(redirects);
    assert.equal(redirects!.issueCount, 1);

    const open = filterIssues(record.issues, { status: "open" });
    assert.equal(countIssuesBySeverity(open).info, 1);
  });
});
