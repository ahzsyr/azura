import type {
  GoogleHistoryEntry,
  GoogleLifecycleEvent,
  GoogleLifecycleEventType,
  GoogleIntegrationId,
  GooglePlatformState,
} from "./types";

const MAX_EVENTS = 200;
const MAX_HISTORY = 500;

function id(): string {
  return `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function emitEvent(
  state: GooglePlatformState,
  type: GoogleLifecycleEventType,
  integrationId: GoogleIntegrationId | "global",
  message: string,
  meta?: Record<string, unknown>,
): GooglePlatformState {
  const event: GoogleLifecycleEvent = {
    id: id(),
    type,
    integrationId,
    timestamp: new Date().toISOString(),
    message,
    meta,
  };
  const events = [event, ...state.events].slice(0, MAX_EVENTS);
  const historyKind =
    type.startsWith("Connection")
      ? "connection"
      : type.startsWith("Sync") || type === "OperationExecuted"
        ? "operation"
        : type.includes("Failed") || type === "QuotaExceeded"
          ? "failure"
          : type === "ConfigUpdated"
            ? "config"
            : type === "PolicyUpdated"
              ? "policy"
              : "audit";

  const historyEntry: GoogleHistoryEntry = {
    id: event.id,
    integrationId,
    kind: historyKind,
    title: type,
    detail: message,
    timestamp: event.timestamp,
    ok: !type.includes("Failed") && type !== "ConnectionLost" && type !== "QuotaExceeded" && type !== "WorkerStopped",
  };

  return {
    ...state,
    events,
    history: [historyEntry, ...state.history].slice(0, MAX_HISTORY),
  };
}

export function listEventsFor(
  state: GooglePlatformState,
  integrationId: GoogleIntegrationId | "global",
  limit = 50,
): GoogleLifecycleEvent[] {
  return state.events.filter((e) => e.integrationId === integrationId || integrationId === "global").slice(0, limit);
}

export function listHistoryFor(
  state: GooglePlatformState,
  integrationId: GoogleIntegrationId | "global",
  limit = 50,
): GoogleHistoryEntry[] {
  return state.history
    .filter((h) => h.integrationId === integrationId || integrationId === "global")
    .slice(0, limit);
}
