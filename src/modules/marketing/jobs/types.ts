export const MARKETING_JOB_TYPES = [
  "publish",
  "analytics_sync",
  "tracking_sync",
  "lead_sync",
  "webhook_processing",
  "token_refresh",
  "media_upload",
] as const;

export type MarketingJobType = (typeof MARKETING_JOB_TYPES)[number];

export const PUBLISH_WORKFLOW_STAGES = [
  "queued",
  "upload_media",
  "publish_content",
  "fetch_result",
  "record_outcome",
  "emit_event",
  "completed",
  "failed",
] as const;

export type PublishWorkflowStage = (typeof PUBLISH_WORKFLOW_STAGES)[number];

export type EnqueueMarketingJobInput = {
  jobType: MarketingJobType;
  idempotencyKey: string;
  providerId?: string;
  connectionId?: string;
  accountId?: string;
  payload?: Record<string, unknown>;
  workflowStage?: string;
  scheduledAt?: Date;
  maxAttempts?: number;
};
