import type { ExecutionRecord, OperationStatus, PromotionStage } from "./types";

export type PromotionRecord = {
  id: string;
  targetType: string;
  targetId: string;
  from: PromotionStage;
  to: PromotionStage;
  operationId?: string;
  at: string;
  actor?: string | null;
};

const STAGE_ORDER: PromotionStage[] = ["draft", "development", "staging", "production"];

export function nextPromotionStage(current: PromotionStage): PromotionStage | null {
  const idx = STAGE_ORDER.indexOf(current);
  if (idx < 0 || idx >= STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
}

export function canPromote(from: PromotionStage, to: PromotionStage): boolean {
  return STAGE_ORDER.indexOf(to) === STAGE_ORDER.indexOf(from) + 1;
}

export function createEnvironmentPromotionService() {
  const history: PromotionRecord[] = [];
  const current = new Map<string, PromotionStage>();

  function key(targetType: string, targetId: string) {
    return `${targetType}:${targetId}`;
  }

  return {
    getStage(targetType: string, targetId: string): PromotionStage {
      return current.get(key(targetType, targetId)) ?? "draft";
    },
    promote(input: {
      targetType: string;
      targetId: string;
      to: PromotionStage;
      operationId?: string;
      actor?: string | null;
    }) {
      const from = this.getStage(input.targetType, input.targetId);
      if (!canPromote(from, input.to)) {
        throw new Error(`Cannot promote from ${from} to ${input.to}`);
      }
      current.set(key(input.targetType, input.targetId), input.to);
      const record: PromotionRecord = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        targetType: input.targetType,
        targetId: input.targetId,
        from,
        to: input.to,
        operationId: input.operationId,
        at: new Date().toISOString(),
        actor: input.actor ?? null,
      };
      history.unshift(record);
      return record;
    },
    list(targetType?: string, targetId?: string) {
      if (!targetType) return [...history];
      return history.filter(
        (h) => h.targetType === targetType && (!targetId || h.targetId === targetId),
      );
    },
  };
}

export type EnvironmentPromotionService = ReturnType<typeof createEnvironmentPromotionService>;

export function statusBucket(status: OperationStatus): string {
  switch (status) {
    case "running":
      return "running";
    case "queued":
    case "scheduled":
      return "queued";
    case "waiting_approval":
      return "waiting_approval";
    case "completed":
      return "completed";
    case "failed":
      return "failed";
    default:
      return status;
  }
}

export function summarizeQueue(records: ExecutionRecord[]) {
  const counts = {
    running: 0,
    queued: 0,
    waiting_approval: 0,
    scheduled: 0,
    completed: 0,
    failed: 0,
  };
  for (const record of records) {
    if (record.status === "running") counts.running += 1;
    else if (record.status === "queued") counts.queued += 1;
    else if (record.status === "waiting_approval") counts.waiting_approval += 1;
    else if (record.status === "scheduled") counts.scheduled += 1;
    else if (record.status === "completed") counts.completed += 1;
    else if (record.status === "failed") counts.failed += 1;
  }
  return counts;
}
