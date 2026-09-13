import type { PlatformCommand } from "../manifests/types";

export type CommandHandler = (command: PlatformCommand) => Promise<Record<string, unknown>>;

export class CommandBus {
  private readonly handlers = new Map<string, CommandHandler>();

  register(type: string, handler: CommandHandler): void {
    this.handlers.set(type, handler);
  }

  async execute(type: string, command: PlatformCommand): Promise<Record<string, unknown>> {
    const handler = this.handlers.get(type);
    if (!handler) throw new Error(`No handler registered for command: ${type}`);
    return handler(command);
  }
}

export const commandBus = new CommandBus();

export type PipelineContext = {
  command: PlatformCommand;
  data: Record<string, unknown>;
};

export type PipelineMiddleware = (
  ctx: PipelineContext,
  next: () => Promise<Record<string, unknown>>,
) => Promise<Record<string, unknown>>;

export function composeMiddleware(
  middlewares: PipelineMiddleware[],
  finalHandler: (ctx: PipelineContext) => Promise<Record<string, unknown>>,
): (ctx: PipelineContext) => Promise<Record<string, unknown>> {
  return async (ctx) => {
    let index = 0;
    const dispatch = async (): Promise<Record<string, unknown>> => {
      if (index >= middlewares.length) return finalHandler(ctx);
      const mw = middlewares[index++];
      return mw(ctx, dispatch);
    };
    return dispatch();
  };
}
