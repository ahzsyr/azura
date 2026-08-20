import { randomUUID } from "node:crypto";
import type {
  SeoExecutionContext,
  SeoExecutionMode,
  SeoExecutionSource,
  SeoExecutionTrigger,
} from "./types";

export type CreateExecutionContextInput = {
  entityType: string;
  entityId: string;
  locale: string;
  source: SeoExecutionSource;
  trigger: SeoExecutionTrigger;
  mode?: SeoExecutionMode;
  userId?: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
};

export function createExecutionContext(input: CreateExecutionContextInput): SeoExecutionContext {
  return {
    entityType: input.entityType,
    entityId: input.entityId,
    locale: input.locale,
    userId: input.userId,
    source: input.source,
    trigger: input.trigger,
    mode: input.mode ?? "preview",
    correlationId: input.correlationId ?? randomUUID(),
    metadata: input.metadata,
  };
}
