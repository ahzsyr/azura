import { prisma } from "@/lib/prisma";

import type { Prisma, SeoMeta } from "@prisma/client";



export type SeoMetaWriteData = {

  canonicalUrl?: string | null;

  robots?: string | null;

  focusKeywords?: string | null;

  ogTitleEn?: string | null;

  ogTitleAr?: string | null;

  ogImageUrl?: string | null;

  twitterCard?: string | null;

  jsonLd?: Prisma.InputJsonValue;

};

import {

  SEO_GLOBAL_NAMESPACE,

  SEO_INTEGRATIONS_NAMESPACE,

  SEO_STRUCTURED_NAMESPACE,

} from "@/features/seo/constants";
import { seoObservabilityFlags } from "@/features/seo/observability-flags";

import type {

  SeoGlobalConfig,

  SeoIntegrationsConfig,

  SeoStructuredConfig,

  SeoSubmissionKind,

  SeoSubmissionReason,

} from "@/features/seo/types";

import {

  redactIntegrationsConfig,

  sealIntegrationsConfig,

  unsealIntegrationsConfig,

} from "@/features/seo/integrations/config";

type SeoSubmissionJobStatusValue = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "EXHAUSTED";
type SeoSubmissionJobRow = {
  id: string;
  provider: string;
  kind: string;
  reason: string;
  url: string;
  status: SeoSubmissionJobStatusValue;
  attemptCount: number;
  responseStatus: number | null;
  lastError: string | null;
  metadata: unknown;
  scheduledAt: Date;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
type SeoRunnerLockRow = {
  key: string;
  lockedUntil: Date;
  owner: string | null;
  createdAt: Date;
  updatedAt: Date;
};
type SeoProviderTelemetryRow = {
  id: string;
  provider: string;
  eventType: "QUEUED" | "STARTED" | "COMPLETED" | "FAILED" | "EXHAUSTED" | "SKIPPED";
  status: "SUCCESS" | "FAILURE" | "INFO";
  responseCode: number | null;
  latencyMs: number | null;
  attemptCount: number;
  errorClass: string | null;
  jobId: string | null;
  url: string | null;
  metadata: unknown;
  createdAt: Date;
};
type SeoHealthSnapshotRow = {
  id: string;
  score: number;
  componentBreakdown: unknown;
  generatedAt: Date;
  createdAt: Date;
};
type SeoCrawlIssueRow = {
  id: string;
  issueKey: string;
  type: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  url: string;
  details: unknown;
  source: string | null;
  firstDetectedAt: Date;
  lastDetectedAt: Date;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
type SeoSearchMetricRow = {
  id: string;
  date: Date;
  url: string;
  query: string;
  country: string;
  device: string;
  source: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  createdAt: Date;
  updatedAt: Date;
};
type SeoRichResultIssueRow = {
  id: string;
  issueKey: string;
  type: string;
  category: "ERROR" | "WARNING";
  url: string;
  details: unknown;
  eligibility: "ELIGIBLE" | "ELIGIBLE_WITH_WARNINGS" | "NOT_ELIGIBLE";
  source: string;
  detectedAt: Date;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
type SeoSubmissionJobDelegateShim = {
  upsert(args: unknown): Promise<SeoSubmissionJobRow>;
  findMany(args: unknown): Promise<SeoSubmissionJobRow[]>;
  count(args: unknown): Promise<number>;
  update(args: unknown): Promise<SeoSubmissionJobRow>;
};
type SeoRunnerLockDelegateShim = {
  findUnique(args: unknown): Promise<SeoRunnerLockRow | null>;
  create(args: unknown): Promise<SeoRunnerLockRow>;
  upsert(args: unknown): Promise<SeoRunnerLockRow>;
  updateMany(args: unknown): Promise<{ count: number }>;
};
type GenericSeoDelegateShim<Row> = {
  create(args: unknown): Promise<Row>;
  upsert(args: unknown): Promise<Row>;
  findMany(args: unknown): Promise<Row[]>;
  findFirst(args: unknown): Promise<Row | null>;
  count(args: unknown): Promise<number>;
  updateMany(args: unknown): Promise<{ count: number }>;
};

function seoSubmissionJobDelegate() {
  return (prisma as unknown as { seoSubmissionJob: SeoSubmissionJobDelegateShim }).seoSubmissionJob;
}

function seoRunnerLockDelegate() {
  return (prisma as unknown as { seoRunnerLock: SeoRunnerLockDelegateShim }).seoRunnerLock;
}

function seoProviderTelemetryDelegate() {
  return (prisma as unknown as { seoProviderTelemetry: GenericSeoDelegateShim<SeoProviderTelemetryRow> })
    .seoProviderTelemetry;
}

function seoHealthSnapshotDelegate() {
  return (prisma as unknown as { seoHealthSnapshot: GenericSeoDelegateShim<SeoHealthSnapshotRow> })
    .seoHealthSnapshot;
}

function seoCrawlIssueDelegate() {
  return (prisma as unknown as { seoCrawlIssue: GenericSeoDelegateShim<SeoCrawlIssueRow> }).seoCrawlIssue;
}

function seoSearchMetricDelegate() {
  return (prisma as unknown as { seoSearchMetric: GenericSeoDelegateShim<SeoSearchMetricRow> })
    .seoSearchMetric;
}

function seoRichResultIssueDelegate() {
  return (prisma as unknown as { seoRichResultIssue: GenericSeoDelegateShim<SeoRichResultIssueRow> })
    .seoRichResultIssue;
}

const MAX_REASON_HISTORY = 10;

function mergeSubmissionMetadata(existing: unknown, incoming: unknown, reason: string) {
  const existingObject =
    typeof existing === "object" && existing !== null && !Array.isArray(existing)
      ? (existing as Record<string, unknown>)
      : {};
  const incomingObject =
    typeof incoming === "object" && incoming !== null && !Array.isArray(incoming)
      ? (incoming as Record<string, unknown>)
      : {};
  const now = new Date().toISOString();
  const recent = Array.isArray(existingObject.recentReasons)
    ? existingObject.recentReasons.filter((item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null
      )
    : [];
  return {
    ...existingObject,
    ...incomingObject,
    latestReason: reason,
    lastTriggeredAt: now,
    recentReasons: [{ reason, triggeredAt: now }, ...recent].slice(0, MAX_REASON_HISTORY),
  };
}

function percentile(values: number[], p: number) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index] ?? 0;
}



export const seoRepository = {

  getByPageKey(pageKey: string) {

    return prisma.seoMeta.findUnique({ where: { pageKey } });

  },



  getLegacySettings(pageKey: string) {

    return prisma.seoSettings.findUnique({ where: { pageKey } });

  },



  getByEntity(entityType: string, entityId: string) {

    return prisma.seoMeta.findFirst({ where: { entityType, entityId } });

  },



  getByCmsPageId(cmsPageId: string) {

    return prisma.seoMeta.findUnique({ where: { cmsPageId } });

  },



  getByPostId(postId: string) {

    return prisma.seoMeta.findUnique({ where: { postId } });

  },



  async resolveMeta(params: {

    pageKey?: string;

    entityType?: string;

    entityId?: string;

    cmsPageId?: string;

    postId?: string;

    seoMeta?: SeoMeta | null;

  }): Promise<SeoMeta | null> {

    if (params.seoMeta) return params.seoMeta;

    if (params.cmsPageId) {

      const m = await this.getByCmsPageId(params.cmsPageId);

      if (m) return m;

    }

    if (params.postId) {

      const m = await this.getByPostId(params.postId);

      if (m) return m;

    }

    if (params.entityType && params.entityId) {

      const m = await this.getByEntity(params.entityType, params.entityId);

      if (m) return m;

    }

    if (params.pageKey) {

      const meta = await this.getByPageKey(params.pageKey);

      if (meta) return meta;

      const legacy = await this.getLegacySettings(params.pageKey);

      if (legacy) {

        return {

          id: legacy.id,

          pageKey: legacy.pageKey,

          entityType: null,

          entityId: null,





          canonicalUrl: null,

          robots: null,

          focusKeywords: null,

          ogImageUrl: legacy.ogImageUrl,

          twitterCard: null,

          jsonLd: null,

          cmsPageId: null,

          postId: null,

          createdAt: legacy.createdAt,

          updatedAt: legacy.updatedAt,

        };

      }

    }

    return null;

  },



  listAllMeta() {

    return prisma.seoMeta.findMany({ orderBy: { updatedAt: "desc" } });

  },



  listPageKeyMeta() {

    return prisma.seoMeta.findMany({

      where: { pageKey: { not: null } },

      orderBy: { pageKey: "asc" },

    });

  },



  upsertMetaByPageKey(pageKey: string, data: SeoMetaWriteData) {

    return prisma.seoMeta.upsert({

      where: { pageKey },

      create: { ...data, pageKey },

      update: data,

    });

  },



  upsertMetaByCmsPage(cmsPageId: string, data: SeoMetaWriteData) {

    return prisma.seoMeta.upsert({

      where: { cmsPageId },

      create: { ...data, cmsPageId, entityType: "CMS_PAGE", entityId: cmsPageId },

      update: { ...data, entityType: "CMS_PAGE", entityId: cmsPageId },

    });

  },



  upsertMetaByPost(postId: string, data: SeoMetaWriteData) {

    return prisma.seoMeta.upsert({

      where: { postId },

      create: { ...data, postId, entityType: "POST", entityId: postId },

      update: { ...data, entityType: "POST", entityId: postId },

    });

  },



  async upsertMetaByEntity(entityType: string, entityId: string, data: SeoMetaWriteData) {

    const existing = await prisma.seoMeta.findFirst({

      where: { entityType, entityId },

    });

    if (existing) {

      return prisma.seoMeta.update({

        where: { id: existing.id },

        data: { ...data, entityType, entityId },

      });

    }

    return prisma.seoMeta.create({ data: { ...data, entityType, entityId } });

  },



  listRedirects(activeOnly = true) {

    return prisma.seoRedirect.findMany({

      where: activeOnly ? { isActive: true } : undefined,

      orderBy: { fromPath: "asc" },

    });

  },



  upsertRedirect(

    fromPath: string,

    toPath: string,

    type: "PERMANENT" | "TEMPORARY" = "PERMANENT"

  ) {

    return prisma.seoRedirect.upsert({

      where: { fromPath },

      create: { fromPath, toPath, type },

      update: { toPath, type },

    });

  },



  deleteRedirect(id: string) {

    return prisma.seoRedirect.delete({ where: { id } });

  },



  getCustom404(locale: string) {

    return prisma.custom404.findUnique({ where: { locale } });

  },



  upsertCustom404(data: Prisma.Custom404CreateInput) {

    return prisma.custom404.upsert({

      where: { locale: data.locale },

      create: data,

      update: data,

    });

  },



  async getGlobalConfig(): Promise<SeoGlobalConfig> {

    const row = await prisma.jsonStore.findUnique({

      where: {

        namespace_key: { namespace: SEO_GLOBAL_NAMESPACE, key: "config" },

      },

    });

    return (row?.data as SeoGlobalConfig) ?? {};

  },



  async upsertGlobalConfig(config: SeoGlobalConfig) {

    return prisma.jsonStore.upsert({

      where: {

        namespace_key: { namespace: SEO_GLOBAL_NAMESPACE, key: "config" },

      },

      create: {

        namespace: SEO_GLOBAL_NAMESPACE,

        key: "config",

        data: config as Prisma.InputJsonValue,

      },

      update: { data: config as Prisma.InputJsonValue },

    });

  },



  async getStructuredConfig(): Promise<SeoStructuredConfig> {

    const row = await prisma.jsonStore.findUnique({

      where: {

        namespace_key: { namespace: SEO_STRUCTURED_NAMESPACE, key: "config" },

      },

    });

    return (row?.data as SeoStructuredConfig) ?? {};

  },



  async upsertStructuredConfig(config: SeoStructuredConfig) {

    return prisma.jsonStore.upsert({

      where: {

        namespace_key: { namespace: SEO_STRUCTURED_NAMESPACE, key: "config" },

      },

      create: {

        namespace: SEO_STRUCTURED_NAMESPACE,

        key: "config",

        data: config as Prisma.InputJsonValue,

      },

      update: { data: config as Prisma.InputJsonValue },

    });

  },



  async getIntegrationsConfig(): Promise<SeoIntegrationsConfig> {

    const row = await prisma.jsonStore.findUnique({

      where: {

        namespace_key: { namespace: SEO_INTEGRATIONS_NAMESPACE, key: "config" },

      },

    });

    return unsealIntegrationsConfig((row?.data as SeoIntegrationsConfig) ?? {});

  },



  async getPublicIntegrationsConfig() {

    return redactIntegrationsConfig(await this.getIntegrationsConfig());

  },



  async upsertIntegrationsConfig(config: SeoIntegrationsConfig) {

    const sealed = sealIntegrationsConfig(config);

    return prisma.jsonStore.upsert({

      where: {

        namespace_key: { namespace: SEO_INTEGRATIONS_NAMESPACE, key: "config" },

      },

      create: {

        namespace: SEO_INTEGRATIONS_NAMESPACE,

        key: "config",

        data: sealed as Prisma.InputJsonValue,

      },

      update: { data: sealed as Prisma.InputJsonValue },

    });

  },



  async enqueueSubmissionJobs(

    jobs: Array<{

      provider: string;

      kind: SeoSubmissionKind;

      reason: SeoSubmissionReason;

      url: string;

      metadata?: Prisma.InputJsonValue;

    }>

  ) {
    for (const job of jobs) {
      const scheduledAt = new Date();
      const existing = await seoSubmissionJobDelegate().findMany({
        where: {
          provider: job.provider,
          kind: job.kind,
          url: job.url,
        },
        take: 1,
      });
      const current = existing[0];
      const metadata = mergeSubmissionMetadata(current?.metadata, job.metadata, job.reason);

      await seoSubmissionJobDelegate().upsert({

        where: {

          provider_kind_url: {

            provider: job.provider,

            kind: job.kind,

            url: job.url,

          },

        },

        create: {

          provider: job.provider,

          kind: job.kind,

          reason: job.reason,

          url: job.url,

          metadata,

          scheduledAt,

        },

        update: {

          status: "PENDING",

          scheduledAt,

          lastError: null,

          completedAt: null,

          responseStatus: null,

          reason: job.reason,

          attemptCount:
            current?.status === "COMPLETED" || current?.status === "EXHAUSTED"
              ? 0
              : current?.attemptCount ?? 0,

          metadata,

        },

      });

      if (seoObservabilityFlags.seoTelemetry) {
        await seoProviderTelemetryDelegate()
          .create({
            data: {
              provider: job.provider,
              eventType: "QUEUED",
              status: "INFO",
              attemptCount: current?.attemptCount ?? 0,
              url: job.url,
              metadata,
            },
          })
          .catch(() => undefined);
      }

    }

  },



  listSubmissionJobs(limit = 50) {

    return seoSubmissionJobDelegate().findMany({

      orderBy: [{ status: "asc" }, { scheduledAt: "desc" }],

      take: limit,

    });

  },



  listDueSubmissionJobs(limit = 10) {

    return seoSubmissionJobDelegate().findMany({

      where: {

        status: { in: ["PENDING", "FAILED"] },

        scheduledAt: { lte: new Date() },

        attemptCount: { lt: 5 },

      },

      orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }],

      take: limit,

    });

  },



  updateSubmissionJob(

    id: string,

    data: {

      status: SeoSubmissionJobStatusValue;

      attemptCount?: number;

      lastError?: string | null;

      scheduledAt?: Date;

      completedAt?: Date | null;

      responseStatus?: number | null;

    }

  ) {

    return seoSubmissionJobDelegate().update({

      where: { id },

      data,

    });

  },

  async acquireRunnerLock(params: { key: string; owner: string; lockedUntil: Date }) {
    const now = new Date();
    const updated = await seoRunnerLockDelegate().updateMany({
      where: {
        key: params.key,
        lockedUntil: { lte: now },
      },
      data: {
        owner: params.owner,
        lockedUntil: params.lockedUntil,
      },
    });
    if (updated.count > 0) return true;
    try {
      await seoRunnerLockDelegate().create({
        data: {
          key: params.key,
          owner: params.owner,
          lockedUntil: params.lockedUntil,
        },
      });
      return true;
    } catch {
      const existing = await seoRunnerLockDelegate().findUnique({
        where: { key: params.key },
      });
      return Boolean(existing && existing.owner === params.owner && existing.lockedUntil > now);
    }
  },

  async renewRunnerLock(params: { key: string; owner: string; lockedUntil: Date }) {
    const updated = await seoRunnerLockDelegate().updateMany({
      where: {
        key: params.key,
        owner: params.owner,
        lockedUntil: { gt: new Date() },
      },
      data: {
        lockedUntil: params.lockedUntil,
      },
    });
    return updated.count > 0;
  },

  async releaseRunnerLock(params: { key: string; owner: string }) {
    await seoRunnerLockDelegate().updateMany({
      where: {
        key: params.key,
        owner: params.owner,
      },
      data: {
        lockedUntil: new Date(0),
        owner: null,
      },
    });
  },

  recordProviderTelemetry(data: {
    provider: string;
    eventType: SeoProviderTelemetryRow["eventType"];
    status: SeoProviderTelemetryRow["status"];
    responseCode?: number | null;
    latencyMs?: number | null;
    attemptCount?: number;
    errorClass?: string | null;
    jobId?: string | null;
    url?: string | null;
    metadata?: Prisma.InputJsonValue;
  }) {
    if (!seoObservabilityFlags.seoTelemetry) return Promise.resolve(null);
    return seoProviderTelemetryDelegate().create({
      data: {
        provider: data.provider,
        eventType: data.eventType,
        status: data.status,
        responseCode: data.responseCode ?? null,
        latencyMs: data.latencyMs ?? null,
        attemptCount: data.attemptCount ?? 0,
        errorClass: data.errorClass ?? null,
        jobId: data.jobId ?? null,
        url: data.url ?? null,
        metadata: data.metadata ?? {},
      },
    });
  },

  async getProviderTelemetryMetrics(days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await seoProviderTelemetryDelegate().findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 5000,
    });
    const byProvider = new Map<string, SeoProviderTelemetryRow[]>();
    for (const row of rows) {
      byProvider.set(row.provider, [...(byProvider.get(row.provider) ?? []), row]);
    }
    return [...byProvider.entries()].map(([provider, providerRows]) => {
      const completed = providerRows.filter((row) => row.eventType === "COMPLETED").length;
      const failures = providerRows.filter(
        (row) => row.eventType === "FAILED" || row.eventType === "EXHAUSTED"
      ).length;
      const terminal = completed + failures;
      const latencyValues = providerRows
        .map((row) => row.latencyMs)
        .filter((value): value is number => typeof value === "number");
      const errorBreakdown = providerRows.reduce((acc: Record<string, number>, row) => {
        if (row.status !== "FAILURE") return acc;
        const key = row.errorClass ?? "unknown";
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {});
      const retrySuccess = providerRows.filter(
        (row) => row.eventType === "COMPLETED" && row.attemptCount > 1
      ).length;
      return {
        provider,
        successRate: terminal === 0 ? 0 : Math.round((completed / terminal) * 1000) / 10,
        completed,
        failures,
        p50LatencyMs: percentile(latencyValues, 50),
        p95LatencyMs: percentile(latencyValues, 95),
        p99LatencyMs: percentile(latencyValues, 99),
        errorBreakdown,
        volume: providerRows.length,
        firstAttemptSuccess: providerRows.filter(
          (row) => row.eventType === "COMPLETED" && row.attemptCount <= 1
        ).length,
        retrySuccess,
        exhausted: providerRows.filter((row) => row.eventType === "EXHAUSTED").length,
      };
    });
  },

  createHealthSnapshot(data: { score: number; componentBreakdown: Prisma.InputJsonValue }) {
    return seoHealthSnapshotDelegate().create({
      data: {
        score: data.score,
        componentBreakdown: data.componentBreakdown,
        generatedAt: new Date(),
      },
    });
  },

  listHealthSnapshots(limit = 30) {
    return seoHealthSnapshotDelegate().findMany({
      orderBy: { generatedAt: "desc" },
      take: limit,
    });
  },

  async replaceActiveCrawlIssues(
    issues: Array<{
      issueKey: string;
      type: string;
      severity: SeoCrawlIssueRow["severity"];
      url: string;
      details?: Prisma.InputJsonValue;
      source?: string | null;
    }>
  ) {
    const now = new Date();
    const activeKeys = new Set(issues.map((issue) => issue.issueKey));
    for (const issue of issues) {
      await seoCrawlIssueDelegate().upsert({
        where: { issueKey: issue.issueKey },
        create: {
          issueKey: issue.issueKey,
          type: issue.type,
          severity: issue.severity,
          url: issue.url,
          details: issue.details ?? {},
          source: issue.source ?? null,
          firstDetectedAt: now,
          lastDetectedAt: now,
          resolvedAt: null,
        },
        update: {
          type: issue.type,
          severity: issue.severity,
          url: issue.url,
          details: issue.details ?? {},
          source: issue.source ?? null,
          lastDetectedAt: now,
          resolvedAt: null,
        },
      });
    }
    const current = await seoCrawlIssueDelegate().findMany({
      where: { resolvedAt: null },
      take: 5000,
    });
    for (const issue of current) {
      if (!activeKeys.has(issue.issueKey)) {
        await seoCrawlIssueDelegate().updateMany({
          where: { issueKey: issue.issueKey, resolvedAt: null },
          data: { resolvedAt: now },
        });
      }
    }
  },

  listActiveCrawlIssues(limit = 200) {
    return seoCrawlIssueDelegate().findMany({
      where: { resolvedAt: null },
      orderBy: [{ severity: "asc" }, { lastDetectedAt: "desc" }],
      take: limit,
    });
  },

  upsertSearchMetrics(
    rows: Array<{
      date: Date;
      url: string;
      query?: string;
      country?: string;
      device?: string;
      source: string;
      clicks: number;
      impressions: number;
      ctr: number;
      position: number;
    }>
  ) {
    return Promise.all(
      rows.map((row) =>
        seoSearchMetricDelegate().upsert({
          where: {
            source_date_url_query_country_device: {
              source: row.source,
              date: row.date,
              url: row.url,
              query: row.query ?? "",
              country: row.country ?? "",
              device: row.device ?? "",
            },
          },
          create: {
            date: row.date,
            url: row.url,
            query: row.query ?? "",
            country: row.country ?? "",
            device: row.device ?? "",
            source: row.source,
            clicks: row.clicks,
            impressions: row.impressions,
            ctr: row.ctr,
            position: row.position,
          },
          update: {
            clicks: row.clicks,
            impressions: row.impressions,
            ctr: row.ctr,
            position: row.position,
          },
        })
      )
    );
  },

  async getSearchMetricReport(days = 28) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await seoSearchMetricDelegate().findMany({
      where: { date: { gte: since } },
      orderBy: { date: "desc" },
      take: 5000,
    });
    function aggregateBy(key: "url" | "query") {
      const grouped = new Map<string, { key: string; clicks: number; impressions: number; positionSum: number; rows: number }>();
      for (const row of rows) {
        const value = row[key];
        if (!value) continue;
        const current = grouped.get(value) ?? {
          key: value,
          clicks: 0,
          impressions: 0,
          positionSum: 0,
          rows: 0,
        };
        current.clicks += row.clicks;
        current.impressions += row.impressions;
        current.positionSum += row.position;
        current.rows += 1;
        grouped.set(value, current);
      }
      return [...grouped.values()]
        .map((item) => ({
          ...item,
          ctr: item.impressions === 0 ? 0 : item.clicks / item.impressions,
          position: item.rows === 0 ? 0 : item.positionSum / item.rows,
        }))
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 20);
    }
    return {
      topPages: aggregateBy("url"),
      topQueries: aggregateBy("query"),
      totalClicks: rows.reduce((sum, row) => sum + row.clicks, 0),
      totalImpressions: rows.reduce((sum, row) => sum + row.impressions, 0),
    };
  },

  async replaceRichResultIssues(
    issues: Array<{
      issueKey: string;
      type: string;
      category: SeoRichResultIssueRow["category"];
      url: string;
      details?: Prisma.InputJsonValue;
      eligibility: SeoRichResultIssueRow["eligibility"];
      source?: string;
    }>
  ) {
    const now = new Date();
    const activeKeys = new Set(issues.map((issue) => issue.issueKey));
    const sources = [
      ...new Set(issues.length ? issues.map((issue) => issue.source ?? "internal") : ["internal"]),
    ];
    for (const issue of issues) {
      await seoRichResultIssueDelegate().upsert({
        where: { issueKey: issue.issueKey },
        create: {
          issueKey: issue.issueKey,
          type: issue.type,
          category: issue.category,
          url: issue.url,
          details: issue.details ?? {},
          eligibility: issue.eligibility,
          source: issue.source ?? "internal",
          detectedAt: now,
          resolvedAt: null,
        },
        update: {
          type: issue.type,
          category: issue.category,
          url: issue.url,
          details: issue.details ?? {},
          eligibility: issue.eligibility,
          source: issue.source ?? "internal",
          detectedAt: now,
          resolvedAt: null,
        },
      });
    }
    const current = await seoRichResultIssueDelegate().findMany({
      where: { resolvedAt: null, source: { in: sources } },
      take: 5000,
    });
    for (const issue of current) {
      if (!activeKeys.has(issue.issueKey)) {
        await seoRichResultIssueDelegate().updateMany({
          where: { issueKey: issue.issueKey, resolvedAt: null },
          data: { resolvedAt: now },
        });
      }
    }
  },

  listActiveRichResultIssues(limit = 200) {
    return seoRichResultIssueDelegate().findMany({
      where: { resolvedAt: null },
      orderBy: [{ category: "asc" }, { detectedAt: "desc" }],
      take: limit,
    });
  },



  async getSubmissionMetrics() {

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const stuckBefore = new Date(Date.now() - 15 * 60 * 1000);
    const [pending, failed, completed, running, exhausted, failedLast24h, stuck, recent, providerRows] = await Promise.all([

      seoSubmissionJobDelegate().count({ where: { status: "PENDING" } }),

      seoSubmissionJobDelegate().count({ where: { status: "FAILED" } }),

      seoSubmissionJobDelegate().count({ where: { status: "COMPLETED" } }),

      seoSubmissionJobDelegate().count({ where: { status: "RUNNING" } }),

      seoSubmissionJobDelegate().count({ where: { status: "EXHAUSTED" } }),

      seoSubmissionJobDelegate().count({
        where: {
          status: { in: ["FAILED", "EXHAUSTED"] },
          updatedAt: { gte: since },
        },
      }),

      seoSubmissionJobDelegate().count({
        where: {
          status: "RUNNING",
          updatedAt: { lte: stuckBefore },
        },
      }),

      seoSubmissionJobDelegate().findMany({

        orderBy: { updatedAt: "desc" },

        take: 10,

      }),

      seoSubmissionJobDelegate().findMany({
        where: { status: { in: ["COMPLETED", "FAILED", "EXHAUSTED"] } },
        take: 1000,
      }),

    ]);

    const providerStats = Object.values(
      providerRows.reduce(
        (acc: Record<string, { provider: string; completed: number; failed: number; exhausted: number }>, row) => {
          const current = acc[row.provider] ?? {
            provider: row.provider,
            completed: 0,
            failed: 0,
            exhausted: 0,
          };
          if (row.status === "COMPLETED") current.completed++;
          if (row.status === "FAILED") current.failed++;
          if (row.status === "EXHAUSTED") current.exhausted++;
          acc[row.provider] = current;
          return acc;
        },
        {}
      )
    ).map((item) => {
      const total = item.completed + item.failed + item.exhausted;
      return {
        ...item,
        total,
        successRate: total === 0 ? 0 : Math.round((item.completed / total) * 100),
      };
    });

    return {
      pending,
      failed,
      completed,
      running,
      exhausted,
      failedLast24h,
      stuck,
      providerStats,
      recent,
    };

  },



  async listNoIndexPaths(): Promise<Set<string>> {

    const metas = await prisma.seoMeta.findMany({

      where: { robots: { contains: "noindex" } },

      select: { pageKey: true, entityType: true, entityId: true, cmsPage: { select: { slug: true } }, post: { select: { slug: true } } },

    });

    const paths = new Set<string>();

    for (const m of metas) {

      if (m.pageKey) {

        const staticPaths: Record<string, string> = {

          home: "",

          about: "/about",

          packages: "/packages",

          products: "/products",

          collections: "/collections",

          services: "/services",

          compare: "/compare",

          favorites: "/favorites",

          account: "/account",

          "hotels-transport": "/hotels-transport",

          gallery: "/gallery",

          testimonials: "/testimonials",

          contact: "/contact",

          blog: "/blog",

          faq: "/faq",

        };

        if (m.pageKey in staticPaths) paths.add(staticPaths[m.pageKey]);

      }

      if (m.cmsPage?.slug) paths.add(`/pages/${m.cmsPage.slug}`);

      if (m.post?.slug) paths.add(`/blog/${m.post.slug}`);

      if (m.entityType === "CONTENT_ITEM" && m.entityId) {

        const item = await prisma.contentItem.findUnique({

          where: { id: m.entityId },

          select: { slug: true, contentType: { select: { routePrefix: true } } },

        });

        const prefix = item?.contentType.routePrefix ?? "content";

        if (item?.slug) paths.add(`/${prefix}/${item.slug}`);

      }

    }

    return paths;

  },

};

