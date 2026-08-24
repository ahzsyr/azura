import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { attributionService } from "@/modules/marketing/attribution/service";
import { marketingEventService } from "@/modules/marketing/events/service";

export type RecordConversionInput = {
  idempotencyKey: string;
  conversionDefinitionKey: string;
  visitorId?: string | null;
  sessionId?: string | null;
  touchId?: string | null;
  internalCampaignId?: string | null;
  externalAdId?: string | null;
  landingPagePath?: string | null;
  sourceId?: string | null;
  leadId?: string | null;
  submissionId?: string | null;
  clientOccurredAt: string;
  metadata?: Record<string, unknown>;
};

export const conversionService = {
  async listDefinitions() {
    return prisma.marketingConversionDefinition.findMany({ orderBy: { name: "asc" } });
  },

  async upsertDefinition(input: {
    key: string;
    name: string;
    description?: string | null;
    triggerType: string;
    triggerConfig?: Record<string, unknown>;
    value?: number | null;
    currency?: string | null;
    enabled?: boolean;
  }) {
    return prisma.marketingConversionDefinition.upsert({
      where: { key: input.key },
      create: {
        key: input.key,
        name: input.name,
        description: input.description ?? null,
        triggerType: input.triggerType,
        triggerConfig: (input.triggerConfig ?? {}) as Prisma.InputJsonValue,
        value: input.value ?? null,
        currency: input.currency ?? null,
        enabled: input.enabled ?? true,
      },
      update: {
        name: input.name,
        description: input.description ?? null,
        triggerType: input.triggerType,
        triggerConfig: (input.triggerConfig ?? {}) as Prisma.InputJsonValue,
        value: input.value ?? null,
        currency: input.currency ?? null,
        enabled: input.enabled ?? true,
      },
    });
  },

  async record(input: RecordConversionInput) {
    const existing = await prisma.marketingConversion.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existing) return { conversion: existing, created: false };

    const definition = await prisma.marketingConversionDefinition.findUnique({
      where: { key: input.conversionDefinitionKey },
    });
    if (!definition || !definition.enabled) {
      throw new Error(`Conversion definition not found or disabled: ${input.conversionDefinitionKey}`);
    }

    let touchId = input.touchId ?? null;
    let sourceId = input.sourceId ?? null;
    let internalCampaignId = input.internalCampaignId ?? null;

    if (input.visitorId) {
      const lastTouch = await attributionService.getLastTouch(
        input.visitorId,
        new Date(input.clientOccurredAt),
      );
      if (!touchId) touchId = lastTouch?.id ?? null;
      if (!sourceId) sourceId = lastTouch?.sourceId ?? null;
      if (!internalCampaignId) internalCampaignId = lastTouch?.internalCampaignId ?? null;
    }

    const conversion = await prisma.marketingConversion.create({
      data: {
        idempotencyKey: input.idempotencyKey,
        visitorId: input.visitorId ?? null,
        sessionId: input.sessionId ?? null,
        touchId,
        internalCampaignId,
        externalAdId: input.externalAdId ?? null,
        landingPagePath: input.landingPagePath ?? null,
        sourceId,
        leadId: input.leadId ?? null,
        submissionId: input.submissionId ?? null,
        conversionDefinitionId: definition.id,
        clientOccurredAt: new Date(input.clientOccurredAt),
        serverReceivedAt: new Date(),
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });

    await marketingEventService.ingest({
      idempotencyKey: `event:${input.idempotencyKey}`,
      name: "Conversion",
      visitorId: input.visitorId,
      sessionId: input.sessionId,
      touchId,
      internalCampaignId,
      landingPagePath: input.landingPagePath,
      sourceId,
      clientOccurredAt: input.clientOccurredAt,
      properties: {
        conversionId: conversion.id,
        conversionKey: definition.key,
        submissionId: input.submissionId,
        leadId: input.leadId,
      },
    });

    return { conversion, created: true };
  },

  async listRecent(limit = 50) {
    return prisma.marketingConversion.findMany({
      take: limit,
      orderBy: { clientOccurredAt: "desc" },
      include: {
        conversionDefinition: true,
        source: true,
        internalCampaign: true,
      },
    });
  },
};
