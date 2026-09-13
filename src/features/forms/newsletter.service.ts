import "server-only";

import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendNewsletterConfirmation } from "@/features/email/templates";
import { assertSafeOutboundUrl, safeOutboundFetch } from "@/lib/ssrf-guard";
import { cmsRepository } from "@/repositories/cms.repository";

function createConfirmToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

/** Resolve webhook URL from published CMS block config only — never from the client. */
async function resolveNewsletterWebhookFromBlock(
  blockId?: string,
  pageSlug?: string,
): Promise<string | undefined> {
  if (!blockId || !pageSlug) return undefined;
  try {
    const page = await cmsRepository.getPageBySlug(pageSlug, true);
    if (!page?.blocks || !Array.isArray(page.blocks)) return undefined;
    for (const block of page.blocks as Array<{ id?: string; type?: string; props?: Record<string, unknown> }>) {
      if (block.id !== blockId) continue;
      const url = typeof block.props?.webhookUrl === "string" ? block.props.webhookUrl.trim() : "";
      if (!url) return undefined;
      const check = assertSafeOutboundUrl(url);
      return check.ok ? check.url.href : undefined;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export async function subscribeNewsletter(input: {
  email: string;
  name?: string;
  segment: string;
  locale: string;
  doubleOptIn: boolean;
  blockId?: string;
  pageSlug?: string;
}) {
  const existing = await prisma.newsletterSubscriber.findUnique({
    where: { email_segment: { email: input.email, segment: input.segment } },
  });

  if (existing?.status === "CONFIRMED") {
    return { id: existing.id, status: "CONFIRMED" as const, alreadySubscribed: true };
  }

  const confirmToken = input.doubleOptIn ? createConfirmToken() : null;
  const status = input.doubleOptIn ? "PENDING" : "CONFIRMED";
  const serverWebhookUrl = await resolveNewsletterWebhookFromBlock(input.blockId, input.pageSlug);

  const metadata = {
    blockId: input.blockId,
    pageSlug: input.pageSlug,
    ...(serverWebhookUrl ? { webhookUrl: serverWebhookUrl } : {}),
  };

  const subscriber = existing
    ? await prisma.newsletterSubscriber.update({
        where: { id: existing.id },
        data: {
          name: input.name,
          status,
          confirmToken,
          confirmedAt: input.doubleOptIn ? null : new Date(),
          locale: input.locale,
          metadata: metadata as object,
        },
      })
    : await prisma.newsletterSubscriber.create({
        data: {
          email: input.email,
          name: input.name,
          segment: input.segment,
          status,
          confirmToken,
          confirmedAt: input.doubleOptIn ? null : new Date(),
          locale: input.locale,
          metadata: metadata as object,
        },
      });

  if (input.doubleOptIn && confirmToken) {
    const confirmUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/api/newsletter/confirm/${confirmToken}`;
    await sendNewsletterConfirmation({
      to: input.email,
      name: input.name,
      confirmUrl,
      locale: input.locale,
    });
  } else if (serverWebhookUrl) {
    void dispatchNewsletterWebhook(serverWebhookUrl, subscriber);
  }

  return { id: subscriber.id, status: subscriber.status, alreadySubscribed: false };
}

export async function confirmNewsletter(token: string) {
  const subscriber = await prisma.newsletterSubscriber.findUnique({
    where: { confirmToken: token },
  });
  if (!subscriber) return null;

  const updated = await prisma.newsletterSubscriber.update({
    where: { id: subscriber.id },
    data: {
      status: "CONFIRMED",
      confirmedAt: new Date(),
      confirmToken: null,
    },
  });

  const meta = subscriber.metadata as { webhookUrl?: string; blockId?: string; pageSlug?: string } | null;
  let webhookUrl = meta?.webhookUrl;
  if (!webhookUrl && meta?.blockId && meta?.pageSlug) {
    webhookUrl = await resolveNewsletterWebhookFromBlock(meta.blockId, meta.pageSlug);
  }
  if (webhookUrl) {
    void dispatchNewsletterWebhook(webhookUrl, updated);
  }

  return updated;
}

async function dispatchNewsletterWebhook(
  url: string,
  subscriber: { id: string; email: string; segment: string; status: string },
) {
  try {
    await safeOutboundFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "newsletter.confirmed",
        subscriber,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch {
    // non-blocking
  }
}

export async function listNewsletterSubscribers(filters?: {
  segment?: string;
  status?: "PENDING" | "CONFIRMED" | "UNSUBSCRIBED";
}) {
  return prisma.newsletterSubscriber.findMany({
    where: {
      segment: filters?.segment,
      status: filters?.status,
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
}

export async function resendNewsletterConfirmation(id: string) {
  const subscriber = await prisma.newsletterSubscriber.findUnique({ where: { id } });
  if (!subscriber || subscriber.status !== "PENDING") return false;

  let token = subscriber.confirmToken;
  if (!token) {
    token = createConfirmToken();
    await prisma.newsletterSubscriber.update({
      where: { id },
      data: { confirmToken: token },
    });
  }

  const confirmUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/api/newsletter/confirm/${token}`;
  await sendNewsletterConfirmation({
    to: subscriber.email,
    name: subscriber.name ?? undefined,
    confirmUrl,
    locale: subscriber.locale,
  });
  return true;
}

export { subscribersToCsv } from "@/features/forms/newsletter-csv";
