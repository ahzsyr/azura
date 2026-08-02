import type {
  MarketingEventHandler,
  MarketingEventMap,
  MarketingEventType,
} from "./catalog";

type HandlerEntry = {
  type: MarketingEventType;
  handler: MarketingEventHandler<MarketingEventType>;
};

export class MarketingEventBus {
  private handlers: HandlerEntry[] = [];

  on<T extends MarketingEventType>(type: T, handler: MarketingEventHandler<T>): () => void {
    const entry = {
      type,
      handler: handler as MarketingEventHandler<MarketingEventType>,
    };
    this.handlers.push(entry);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== entry);
    };
  }

  async emit<T extends MarketingEventType>(
    type: T,
    payload: MarketingEventMap[T],
  ): Promise<void> {
    const matching = this.handlers.filter((h) => h.type === type);
    for (const { handler } of matching) {
      await handler(payload);
    }
  }

  clear(): void {
    this.handlers = [];
  }
}

export const marketingEventBus = new MarketingEventBus();

export {
  MARKETING_EVENTS,
  type MarketingEventHandler,
  type MarketingEventMap,
  type MarketingEventType,
} from "./catalog";
