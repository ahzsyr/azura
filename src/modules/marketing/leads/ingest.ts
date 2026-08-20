import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { CanonicalLeadEvent } from "@/modules/marketing/core/dto/types";
import { marketingEventBus } from "@/modules/marketing/core/events";
import { findProvider } from "@/modules/marketing/core/registry";

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
export async function ingestLeadEvent(event: CanonicalLeadEvent) {
  const existing = await prisma.marketingLeadEvent.findUnique({
    where: { idempotencyKey: event.idempotencyKey },
  });
  if (existing) return existing;

  const adapter = findProvider(event.providerId);
  let inquiryId: string | undefined;
  if (adapter?.ingestLead) {
    const result = await adapter.ingestLead(event);
    inquiryId = result.inquiryId;
  } else {
    const inquiry = await prisma.inquiry.create({
      data: {
        name: event.name ?? "Social Lead",
        email: event.email || "unknown@example.com",
        phone: event.phone ?? null,
        message:
          Object.entries(event.fields)
            .map(([k, v]) => `${k}: ${v}`)
            .join("\n") || "Lead imported from marketing provider",
        notes: `marketing:${event.providerId}`,
        status: "NEW",
      },
    });
    inquiryId = inquiry.id;
  }

  const row = await prisma.marketingLeadEvent.create({
    data: {
      providerId: event.providerId,
      externalLeadId: event.externalLeadId,
      formId: event.formId,
      payload: asJson(event.raw ?? {}),
      canonical: asJson(event),
      inquiryId,
      processingStatus: "completed",
      idempotencyKey: event.idempotencyKey,
    },
  });

  if (inquiryId) {
    await marketingEventBus.emit("LEAD_CREATED", {
      inquiryId,
      source: event.providerId,
    });
  }

  return row;
}
