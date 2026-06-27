import type {
  SeoPlatformEventHandler,
  SeoPlatformEventMap,
  SeoPlatformEventType,
} from "./events";

type HandlerEntry = {
  type: SeoPlatformEventType;
  handler: SeoPlatformEventHandler<SeoPlatformEventType>;
};

export class SeoEventBus {
  private handlers: HandlerEntry[] = [];

  on<T extends SeoPlatformEventType>(type: T, handler: SeoPlatformEventHandler<T>): () => void {
    const entry = { type, handler: handler as SeoPlatformEventHandler<SeoPlatformEventType> };
    this.handlers.push(entry);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== entry);
    };
  }

  async emit<T extends SeoPlatformEventType>(
    type: T,
    payload: SeoPlatformEventMap[T]
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

export const seoEventBus = new SeoEventBus();
