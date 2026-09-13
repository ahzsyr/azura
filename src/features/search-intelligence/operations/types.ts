/**
 * Search Operations contracts — risk, approvals, queue, promotion.
 */

export type RiskLevel = "safe" | "moderate" | "high" | "critical";

export type ApprovalRequirement =
  | "auto_execute"
  | "optional_approval"
  | "always_approval"
  | "approval_confirmation_rollback";

export type OperationStatus =
  | "draft"
  | "queued"
  | "waiting_approval"
  | "scheduled"
  | "running"
  | "completed"
  | "failed"
  | "rejected"
  | "cancelled"
  | "rolled_back";

export type PromotionStage = "draft" | "development" | "staging" | "production";

export type OperationCategory =
  | "entity"
  | "schema"
  | "page"
  | "content"
  | "google"
  | "linking"
  | "ai"
  | "authority"
  | "performance"
  | "automation"
  | "system";

export type ApprovalPolicyConfig = {
  safe: ApprovalRequirement;
  moderate: ApprovalRequirement;
  high: ApprovalRequirement;
  critical: ApprovalRequirement;
};

export const DEFAULT_APPROVAL_POLICY: ApprovalPolicyConfig = {
  safe: "auto_execute",
  moderate: "optional_approval",
  high: "always_approval",
  critical: "approval_confirmation_rollback",
};

export type OperationDefinition = {
  id: string;
  label: string;
  category: OperationCategory;
  risk: RiskLevel;
  description: string;
  requiresConfirmation?: boolean;
  createsRollbackCheckpoint?: boolean;
};

export type OperationRequest = {
  definitionId: string;
  payload: Record<string, unknown>;
  actor?: string | null;
  assignedTo?: string | null;
  scheduledAt?: string | null;
  targetId?: string | null;
  targetLabel?: string | null;
  forceApproval?: boolean;
  environment?: PromotionStage;
};

export type RollbackCheckpoint = {
  id: string;
  operationId: string;
  createdAt: string;
  snapshot: unknown;
  summary: string;
};

export type ExecutionRecord = {
  id: string;
  definitionId: string;
  label: string;
  category: OperationCategory;
  risk: RiskLevel;
  status: OperationStatus;
  approvalRequirement: ApprovalRequirement;
  payload: Record<string, unknown>;
  actor?: string | null;
  assignedTo?: string | null;
  targetId?: string | null;
  targetLabel?: string | null;
  environment: PromotionStage;
  createdAt: string;
  updatedAt: string;
  scheduledAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  error?: string | null;
  result?: Record<string, unknown> | null;
  checkpointId?: string | null;
  history: Array<{ at: string; status: OperationStatus; note?: string }>;
};

export type ImpactSimulation = {
  title?: string;
  currentTitle?: string;
  proposedTitle?: string;
  predictedCtrDeltaPct: number;
  richResultsEffect: "improved" | "no_change" | "regressed";
  schemaValid: boolean;
  knowledgeImpact: "improved" | "no_change" | "regressed";
  entityConfidenceDeltaPct: number;
  internalLinksImpact: "improved" | "no_change" | "regressed";
  risk: RiskLevel;
  summary: string;
};
