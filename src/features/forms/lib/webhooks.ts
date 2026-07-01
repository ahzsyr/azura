import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import type { FormWebhookConfig } from "@/features/forms/types";

export function signWebhookPayload(body: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

export async function dispatchWebhooks(
  submissionId: string,
  webhooks: FormWebhookConfig[],
  payload: Record<string, unknown>,
): Promise<void> {
  const secret = process.env.WEBHOOK_SIGNING_SECRET ?? "azura-webhook-dev";
  const body = JSON.stringify({ submissionId, payload, timestamp: new Date().toISOString() });
  const signature = signWebhookPayload(body, secret);

  for (const hook of webhooks) {
    if (!hook.events.includes("submit")) continue;

    const delivery = await prisma.formWebhookDelivery.create({
      data: {
        submissionId,
        url: hook.url,
        status: "PENDING",
      },
    });

    try {
      const res = await fetch(hook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
          ...(hook.headers ?? {}),
        },
        body,
      });

      await prisma.formWebhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: res.ok ? "SUCCESS" : "FAILED",
          responseCode: res.status,
          error: res.ok ? null : await res.text().catch(() => "Request failed"),
        },
      });

      if (!res.ok) {
        await retryWebhookOnce(delivery.id, hook.url, body, signature, hook.headers);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Webhook failed";
      await prisma.formWebhookDelivery.update({
        where: { id: delivery.id },
        data: { status: "FAILED", error: message },
      });
    }
  }
}

async function retryWebhookOnce(
  deliveryId: string,
  url: string,
  body: string,
  signature: string,
  headers?: Record<string, string>,
) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
        ...(headers ?? {}),
      },
      body,
    });
    await prisma.formWebhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: res.ok ? "SUCCESS" : "FAILED",
        responseCode: res.status,
        error: res.ok ? null : "Retry failed",
      },
    });
  } catch (err) {
    await prisma.formWebhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: "FAILED",
        error: err instanceof Error ? err.message : "Retry failed",
      },
    });
  }
}
