export type SyncEntityKind = "accounts" | "assets" | "analytics" | "permissions" | "credentials";

export type SyncStatus = "idle" | "running" | "success" | "failed" | "scheduled";

export type MarketingSyncStateRecord = {
  id: string;
  providerId: string;
  entity: SyncEntityKind;
  entityId?: string | null;
  lastSuccessfulSync?: string | null;
  lastAttempt?: string | null;
  nextScheduled?: string | null;
  status: SyncStatus;
  failureReason?: string | null;
};

const memory = new Map<string, MarketingSyncStateRecord>();

function key(providerId: string, entity: SyncEntityKind, entityId?: string | null) {
  return `${providerId}:${entity}:${entityId ?? "*"}`;
}

export const marketingSyncState = {
  get(providerId: string, entity: SyncEntityKind, entityId?: string | null) {
    return memory.get(key(providerId, entity, entityId));
  },

  markAttempt(providerId: string, entity: SyncEntityKind, entityId?: string | null) {
    const k = key(providerId, entity, entityId);
    const existing = memory.get(k);
    const next: MarketingSyncStateRecord = {
      id: existing?.id ?? k,
      providerId,
      entity,
      entityId,
      lastSuccessfulSync: existing?.lastSuccessfulSync ?? null,
      lastAttempt: new Date().toISOString(),
      nextScheduled: existing?.nextScheduled ?? null,
      status: "running",
      failureReason: null,
    };
    memory.set(k, next);
    return next;
  },

  markSuccess(providerId: string, entity: SyncEntityKind, entityId?: string | null) {
    const k = key(providerId, entity, entityId);
    const existing = memory.get(k);
    const now = new Date().toISOString();
    const next: MarketingSyncStateRecord = {
      id: existing?.id ?? k,
      providerId,
      entity,
      entityId,
      lastSuccessfulSync: now,
      lastAttempt: now,
      nextScheduled: null,
      status: "success",
      failureReason: null,
    };
    memory.set(k, next);
    return next;
  },

  markFailure(
    providerId: string,
    entity: SyncEntityKind,
    reason: string,
    entityId?: string | null,
  ) {
    const k = key(providerId, entity, entityId);
    const existing = memory.get(k);
    const now = new Date().toISOString();
    const next: MarketingSyncStateRecord = {
      id: existing?.id ?? k,
      providerId,
      entity,
      entityId,
      lastSuccessfulSync: existing?.lastSuccessfulSync ?? null,
      lastAttempt: now,
      nextScheduled: new Date(Date.now() + 15 * 60_000).toISOString(),
      status: "failed",
      failureReason: reason,
    };
    memory.set(k, next);
    return next;
  },

  clear() {
    memory.clear();
  },
};
