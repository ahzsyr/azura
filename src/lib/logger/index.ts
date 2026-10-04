/**
 * Thin structured logger for Hostinger / ops (Phase 5).
 * JSON lines to console — no APM platform.
 */

export type LogLevel = "info" | "warn" | "error";

export type StructuredLogFields = {
  entity?: string;
  entityId?: string;
  actor?: string;
  locale?: string;
  jobId?: string;
  durationMs?: number;
  error?: string;
  [key: string]: unknown;
};

function emit(level: LogLevel, event: string, fields?: StructuredLogFields): void {
  const record = {
    ts: new Date().toISOString(),
    level,
    event,
    ...fields,
  };
  const line = JSON.stringify(record);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export const logger = {
  info(event: string, fields?: StructuredLogFields) {
    emit("info", event, fields);
  },
  warn(event: string, fields?: StructuredLogFields) {
    emit("warn", event, fields);
  },
  error(event: string, fields?: StructuredLogFields) {
    emit("error", event, fields);
  },
};

/** Canonical event names for Phase 5 ops. */
export const LogEvents = {
  cmsPublish: "cms.publish",
  cmsUnpublish: "cms.unpublish",
  cmsRestore: "cms.restore",
  mediaUpload: "media.upload",
  mediaDelete: "media.delete",
  webhookDispatch: "webhook.dispatch",
  webhookFailure: "webhook.failure",
  jobStarted: "job.started",
  jobCompleted: "job.completed",
  jobFailed: "job.failed",
  jobReclaimed: "job.reclaimed",
} as const;
