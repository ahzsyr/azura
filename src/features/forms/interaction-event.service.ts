import "server-only";

import { prisma } from "@/lib/prisma";
import { interactionEventStore } from "@/platform/schema-ui/events/event-store";
import { createInteractionEvent } from "@/platform/schema-ui/events/event-bus";
import type { InteractionEvent, InteractionEventType } from "@/platform/schema-ui/manifests/types";

export type InteractionEventQuery = {
  type?: InteractionEventType | string;
  aggregateId?: string;
  since?: Date;
  take?: number;
};

function toInteractionEvent(row: {
  id: string;
  aggregateId: string;
  type: string;
  payload: unknown;
  metadata: unknown;
  createdAt: Date;
}): InteractionEvent {
  return {
    id: row.id,
    aggregateId: row.aggregateId,
    type: row.type as InteractionEventType,
    payload: (row.payload as Record<string, unknown>) ?? {},
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    timestamp: row.createdAt,
  };
}

/** Append to in-memory store and persist to InteractionEvent table. */
export async function appendInteractionEvent(
  aggregateId: string,
  type: InteractionEventType,
  payload: Record<string, unknown> = {},
  metadata: Record<string, unknown> = {},
): Promise<InteractionEvent> {
  const event = createInteractionEvent(aggregateId, type, payload, metadata);
  await interactionEventStore.append(event);

  await prisma.interactionEvent.create({
    data: {
      id: event.id,
      aggregateId: event.aggregateId,
      type: event.type,
      payload: event.payload as object,
      metadata: event.metadata as object,
      createdAt: event.timestamp,
    },
  });

  return event;
}

export async function queryInteractionEvents(
  filter: InteractionEventQuery = {},
): Promise<InteractionEvent[]> {
  const rows = await prisma.interactionEvent.findMany({
    where: {
      type: filter.type,
      aggregateId: filter.aggregateId,
      createdAt: filter.since ? { gte: filter.since } : undefined,
    },
    orderBy: { createdAt: "asc" },
    take: filter.take,
  });
  return rows.map(toInteractionEvent);
}

export async function getInteractionEventsForAggregate(
  aggregateId: string,
): Promise<InteractionEvent[]> {
  return queryInteractionEvents({ aggregateId });
}

export async function hydrateInteractionEventStore(aggregateIds: string[]): Promise<void> {
  if (aggregateIds.length === 0) return;
  const rows = await prisma.interactionEvent.findMany({
    where: { aggregateId: { in: aggregateIds } },
    orderBy: { createdAt: "asc" },
  });
  for (const row of rows) {
    interactionEventStore.replay(toInteractionEvent(row));
  }
}
