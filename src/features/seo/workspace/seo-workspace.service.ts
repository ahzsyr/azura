import "server-only";

import { randomUUID } from "node:crypto";
import { createExecutionContext, seoPlatform, pluginSdk } from "@/features/seo/platform";
import { seoQualityService } from "@/features/seo/quality/seo-quality.service";
import { repairSeoDataIssues } from "@/features/seo/quality/repair-seo-data.service";
import {
  buildIssuesFromEntityAudit,
  buildIssuesFromQualityReport,
  countIssuesBySeverity,
  filterIssues,
} from "./builders/issue-builder";
import { buildOverviewVm } from "./builders/overview-builder";
import { buildTechnicalAuditVm } from "./builders/technical-builder";
import { buildContentAuditVm } from "./builders/content-builder";
import { buildUnifiedScore } from "./builders/score-builder";
import { auditSnapshotStore } from "./snapshot-store";
import type {
  AuditTarget,
  SeoAuditSnapshot,
  SeoAuditSnapshotRecord,
  SeoContentAuditVm,
  SeoIssue,
  SeoIssueFilter,
  SeoOverviewVm,
  SeoSnapshotIndexEntry,
  SeoTechnicalAuditVm,
} from "./types";
import { SEO_PIPELINE_VERSION } from "./types";

async function resolveRecord(snapshotId?: string): Promise<SeoAuditSnapshotRecord | null> {
  if (snapshotId) return auditSnapshotStore.get(snapshotId);
  return auditSnapshotStore.getLatest();
}

function mapAuditTarget(target: AuditTarget): { entityType: string; entityId: string; locale: string } {
  // Map UI kinds to provider entity types while keeping entityType/id/locale contract.
  switch (target.kind) {
    case "page":
      return { entityType: target.entityType || "CmsPage", entityId: target.entityId, locale: target.locale };
    case "post":
      return { entityType: target.entityType || "Post", entityId: target.entityId, locale: target.locale };
    case "product":
      return { entityType: target.entityType || "Product", entityId: target.entityId, locale: target.locale };
    case "collection":
      return {
        entityType: target.entityType || "Collection",
        entityId: target.entityId,
        locale: target.locale,
      };
    case "static_page":
      return {
        entityType: target.entityType || "static_page",
        entityId: target.entityId,
        locale: target.locale,
      };
    case "url":
      return {
        entityType: target.entityType || "static_page",
        entityId: target.entityId,
        locale: target.locale,
      };
    default:
      return { entityType: target.entityType, entityId: target.entityId, locale: target.locale };
  }
}

async function runEntityPipeline(target: AuditTarget) {
  const mapped = mapAuditTarget(target);
  const ctx = createExecutionContext({
    entityType: mapped.entityType,
    entityId: mapped.entityId,
    locale: mapped.locale || "en",
    source: "manual",
    trigger: "audit",
    mode: "preview",
  });

  const snapshot = await seoPlatform.content.analyze(ctx);
  const suggestion = await seoPlatform.intelligence.generate(ctx, snapshot);
  const validation = await seoPlatform.governance.validate(ctx, { snapshot, suggestion });
  const rules = await seoPlatform.governance.evaluateRules(ctx, snapshot);
  const recommendations = seoPlatform.recommendations.build(ctx, {
    snapshot,
    validation,
    rules,
  });

  const issues = buildIssuesFromEntityAudit({
    entityType: mapped.entityType,
    entityId: mapped.entityId,
    locale: mapped.locale || "en",
    validation,
    rules,
    recommendations,
  });

  return {
    ctx,
    snapshot,
    suggestion,
    validation,
    rules,
    recommendations,
    issues,
    analyzerIds: pluginSdk.getAnalyzers().map((a) => a.id),
    ruleIds: [
      ...rules.violations.map((v) => v.ruleId),
      ...pluginSdk.getRules().map((r) => r.id),
    ],
  };
}

