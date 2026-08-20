import type { AuditEvent, AuditEventKind } from "../types";
import { createEntityUuid } from "../entity-graph/ids";

export function createAuditLog() {
  const events: AuditEvent[] = [];

  function emit(kind: AuditEventKind, payload: Record<string, unknown>, actor?: string | null): AuditEvent {
    const event: AuditEvent = {
      id: createEntityUuid(),
      kind,
      at: new Date().toISOString(),
      actor: actor ?? null,
      payload,
    };
    events.push(event);
    return event;
  }

  return {
    emit,
    list(filter?: { kind?: AuditEventKind }) {
      if (!filter?.kind) return [...events];
      return events.filter((e) => e.kind === filter.kind);
    },
    clear() {
      events.length = 0;
    },
  };
}

export type AuditLog = ReturnType<typeof createAuditLog>;
