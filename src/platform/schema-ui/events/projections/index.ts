import type { InteractionEvent } from "../../manifests/types";
import { interactionEventStore, projectAggregateFromEvents } from "../event-store";

export type InboxProjectionItem = {
  id: string;
  schemaId: string;
  status: string;
  score: number;
  payload: Record<string, unknown>;
  assigneeId?: string;
  tags: string[];
  submittedAt?: Date;
};

export class InboxProjection {
  getItems(filters?: {
    schemaId?: string;
    status?: string;
    assigneeId?: string;
  }): InboxProjectionItem[] {
    const submitted = interactionEventStore.query({ type: "interaction.submitted" });
    const aggregateIds = [...new Set(submitted.map((e) => e.aggregateId))];
    const items: InboxProjectionItem[] = [];

    for (const id of aggregateIds) {
      const events = interactionEventStore.getEvents(id);
      const aggregate = projectAggregateFromEvents(id, events);
      if (!aggregate) continue;
      if (filters?.schemaId && aggregate.schemaId !== filters.schemaId) continue;
      if (filters?.status && aggregate.status !== filters.status) continue;
      if (filters?.assigneeId && aggregate.assigneeId !== filters.assigneeId) continue;
      const submittedEvent = events.find((e) => e.type === "interaction.submitted");
      items.push({
        id: aggregate.id,
        schemaId: aggregate.schemaId,
        status: aggregate.status,
        score: aggregate.score ?? 0,
        payload: aggregate.payload,
        assigneeId: aggregate.assigneeId,
        tags: aggregate.tags,
        submittedAt: submittedEvent?.timestamp,
      });
    }

    return items.sort((a, b) => (b.submittedAt?.getTime() ?? 0) - (a.submittedAt?.getTime() ?? 0));
  }
}

export const inboxProjection = new InboxProjection();

export type OperationalMetric = {
  submissions: number;
  avgScore: number;
  assigned: number;
};

export class OperationalAnalyticsProjection {
  compute(since?: Date): OperationalMetric {
    const events = interactionEventStore.query({ type: "interaction.submitted", since });
    const scores = events.map((e) => Number(e.payload.score ?? 0));
    const assigned = interactionEventStore.query({ type: "interaction.assigned", since }).length;
    return {
      submissions: events.length,
      avgScore: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
      assigned,
    };
  }
}

export const operationalAnalyticsProjection = new OperationalAnalyticsProjection();

export type BehaviorMetric = {
  views: number;
  focusEvents: number;
  blurEvents: number;
  abandons: number;
  completions: number;
};

export class BehaviorAnalyticsProjection {
  private readonly behaviorEvents: InteractionEvent[] = [];

  record(event: InteractionEvent): void {
    if (
      event.type === "schema.viewed" ||
      event.type === "binding.focused" ||
      event.type === "binding.blurred" ||
      event.type === "binding.changed"
    ) {
      this.behaviorEvents.push(event);
    }
  }

  compute(schemaId?: string): BehaviorMetric {
    const events = schemaId
      ? this.behaviorEvents.filter((e) => e.payload.schemaId === schemaId)
      : this.behaviorEvents;
    return {
      views: events.filter((e) => e.type === "schema.viewed").length,
      focusEvents: events.filter((e) => e.type === "binding.focused").length,
      blurEvents: events.filter((e) => e.type === "binding.blurred").length,
      abandons: events.filter((e) => e.metadata.abandoned === true).length,
      completions: events.filter((e) => e.type === "interaction.submitted").length,
    };
  }
}

export const behaviorAnalyticsProjection = new BehaviorAnalyticsProjection();