export const seoWorkspaceService = {
  async runSiteAudit(): Promise<{ snapshotId: string }> {
    const started = Date.now();
    const correlationId = randomUUID();
    const snapshotId = `audit-${new Date().toISOString().slice(0, 10)}-${correlationId.slice(0, 8)}`;

    try {
      await repairSeoDataIssues();
      const report = await seoQualityService.buildReport();
      const issues = buildIssuesFromQualityReport(report.issues, snapshotId);
      const score = buildUnifiedScore(issues);
      const durationMs = Date.now() - started;

      const snapshot: SeoAuditSnapshot = {
        id: snapshotId,
        status: "completed",
        completedAt: new Date().toISOString(),
        durationMs,
        pagesCrawled: report.issues.length,
        overallScore: score.overall,
        categoryScores: score.categories,
        issueCounts: countIssuesBySeverity(issues),
        correlationId,
        pipelineVersion: SEO_PIPELINE_VERSION,
        analyzerIds: [
          "canonical",
          "redirect",
          "schema",
          "broken-link",
          "crawl",
        ],
        ruleIds: [],
      };

      await auditSnapshotStore.save({ snapshot, issues });
      return { snapshotId };
    } catch (error) {
      const durationMs = Date.now() - started;
      const snapshot: SeoAuditSnapshot = {
        id: snapshotId,
        status: "failed",
        completedAt: new Date().toISOString(),
        durationMs,
        overallScore: 0,
        categoryScores: buildUnifiedScore([]).categories,
        issueCounts: { critical: 0, warn: 0, info: 0 },
        correlationId,
        pipelineVersion: SEO_PIPELINE_VERSION,
        analyzerIds: [],
        ruleIds: [],
        errorMessage: error instanceof Error ? error.message : String(error),
      };
      await auditSnapshotStore.save({ snapshot, issues: [] });
      return { snapshotId };
    }
  },

  async getLatestSnapshot() {
    const record = await auditSnapshotStore.getLatest();
    return record?.snapshot ?? null;
  },

  async getSnapshot(id: string) {
    const record = await auditSnapshotStore.get(id);
    return record?.snapshot ?? null;
  },

  async getOverview(snapshotId?: string): Promise<SeoOverviewVm> {
    const record = await resolveRecord(snapshotId);
    return buildOverviewVm(record);
  },

  async getTechnicalAudit(snapshotId?: string): Promise<SeoTechnicalAuditVm> {
    const record = await resolveRecord(snapshotId);
    return buildTechnicalAuditVm(record);
  },

  async listIssues(filter: SeoIssueFilter = {}, snapshotId?: string): Promise<SeoIssue[]> {
    const record = await resolveRecord(snapshotId);
    if (!record) return [];
    return filterIssues(record.issues, {
      severity: filter.severity,
      category: filter.category,
      source: filter.source,
      status: filter.status ?? "open",
    });
  },

  async getContentAudit(target: AuditTarget): Promise<SeoContentAuditVm> {
    const latest = await auditSnapshotStore.getLatest();
    const result = await runEntityPipeline(target);
    return buildContentAuditVm({
      target,
      snapshot: result.snapshot,
      suggestion: result.suggestion,
      issues: result.issues,
      correlationId: result.ctx.correlationId,
      analyzerIds: result.analyzerIds,
      ruleIds: [...new Set(result.ruleIds)],
      siteSnapshotId: latest?.snapshot.id,
    });
  },

  async getRecommendations(target?: AuditTarget): Promise<SeoIssue[]> {
    if (target) {
      const result = await runEntityPipeline(target);
      return result.issues.filter((i) => i.source === "recommendation");
    }
    const record = await auditSnapshotStore.getLatest();
    if (!record) return [];
    return record.issues.filter(
      (i: SeoIssue) => i.source === "recommendation" && i.status === "open",
    );
  },

  async listAuditHistory(limit = 30): Promise<SeoSnapshotIndexEntry[]> {
    return auditSnapshotStore.list(limit);
  },
};
