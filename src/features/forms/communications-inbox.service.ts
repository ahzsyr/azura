import "server-only";

import { listFormSubmissions } from "@/features/forms/form-submission.service";
import { hydrateInteractionEventStore, queryInteractionEvents } from "@/features/forms/interaction-event.service";
import { inboxProjection } from "@/platform/schema-ui/events/projections";
import type { InteractionEvent } from "@/platform/schema-ui/manifests/types";

export type CommunicationsInboxRow = {
  id: string;
  score: number;
  status: string;
  blockType: string | null;
  pageSlug: string | null;
  locale: string;
  pipelineType: string | null;
  assigneeId: string | null;
  tags: string[];
  eventCount: number;
  submittedAt: Date | null;
  createdAt: Date;
  template: { name: string; slug: string; category: string } | null;
  payload: unknown;
  utm: unknown;
};

function parseTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((t): t is string => typeof t === "string");
}

function groupEventsByAggregate(events: InteractionEvent[]): Map<string, InteractionEvent[]> {
  const grouped = new Map<string, InteractionEvent[]>();
  for (const event of events) {
    const list = grouped.get(event.aggregateId) ?? [];
    list.push(event);
    grouped.set(event.aggregateId, list);
  }
  return grouped;
}

/**
 * Communications inbox: FormSubmission as materialized read model,
 * enriched from InteractionEvent projections when events exist.
 */
export async function listCommunicationsInbox(filters?: {
  status?: "NEW" | "REVIEWED" | "ARCHIVED";
  templateId?: string;
  pipelineType?: string;
  assigneeId?: string;
}): Promise<CommunicationsInboxRow[]> {
  const submissions = await listFormSubmissions({
    status: filters?.status,
    templateId: filters?.templateId,
    pipelineType: filters?.pipelineType,
    assigneeId: filters?.assigneeId,
  });

  const ids = submissions.map((s) => s.id);
  await hydrateInteractionEventStore(ids);

  const allEvents = ids.length > 0 ? await queryInteractionEvents({ take: 5000 }) : [];
  const relevantEvents = allEvents.filter((e) => ids.includes(e.aggregateId));
  const eventsByAggregate = groupEventsByAggregate(relevantEvents);

  const projectionItems = inboxProjection.getItems();
  const projectionById = new Map(projectionItems.map((item) => [item.id, item]));

  return submissions.map((s) => {
    const events = eventsByAggregate.get(s.id) ?? [];
    const projection = projectionById.get(s.id);

    return {
      id: s.id,
      score: projection?.score ?? s.score,
      status: s.status,
      blockType: s.blockType,
      pageSlug: s.pageSlug,
      locale: s.locale,
      pipelineType: s.pipelineType,
      assigneeId: s.assigneeId ?? projection?.assigneeId ?? null,
      tags: parseTags(s.tags).length > 0 ? parseTags(s.tags) : (projection?.tags ?? []),
      eventCount: events.length,
      submittedAt: projection?.submittedAt ?? null,
      createdAt: s.createdAt,
      template: s.template,
      payload: s.payload,
      utm: s.utm,
    };
  });
}
