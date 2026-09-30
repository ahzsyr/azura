import { enqueueMarketingJob } from "@/modules/marketing/jobs";
import { marketingEventBus } from "@/modules/marketing/core/events";
import { runMediaPipeline } from "@/modules/marketing/media/pipeline";
import type { CanonicalPublishRequest } from "@/modules/marketing/core/dto/types";

export async function requestPublish(request: CanonicalPublishRequest) {
  if (request.mediaUrls?.length) {
    await runMediaPipeline(
      request.mediaUrls.map((url) => ({ url, providerId: request.providerId })),
    );
  }

  await marketingEventBus.emit("PUBLISH_REQUESTED", {
    jobId: request.idempotencyKey,
    providerId: request.providerId,
  });

  return enqueueMarketingJob({
    jobType: "publish",
    idempotencyKey: request.idempotencyKey,
    providerId: request.providerId,
    connectionId: request.connectionId,
    accountId: request.accountId,
    payload: request as unknown as Record<string, unknown>,
    scheduledAt: request.scheduledAt ? new Date(request.scheduledAt) : undefined,
    workflowStage: "queued",
  });
}
