export const MARKETING_EVENTS = [
  "CMS_POST_PUBLISHED",
  "CMS_POST_UPDATED",
  "CMS_PAGE_PUBLISHED",
  "MEDIA_UPLOADED",
  "FORM_SUBMITTED",
  "LEAD_CREATED",
  "PUBLISH_REQUESTED",
  "PUBLISH_COMPLETED",
  "PUBLISH_FAILED",
  "ANALYTICS_SYNC_REQUESTED",
  "ANALYTICS_SYNC_COMPLETED",
  "WEBHOOK_RECEIVED",
  "TOKEN_REFRESH_REQUIRED",
  "TOKEN_REFRESH_COMPLETED",
  "CONNECTION_HEALTH_CHANGED",
] as const;

export type MarketingEventType = (typeof MARKETING_EVENTS)[number];

export type MarketingEventMap = {
  CMS_POST_PUBLISHED: { postId: string; locale?: string; slug?: string; title?: string };
  CMS_POST_UPDATED: { postId: string; locale?: string };
  CMS_PAGE_PUBLISHED: { pageId: string; locale?: string; slug?: string };
  MEDIA_UPLOADED: { mediaId: string; url: string; mimeType?: string };
  FORM_SUBMITTED: { submissionId: string; formId?: string };
  LEAD_CREATED: { inquiryId: string; source?: string };
  PUBLISH_REQUESTED: { jobId: string; providerId: string };
  PUBLISH_COMPLETED: { jobId: string; providerId: string; externalPostId?: string };
  PUBLISH_FAILED: { jobId: string; providerId: string; error: string };
  ANALYTICS_SYNC_REQUESTED: { providerId: string; accountId?: string };
  ANALYTICS_SYNC_COMPLETED: { providerId: string; accountId?: string; metricCount: number };
  WEBHOOK_RECEIVED: { providerId: string; eventType: string; webhookEventId: string };
  TOKEN_REFRESH_REQUIRED: { connectionId: string; providerId: string };
  TOKEN_REFRESH_COMPLETED: { connectionId: string; providerId: string; ok: boolean };
  CONNECTION_HEALTH_CHANGED: {
    connectionId: string;
    providerId: string;
    ok: boolean;
    summary: string;
  };
};

export type MarketingEventHandler<T extends MarketingEventType> = (
  payload: MarketingEventMap[T],
) => void | Promise<void>;
