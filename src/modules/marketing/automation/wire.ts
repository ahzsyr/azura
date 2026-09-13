import { marketingEventBus } from "@/modules/marketing/core/events";
import { dispatchTrackingEvent } from "@/modules/marketing/tracking/dispatcher";
import { enqueueMarketingJob } from "@/modules/marketing/jobs";
import { isMarketingCapabilityEnabled } from "@/modules/marketing/feature-flags";

let wired = false;

export function wireMarketingAutomation() {
  if (wired) return;
  wired = true;

  marketingEventBus.on("CMS_POST_PUBLISHED", async (payload) => {
    if (!isMarketingCapabilityEnabled("publishing")) return;
    await enqueueMarketingJob({
      jobType: "publish",
      idempotencyKey: `auto-publish:post:${payload.postId}`,
      payload: {
        text: payload.title ?? `New post published`,
        linkUrl: payload.slug ? `/${payload.slug}` : undefined,
        source: "CMS_POST_PUBLISHED",
        postId: payload.postId,
      },
    });
  });

  marketingEventBus.on("FORM_SUBMITTED", async (payload) => {
    if (!isMarketingCapabilityEnabled("tracking")) return;
    await dispatchTrackingEvent({
      idempotencyKey: `form:${payload.submissionId}`,
      name: "FormSubmitted",
      occurredAt: new Date().toISOString(),
      source: "forms",
      properties: { submissionId: payload.submissionId, formId: payload.formId },
    });
  });

  marketingEventBus.on("LEAD_CREATED", async (payload) => {
    if (!isMarketingCapabilityEnabled("tracking")) return;
    await dispatchTrackingEvent({
      idempotencyKey: `lead:${payload.inquiryId}`,
      name: "LeadGenerated",
      occurredAt: new Date().toISOString(),
      source: payload.source ?? "crm",
      properties: { inquiryId: payload.inquiryId },
    });
  });
}
