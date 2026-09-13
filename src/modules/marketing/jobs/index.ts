import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { EnqueueMarketingJobInput, MarketingJobType } from "./types";
import { providerQuotaService } from "@/modules/marketing/core/quota";
import { marketingObservability } from "@/modules/marketing/core/observability";
import { marketingEventBus } from "@/modules/marketing/core/events";
import { findProvider } from "@/modules/marketing/core/registry";
import type { CanonicalPublishRequest } from "@/modules/marketing/core/dto/types";

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
export async function enqueueMarketingJob(input: EnqueueMarketingJobInput) {
  const existing = await prisma.marketingJob.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (existing) return existing;

  if (input.providerId) {
    await prisma.marketingProviderRuntime.upsert({
      where: { providerId: input.providerId },
      create: {
        providerId: input.providerId,
        enabled: true,
        installedVersion: "1.0.0",
        lifecycle: "discovered",
      },
      update: {},
    });
  }

  return prisma.marketingJob.create({
    data: {
      jobType: input.jobType,
      idempotencyKey: input.idempotencyKey,
      providerId: input.providerId,
      connectionId: input.connectionId,
      accountId: input.accountId,
      payload: asJson(input.payload ?? {}),
      workflowStage: input.workflowStage ?? "queued",
      scheduledAt: input.scheduledAt ?? new Date(),
      maxAttempts: input.maxAttempts ?? 5,
      status: "PENDING",
    },
  });
}

async function advancePublishWorkflow(jobId: string, stage: string, result?: Record<string, unknown>) {
  return prisma.marketingJob.update({
    where: { id: jobId },
    data: {
      workflowStage: stage,
      result: asJson(result ?? {}),
    },
  });
}

async function processPublishJob(job: {
  id: string;
  providerId: string | null;
  connectionId: string | null;
  accountId: string | null;
  payload: unknown;
  attemptCount: number;
}) {
  if (!job.providerId || !job.connectionId || !job.accountId) {
    throw new Error("Publish job missing provider/connection/account binding");
  }
  if (!providerQuotaService.canProceed(job.providerId)) {
    throw new Error("Provider quota exceeded or rate-limited");
  }

  const adapter = findProvider(job.providerId);
  if (!adapter?.publish) throw new Error(`Provider ${job.providerId} does not support publishing`);

  const payload = (job.payload ?? {}) as Partial<CanonicalPublishRequest>;
  await advancePublishWorkflow(job.id, "upload_media");
  await advancePublishWorkflow(job.id, "publish_content");

  providerQuotaService.consume(job.providerId);
  const publishResult = await adapter.publish({
    idempotencyKey: `publish:${job.id}`,
    providerId: job.providerId,
    connectionId: job.connectionId,
    accountId: job.accountId,
    text: payload.text ?? "",
    mediaUrls: payload.mediaUrls,
    linkUrl: payload.linkUrl,
    scheduledAt: payload.scheduledAt,
    metadata: payload.metadata,
  });

  await advancePublishWorkflow(job.id, "fetch_result", { publishResult });
  await advancePublishWorkflow(job.id, "record_outcome", { publishResult });
  await marketingEventBus.emit(
    publishResult.ok ? "PUBLISH_COMPLETED" : "PUBLISH_FAILED",
    publishResult.ok
      ? {
          jobId: job.id,
          providerId: job.providerId,
          externalPostId: publishResult.externalPostId,
        }
      : {
          jobId: job.id,
          providerId: job.providerId,
          error: publishResult.message ?? "Publish failed",
        },
  );
  await advancePublishWorkflow(job.id, "emit_event", { publishResult });

  if (!publishResult.ok) {
    throw new Error(publishResult.message ?? "Publish failed");
  }
  return publishResult;
}

