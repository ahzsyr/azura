import type { ExecutionRecord, OperationStatus } from "./types";
import type { OperationsEngine } from "./execution-engine";

/** Thin adapter so UI / jobs talk to a queue-like interface. */
export function createQueueAdapter(engine: OperationsEngine) {
  return {
    enqueue: engine.enqueue.bind(engine),
    list(status?: OperationStatus | OperationStatus[]) {
      return engine.list(status ? { status } : undefined);
    },
    peek(): ExecutionRecord | null {
      return engine.list({ status: "queued" })[0] ?? null;
    },
    async drain(limit = 20) {
      return engine.runQueued(limit);
    },
    counts() {
      return engine.summarize();
    },
  };
}

export type QueueAdapter = ReturnType<typeof createQueueAdapter>;
