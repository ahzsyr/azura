import "server-only";
import { prisma } from "@/lib/prisma";

export async function runRetentionPurge() {
  const policy =
    (await prisma.marketingRetentionPolicy.findFirst()) ??
    (await prisma.marketingRetentionPolicy.create({
      data: {},
    }));

  const now = Date.now();
  const visitorCutoff = new Date(now - policy.visitorDays * 86400000);
  const sessionCutoff = new Date(now - policy.sessionDays * 86400000);
  const touchCutoff = new Date(now - policy.touchDays * 86400000);
  const eventCutoff = new Date(now - policy.eventDays * 86400000);
  const payloadCutoff = new Date(now - policy.providerPayloadDays * 86400000);

  const [events, touches, sessions, visitors, webhooks] = await Promise.all([
    prisma.marketingEvent.deleteMany({ where: { createdAt: { lt: eventCutoff } } }),
    prisma.marketingTouch.deleteMany({ where: { createdAt: { lt: touchCutoff } } }),
    prisma.marketingSession.deleteMany({ where: { startedAt: { lt: sessionCutoff } } }),
    prisma.marketingVisitor.deleteMany({ where: { lastSeenAt: { lt: visitorCutoff } } }),
    prisma.marketingWebhookEvent.updateMany({
      where: { receivedAt: { lt: payloadCutoff } },
      data: { rawPayload: {}, normalizedPayload: {} },
    }),
  ]);

  return {
    ok: true,
    deleted: {
      events: events.count,
      touches: touches.count,
      sessions: sessions.count,
      visitors: visitors.count,
      webhookPayloadsCleared: webhooks.count,
    },
  };
}

export async function getOrCreateRetentionPolicy() {
  const existing = await prisma.marketingRetentionPolicy.findFirst();
  if (existing) return existing;
  return prisma.marketingRetentionPolicy.create({ data: {} });
}

export async function updateRetentionPolicy(input: {
  visitorDays?: number;
  sessionDays?: number;
  touchDays?: number;
  eventDays?: number;
  leadDays?: number;
  providerPayloadDays?: number;
}) {
  const current = await getOrCreateRetentionPolicy();
  return prisma.marketingRetentionPolicy.update({
    where: { id: current.id },
    data: input,
  });
}
