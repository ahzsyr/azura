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

async function processGenericJob(jobType: MarketingJobType, job: { id: string; providerId: string | null; payload: unknown }) {
  switch (jobType) {
    case "analytics_sync":
      await marketingEventBus.emit("ANALYTICS_SYNC_REQUESTED", {
        providerId: job.providerId ?? "unknown",
      });
      return { ok: true };
    case "tracking_sync":
      return { ok: true };
    case "lead_sync":
      return { ok: true };
    case "webhook_processing":
      return { ok: true };
    case "token_refresh":
      if (job.providerId) {
        await marketingEventBus.emit("TOKEN_REFRESH_COMPLETED", {
          connectionId: String((job.payload as { connectionId?: string } | null)?.connectionId ?? ""),
          providerId: job.providerId,
          ok: true,
        });
      }
      return { ok: true };
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
        result = await processGenericJob(job.jobType as MarketingJobType, job);
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
