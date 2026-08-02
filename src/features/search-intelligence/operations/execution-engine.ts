import { createEntityUuid } from "../entity-graph/ids";
import { getOperationDefinition } from "./action-definitions";
import { createApprovalService, type ApprovalService } from "./approval-service";
import {
  requiresApproval,
  requiresConfirmation,
  requiresRollbackCheckpoint,
  requirementForRisk,
} from "./risk-classifier";
import { createRollbackCheckpointStore, type RollbackCheckpointStore } from "./rollback-checkpoint";
import {
  createEnvironmentPromotionService,
  type EnvironmentPromotionService,
  summarizeQueue,
} from "./environment-promotion";
import type {
  ApprovalPolicyConfig,
  ExecutionRecord,
  OperationRequest,
  OperationStatus,
  PromotionStage,
} from "./types";
import { DEFAULT_APPROVAL_POLICY } from "./types";

export type OperationHandler = (
  record: ExecutionRecord,
) => Promise<Record<string, unknown> | void> | Record<string, unknown> | void;

function nowIso() {
  return new Date().toISOString();
}

function pushHistory(record: ExecutionRecord, status: OperationStatus, note?: string) {
  record.history.push({ at: nowIso(), status, note });
  record.status = status;
  record.updatedAt = nowIso();
}

