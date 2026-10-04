import "server-only";

import { validateWebhookDestination } from "@/lib/ssrf-guard";
import { LogEvents, logger } from "@/lib/logger";

export type WebhookEventType =
  | "cms.page.published"
  | "cms.page.unpublished"
  | "cms.post.published"
  | "cms.post.unpublished"
  | "media.uploaded"
  | "form.submitted";

export type WebhookPayload = {
  type: WebhookEventType;
  occurredAt: string;
  data: Record<string, unknown>;
};

function listWebhookEndpoints(): string[] {
  return (process.env.WEBHOOK_ENDPOINTS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Best-effort outbound webhook dispatcher (no outbox).
 * Domain writes must never await this in a way that can roll back.
 * Production requires WEBHOOK_SIGNING_SECRET when endpoints are configured.
 */
export async function dispatchWebhook(payload: WebhookPayload): Promise<void> {
  const endpoints = listWebhookEndpoints();
  if (endpoints.length === 0) return;

  const secret = process.env.WEBHOOK_SIGNING_SECRET?.trim() ?? "";
  if (process.env.NODE_ENV === "production" && !secret) {
    logger.error(LogEvents.webhookFailure, {
      error: "WEBHOOK_SIGNING_SECRET required in production when WEBHOOK_ENDPOINTS is set",
      entity: payload.type,
    });
    return;
  }

  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-azura-event": payload.type,
  };
  if (secret) {
    const { createHmac } = await import("node:crypto");
    headers["x-azura-signature"] = createHmac("sha256", secret).update(body).digest("hex");
  }

  await Promise.allSettled(
    endpoints.map(async (rawUrl) => {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const url = await validateWebhookDestination(rawUrl);
          const res = await fetch(url.href, {
            method: "POST",
            headers,
            body,
            redirect: "error",
          });
          if (res.ok) {
            logger.info(LogEvents.webhookDispatch, {
              entity: payload.type,
              entityId: String(payload.data.id ?? payload.data.pageId ?? ""),
            });
            return;
          }
          logger.error(LogEvents.webhookFailure, {
            entity: payload.type,
            error: `status=${res.status}`,
          });
        } catch (error) {
          logger.error(LogEvents.webhookFailure, {
            entity: payload.type,
            error: error instanceof Error ? error.message : String(error),
          });
        }
        await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
      }
    }),
  );
}

/** Fire-and-forget helper that never throws to the caller. */
export function dispatchWebhookFireAndForget(payload: WebhookPayload): void {
  void dispatchWebhook(payload).catch((error) => {
    console.error("[webhooks] unexpected dispatch error:", error);
  });
}
