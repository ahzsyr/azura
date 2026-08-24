import type { ApprovalPolicyConfig, ExecutionRecord } from "./types";
import { DEFAULT_APPROVAL_POLICY } from "./types";

export type ApprovalDecision = {
  approved: boolean;
  actor?: string | null;
  note?: string;
  at: string;
};

export function createApprovalService(initialPolicy: ApprovalPolicyConfig = DEFAULT_APPROVAL_POLICY) {
  let policy = { ...initialPolicy };
  const decisions = new Map<string, ApprovalDecision[]>();

  return {
    getPolicy() {
      return { ...policy };
    },
    updatePolicy(next: Partial<ApprovalPolicyConfig>) {
      policy = { ...policy, ...next };
      return this.getPolicy();
    },
    approve(operationId: string, actor?: string | null, note?: string) {
      const decision: ApprovalDecision = {
        approved: true,
        actor: actor ?? null,
        note,
        at: new Date().toISOString(),
      };
      const list = decisions.get(operationId) ?? [];
      list.push(decision);
      decisions.set(operationId, list);
      return decision;
    },
    reject(operationId: string, actor?: string | null, note?: string) {
      const decision: ApprovalDecision = {
        approved: false,
        actor: actor ?? null,
        note,
        at: new Date().toISOString(),
      };
      const list = decisions.get(operationId) ?? [];
      list.push(decision);
      decisions.set(operationId, list);
      return decision;
    },
    latest(operationId: string) {
      const list = decisions.get(operationId) ?? [];
      return list[list.length - 1] ?? null;
    },
    canExecute(record: ExecutionRecord) {
      if (record.status !== "waiting_approval") return true;
      const latest = this.latest(record.id);
      return Boolean(latest?.approved);
    },
  };
}

export type ApprovalService = ReturnType<typeof createApprovalService>;