export function createOperationsEngine(options?: {
  policy?: ApprovalPolicyConfig;
  moderateAutoExecute?: boolean;
  handlers?: Record<string, OperationHandler>;
}) {
  const approvals: ApprovalService = createApprovalService(options?.policy ?? DEFAULT_APPROVAL_POLICY);
  const checkpoints: RollbackCheckpointStore = createRollbackCheckpointStore();
  const promotion: EnvironmentPromotionService = createEnvironmentPromotionService();
  const records = new Map<string, ExecutionRecord>();
  const handlers: Record<string, OperationHandler> = { ...(options?.handlers ?? {}) };
  let moderateAutoExecute = options?.moderateAutoExecute ?? false;

  function get(id: string) {
    return records.get(id) ?? null;
  }

  function list(filter?: {
    status?: OperationStatus | OperationStatus[];
    category?: string;
    risk?: string;
  }) {
    let items = [...records.values()];
    if (filter?.status) {
      const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
      items = items.filter((r) => statuses.includes(r.status));
    }
    if (filter?.category) items = items.filter((r) => r.category === filter.category);
    if (filter?.risk) items = items.filter((r) => r.risk === filter.risk);
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  function enqueue(request: OperationRequest): ExecutionRecord {
    const definition = getOperationDefinition(request.definitionId);
    if (!definition) {
      throw new Error(`Unknown operation: ${request.definitionId}`);
    }

    const policy = approvals.getPolicy();
    const approvalRequirement = requirementForRisk(definition.risk, policy);
    const needsApproval = requiresApproval(definition, policy, {
      forceApproval: request.forceApproval,
      moderateAutoExecute,
    });

    const createdAt = nowIso();
    const record: ExecutionRecord = {
      id: createEntityUuid(),
      definitionId: definition.id,
      label: definition.label,
      category: definition.category,
      risk: definition.risk,
      status: request.scheduledAt
        ? "scheduled"
        : needsApproval
          ? "waiting_approval"
          : "queued",
      approvalRequirement,
      payload: request.payload,
      actor: request.actor ?? null,
      assignedTo: request.assignedTo ?? null,
      targetId: request.targetId ?? null,
      targetLabel: request.targetLabel ?? null,
      environment: request.environment ?? "draft",
      createdAt,
      updatedAt: createdAt,
      scheduledAt: request.scheduledAt ?? null,
      startedAt: null,
      completedAt: null,
      error: null,
      result: null,
      checkpointId: null,
      history: [
        {
          at: createdAt,
          status: request.scheduledAt
            ? "scheduled"
            : needsApproval
              ? "waiting_approval"
              : "queued",
          note: requiresConfirmation(definition, policy)
            ? "Confirmation required before execution"
            : undefined,
        },
      ],
    };

    if (requiresRollbackCheckpoint(definition, policy)) {
      const checkpoint = checkpoints.create({
        operationId: record.id,
        snapshot: {
          payload: request.payload,
          environment: record.environment,
          targetId: record.targetId,
        },
        summary: `Checkpoint before ${definition.label}`,
      });
      record.checkpointId = checkpoint.id;
    }

    records.set(record.id, record);
    return record;
  }

  async function execute(operationId: string, actor?: string | null): Promise<ExecutionRecord> {
    const record = get(operationId);
    if (!record) throw new Error(`Operation not found: ${operationId}`);

    if (record.status === "waiting_approval" && !approvals.canExecute(record)) {
      throw new Error("Operation is waiting for approval");
    }

    if (record.status === "scheduled" && record.scheduledAt) {
      if (new Date(record.scheduledAt).getTime() > Date.now()) {
        throw new Error("Operation is scheduled for the future");
      }
    }

    pushHistory(record, "running", actor ? `Started by ${actor}` : "Started");
    record.startedAt = nowIso();

    try {
      const handler = handlers[record.definitionId];
      const result = handler ? await handler(record) : { ok: true, simulated: true };
      record.result = (result as Record<string, unknown>) ?? { ok: true };
      record.completedAt = nowIso();
      pushHistory(record, "completed", "Execution completed");
    } catch (error) {
      record.error = error instanceof Error ? error.message : String(error);
      record.completedAt = nowIso();
      pushHistory(record, "failed", record.error);
    }

    records.set(record.id, record);
    return record;
  }

  function approve(operationId: string, actor?: string | null, note?: string) {
    const record = get(operationId);
    if (!record) throw new Error(`Operation not found: ${operationId}`);
    approvals.approve(operationId, actor, note);
    pushHistory(record, "queued", note ?? "Approved");
    records.set(record.id, record);
    return record;
  }

  function reject(operationId: string, actor?: string | null, note?: string) {
    const record = get(operationId);
    if (!record) throw new Error(`Operation not found: ${operationId}`);
    approvals.reject(operationId, actor, note);
    pushHistory(record, "rejected", note ?? "Rejected");
    records.set(record.id, record);
    return record;
  }

  function assign(operationId: string, assignedTo: string) {
    const record = get(operationId);
    if (!record) throw new Error(`Operation not found: ${operationId}`);
    record.assignedTo = assignedTo;
    record.updatedAt = nowIso();
    records.set(record.id, record);
    return record;
  }

  function schedule(operationId: string, scheduledAt: string) {
    const record = get(operationId);
    if (!record) throw new Error(`Operation not found: ${operationId}`);
    record.scheduledAt = scheduledAt;
    pushHistory(record, "scheduled", `Scheduled for ${scheduledAt}`);
    records.set(record.id, record);
    return record;
  }

  function undo(operationId: string, actor?: string | null) {
    const record = get(operationId);
    if (!record) throw new Error(`Operation not found: ${operationId}`);
    if (!record.checkpointId) {
      throw new Error("No rollback checkpoint available");
    }
    const checkpoint = checkpoints.get(record.checkpointId);
    if (!checkpoint) throw new Error("Checkpoint missing");
    record.result = {
      ...(record.result ?? {}),
      restored: checkpoint.snapshot,
      undoneBy: actor ?? null,
    };
    pushHistory(record, "rolled_back", "Restored from checkpoint");
    records.set(record.id, record);
    return { record, checkpoint };
  }

  async function runQueued(limit = 10) {
    const queued = list({ status: ["queued"] }).slice(0, limit);
    const results: ExecutionRecord[] = [];
    for (const item of queued) {
      results.push(await execute(item.id));
    }
    return results;
  }

  function registerHandler(definitionId: string, handler: OperationHandler) {
    handlers[definitionId] = handler;
  }

  return {
    approvals,
    checkpoints,
    promotion,
    enqueue,
    execute,
    approve,
    reject,
    assign,
    schedule,
    undo,
    get,
    list,
    runQueued,
    registerHandler,
    summarize() {
      return summarizeQueue(list());
    },
    setModerateAutoExecute(value: boolean) {
      moderateAutoExecute = value;
    },
    getModerateAutoExecute() {
      return moderateAutoExecute;
    },
    updatePolicy(next: Partial<ApprovalPolicyConfig>) {
      return approvals.updatePolicy(next);
    },
    getPolicy() {
      return approvals.getPolicy();
    },
    promote(input: {
      targetType: string;
      targetId: string;
      to: PromotionStage;
      operationId?: string;
      actor?: string | null;
    }) {
      return promotion.promote(input);
    },
  };
}

export type OperationsEngine = ReturnType<typeof createOperationsEngine>;
