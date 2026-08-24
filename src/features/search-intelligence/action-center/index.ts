import type { OperationsEngine } from "../operations";
import { summarizeQueue } from "../operations";

export function buildActionCenterVm(operations: OperationsEngine) {
  const records = operations.list();
  const counts = summarizeQueue(records);
  return {
    counts,
    waitingApproval: records.filter((r) => r.status === "waiting_approval"),
    running: records.filter((r) => r.status === "running"),
    failed: records.filter((r) => r.status === "failed"),
    recent: records.slice(0, 25),
  };
}