async function processGenericJob(
  jobType: MarketingJobType,
  job: {
    id: string;
    providerId: string | null;
    connectionId: string | null;
    accountId: string | null;
    payload: unknown;
  },
) {
  const payload = (job.payload ?? {}) as Record<string, unknown>;

  switch (jobType) {
    case "analytics_sync": {
      await marketingEventBus.emit("ANALYTICS_SYNC_REQUESTED", {
        providerId: job.providerId ?? "unknown",
      });
      if (job.providerId && job.connectionId && job.accountId) {
        const account = await prisma.marketingAccount.findUnique({
          where: { id: job.accountId },
          select: { externalAccountId: true },
        });
        if (account?.externalAccountId) {
          const { syncProviderAnalytics } = await import("@/modules/marketing/analytics/ingest");
          await syncProviderAnalytics({
            providerId: job.providerId,
            connectionId: job.connectionId,
            accountId: job.accountId,
            externalAccountId: account.externalAccountId,
            from: String(payload.from ?? new Date(Date.now() - 7 * 86400000).toISOString()),
            to: String(payload.to ?? new Date().toISOString()),
          }).catch(() => undefined);
        }
      }
      return { ok: true };
    }
    case "campaign_sync": {
      if (!job.providerId || !job.connectionId || !job.accountId) {
        throw new Error("campaign_sync requires providerId, connectionId, accountId");
      }
      const { adSyncService } = await import("@/modules/marketing/ads/sync-service");
      await adSyncService.syncAdAccountsForConnection(job.connectionId, job.providerId);
      const campaigns = await adSyncService.syncCampaignsForAdAccount(
        job.connectionId,
        job.providerId,
        job.accountId,
      );
      return { ok: true, campaigns: campaigns.length };
    }
    case "ad_metrics_sync": {
      if (!job.providerId || !job.connectionId) {
        throw new Error("ad_metrics_sync requires providerId and connectionId");
      }
      const externalCampaignId = String(payload.externalCampaignId ?? "");
      if (!externalCampaignId) throw new Error("externalCampaignId required");
      const bindingId =
        typeof payload.bindingId === "string" ? payload.bindingId : undefined;
      if (bindingId) {
        const { adSyncService } = await import("@/modules/marketing/ads/sync-service");
        const result = await adSyncService.syncBoundCampaign(bindingId);
        return { ok: result.ok, ...(result.ok ? {} : { error: result.error }) };
      }
      const { adSyncService } = await import("@/modules/marketing/ads/sync-service");
      const metrics = await adSyncService.syncMetrics(
        job.connectionId,
        job.providerId,
        externalCampaignId,
        {
          from: String(payload.from ?? new Date(Date.now() - 7 * 86400000).toISOString()),
          to: String(payload.to ?? new Date().toISOString()),
        },
      );
      return { ok: true, metrics: metrics.length };
    }
    case "attribution_aggregate": {
      const { analyticsAggregateService } = await import("@/modules/marketing/analytics/aggregate");
      const result = await analyticsAggregateService.rollupDay(new Date());
      return { ok: true, ...result };
    }
    case "retention_purge": {
      const { runRetentionPurge } = await import("@/modules/marketing/privacy/retention");
      return runRetentionPurge();
    }
    case "tracking_sync":
      return { ok: true };
    case "lead_sync":
      return { ok: true };
    case "webhook_processing": {
      const webhookId = String(payload.webhookEventId ?? "");
      if (!webhookId) return { ok: true, skipped: true };
      const event = await prisma.marketingWebhookEvent.findUnique({ where: { id: webhookId } });
      if (!event) return { ok: false, message: "webhook not found" };
      await prisma.marketingWebhookEvent.update({
        where: { id: webhookId },
        data: { status: "COMPLETED", processedAt: new Date() },
      });
      return { ok: true };
    }
    case "token_refresh":
      if (job.connectionId) {
        const { refreshConnectionToken } = await import(
          "@/modules/marketing/oauth/connection-lifecycle"
        );
        const result = await refreshConnectionToken(job.connectionId);
        if (job.providerId) {
          await marketingEventBus.emit("TOKEN_REFRESH_COMPLETED", {
            connectionId: job.connectionId,
            providerId: job.providerId,
            ok: result.ok,
          });
        }
        if (!result.ok) throw new Error(result.message ?? "token_refresh failed");
        return { ok: true };
      }
      return { ok: true, skipped: true };
    case "media_upload":
      return { ok: true };
    default:
      return { ok: true };
  }
}

export async function runDueMarketingJobs(limit = 10) {
  const due = await prisma.marketingJob.findMany({
    where: {
      status: { in: ["PENDING", "FAILED"] },
      scheduledAt: { lte: new Date() },
      attemptCount: { lt: 5 },
    },
    orderBy: { scheduledAt: "asc" },
    take: limit,
  });

  const results: Array<{ id: string; ok: boolean; error?: string }> = [];

  for (const job of due) {
    const started = Date.now();
    await prisma.marketingJob.update({
      where: { id: job.id },
      data: {
        status: "RUNNING",
        startedAt: new Date(),
        attemptCount: { increment: 1 },
      },
    });

    try {
      let result: unknown;
      if (job.jobType === "publish") {
        result = await processPublishJob(job);
      } else {
        result = await processGenericJob(job.jobType as MarketingJobType, {
          id: job.id,
          providerId: job.providerId,
          connectionId: job.connectionId,
          accountId: job.accountId,
          payload: job.payload,
        });
      }

      await prisma.marketingJob.update({
        where: { id: job.id },
        data: {
          status: "COMPLETED",
          workflowStage: "completed",
          completedAt: new Date(),
          result: asJson((result as object) ?? {}),
          lastError: null,
        },
      });

      if (job.providerId) {
        marketingObservability.record({
          providerId: job.providerId,
          operation: job.jobType,
          durationMs: Date.now() - started,
          retryCount: job.attemptCount + 1,
          rateLimited: false,
          outcome: "success",
        });
      }

      results.push({ id: job.id, ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const attemptCount = job.attemptCount + 1;
      const exhausted = attemptCount >= job.maxAttempts;
      const backoff = providerQuotaService.adaptiveBackoffMs(attemptCount);

      await prisma.marketingJob.update({
        where: { id: job.id },
        data: {
          status: exhausted ? "EXHAUSTED" : "FAILED",
          workflowStage: "failed",
          lastError: message,
          scheduledAt: exhausted ? job.scheduledAt : new Date(Date.now() + backoff),
        },
      });

      if (job.providerId) {
        marketingObservability.record({
          providerId: job.providerId,
          operation: job.jobType,
          durationMs: Date.now() - started,
          retryCount: attemptCount,
          rateLimited: message.toLowerCase().includes("rate"),
          outcome: "failure",
          errorCategory: exhausted ? "exhausted" : "retryable",
        });
      }

      results.push({ id: job.id, ok: false, error: message });
    }
  }

  return results;
}

export type { EnqueueMarketingJobInput, MarketingJobType, PublishWorkflowStage } from "./types";
export { MARKETING_JOB_TYPES, PUBLISH_WORKFLOW_STAGES } from "./types";
