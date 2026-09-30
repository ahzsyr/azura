import { createEntityUuid } from "../entity-graph/ids";
import type { RollbackCheckpoint } from "./types";

export function createRollbackCheckpointStore() {
  const byId = new Map<string, RollbackCheckpoint>();
  const byOperation = new Map<string, string[]>();

  function create(input: {
    operationId: string;
    snapshot: unknown;
    summary: string;
  }): RollbackCheckpoint {
    const checkpoint: RollbackCheckpoint = {
      id: createEntityUuid(),
      operationId: input.operationId,
      createdAt: new Date().toISOString(),
      snapshot: input.snapshot,
      summary: input.summary,
    };
    byId.set(checkpoint.id, checkpoint);
    const list = byOperation.get(input.operationId) ?? [];
    list.unshift(checkpoint.id);
    byOperation.set(input.operationId, list);
    return checkpoint;
  }

  return {
    create,
    get(id: string) {
      return byId.get(id) ?? null;
    },
    listForOperation(operationId: string) {
      return (byOperation.get(operationId) ?? [])
        .map((id) => byId.get(id))
        .filter((c): c is RollbackCheckpoint => Boolean(c));
    },
  };
}

export type RollbackCheckpointStore = ReturnType<typeof createRollbackCheckpointStore>;
