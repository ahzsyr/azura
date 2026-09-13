import type { InteractionEvent } from "../manifests/types";
import { platformEventBus } from "./event-bus";

export class EventStore {
  private readonly events: InteractionEvent[] = [];

  async append(event: InteractionEvent): Promise<void> {
    this.events.push(event);
    await platformEventBus.emit(event);
  }

  /** Load persisted events without re-emitting to the bus. */
  replay(event: InteractionEvent): void {
    if (this.events.some((e) => e.id === event.id)) return;
    this.events.push(event);
  }

  getEvents(aggregateId: string): InteractionEvent[] {
    return this.events.filter((e) => e.aggregateId === aggregateId);
  }

  getAllEvents(): InteractionEvent[] {
    return [...this.events];
  }

  query(filter: {
    type?: string;
    aggregateId?: string;
    since?: Date;
  }): InteractionEvent[] {
    return this.events.filter((e) => {
      if (filter.type && e.type !== filter.type) return false;
      if (filter.aggregateId && e.aggregateId !== filter.aggregateId) return false;
      if (filter.since && e.timestamp < filter.since) return false;
      return true;
    });
  }

  clear(): void {
    this.events.length = 0;
  }
}

export const interactionEventStore = new EventStore();

export type InteractionAggregate = {
  id: string;
  schemaId: string;
  status: string;
  payload: Record<string, unknown>;
  score?: number;
  assigneeId?: string;
  tags: string[];
  entityRefs: Record<string, string | undefined>;
  metadata: Record<string, unknown>;
  version: number;
};

export function projectAggregateFromEvents(aggregateId: string, events: InteractionEvent[]): InteractionAggregate | null {
  let aggregate: InteractionAggregate | null = null;
  for (const event of events) {
    switch (event.type) {
      case "interaction.created":
        aggregate = {
          id: aggregateId,
          schemaId: String(event.payload.schemaId ?? ""),
          status: "NEW",
          payload: {},
          tags: [],
          entityRefs: {},
          metadata: event.metadata,
          version: 1,
        };
        break;
      case "interaction.submitted":
        if (aggregate) {
          aggregate.payload = (event.payload.payload as Record<string, unknown>) ?? {};
          aggregate.score = Number(event.payload.score ?? 0);
          aggregate.status = "SUBMITTED";
          aggregate.version += 1;
        }
        break;
      case "interaction.assigned":
        if (aggregate) aggregate.assigneeId = String(event.payload.assigneeId ?? "");
        break;
      case "interaction.tagged":
        if (aggregate) aggregate.tags = (event.payload.tags as string[]) ?? aggregate.tags;
        break;
      case "interaction.archived":
        if (aggregate) aggregate.status = "ARCHIVED";
        break;
      default:
        break;
    }
  }
  return aggregate;
}
