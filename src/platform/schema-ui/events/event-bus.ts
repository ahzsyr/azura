import type { InteractionEvent, InteractionEventType } from "../manifests/types";

type EventHandler = (event: InteractionEvent) => void | Promise<void>;

export class EventBus {
  private readonly handlers = new Map<string, Set<EventHandler>>();

  on(type: InteractionEventType | string, handler: EventHandler): () => void {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(handler);
    return () => this.handlers.get(type)?.delete(handler);
  }

  async emit(event: InteractionEvent): Promise<void> {
    const handlers = this.handlers.get(event.type) ?? new Set();
    const wildcard = this.handlers.get("*") ?? new Set();
    await Promise.all([...handlers, ...wildcard].map((h) => h(event)));
  }
}

export const platformEventBus = new EventBus();

export function createInteractionEvent(
  aggregateId: string,
  type: InteractionEventType,
  payload: Record<string, unknown> = {},
  metadata: Record<string, unknown> = {},
): InteractionEvent {
  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    aggregateId,
    type,
    payload,
    metadata,
    timestamp: new Date(),
  };
}
