import "server-only";
import { createHash, createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { findProvider } from "@/modules/marketing/core/registry";
import { marketingEventBus } from "@/modules/marketing/core/events";
import { enqueueMarketingJob } from "@/modules/marketing/jobs";

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export async function ingestMarketingWebhook(params: {
  providerId: string;
  rawBody: string;
  headers: Record<string, string>;
  parsedBody?: unknown;
}) {
  const adapter = findProvider(params.providerId);
  if (!adapter) {
    throw new Error(`Unknown marketing provider: ${params.providerId}`);
  }

  let signatureValid = false;
  if (adapter.verifyWebhookSignature) {
    signatureValid = await adapter.verifyWebhookSignature(params.rawBody, params.headers);
  } else {
    const { getProviderAppCredentials } = await import("@/modules/marketing/providers/app-config");
    const credentials = await getProviderAppCredentials(params.providerId);
    const secret = credentials.appSecret?.trim() || credentials.clientSecret?.trim();
    const provided =
      params.headers["x-hub-signature-256"] ||
      params.headers["x-linkedin-signature"] ||
      params.headers["x-signature"] ||
      "";
    if (secret && provided) {
      const digest = `sha256=${createHmac("sha256", secret).update(params.rawBody).digest("hex")}`;
      signatureValid = safeEqual(digest, provided);
    }
  }

  if (!signatureValid) {
    const failed = await prisma.marketingWebhookEvent.create({
      data: {
        providerId: params.providerId,
        eventType: "unverified",
        signatureValid: false,
        status: "FAILED",
        rawPayload: asJson(params.parsedBody ?? {}),
        processingError: "Invalid webhook signature",
      },
    });
    return failed;
  }

  const normalized = adapter.mapWebhook
    ? await adapter.mapWebhook(params.parsedBody ?? {}, params.headers)
    : {
        providerId: params.providerId,
        eventType: "generic",
        occurredAt: new Date().toISOString(),
        payload: params.parsedBody ?? {},
        signatureValid: true,
      };

  if (!normalized) {
    throw new Error("Webhook mapping returned null");
  }

  const externalEventId =
    normalized.externalEventId ??
    createHash("sha256").update(`${params.providerId}:${params.rawBody}`).digest("hex").slice(0, 64);

  const existing = await prisma.marketingWebhookEvent.findUnique({
    where: {
      providerId_externalEventId: {
        providerId: params.providerId,
        externalEventId,
      },
    },
  });
  if (existing) return existing;

  const event = await prisma.marketingWebhookEvent.create({
    data: {
      providerId: params.providerId,
      eventType: normalized.eventType,
      externalEventId,
      signatureValid: true,
      status: "VERIFIED",
      rawPayload: asJson(params.parsedBody ?? {}),
      normalizedPayload: asJson(normalized),
    },
  });

  await marketingEventBus.emit("WEBHOOK_RECEIVED", {
    providerId: params.providerId,
    eventType: normalized.eventType,
    webhookEventId: event.id,
  });

  await enqueueMarketingJob({
    jobType: "webhook_processing",
    idempotencyKey: `webhook:${event.id}`,
    providerId: params.providerId,
    payload: { webhookEventId: event.id, eventType: normalized.eventType },
  });

  return event;
}
