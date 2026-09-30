import type {
  ApprovalPolicyConfig,
  ApprovalRequirement,
  OperationDefinition,
  RiskLevel,
} from "./types";
import { DEFAULT_APPROVAL_POLICY } from "./types";

export function requirementForRisk(
  risk: RiskLevel,
  policy: ApprovalPolicyConfig = DEFAULT_APPROVAL_POLICY,
): ApprovalRequirement {
  return policy[risk];
}

export function requiresApproval(
  definition: OperationDefinition,
  policy: ApprovalPolicyConfig = DEFAULT_APPROVAL_POLICY,
  options?: { forceApproval?: boolean; moderateAutoExecute?: boolean },
): boolean {
  if (options?.forceApproval) return true;
  const requirement = requirementForRisk(definition.risk, policy);
  if (requirement === "auto_execute") return false;
  if (requirement === "optional_approval") {
    return !options?.moderateAutoExecute;
  }
  return true;
}

export function requiresConfirmation(
  definition: OperationDefinition,
  policy: ApprovalPolicyConfig = DEFAULT_APPROVAL_POLICY,
): boolean {
  if (definition.requiresConfirmation) return true;
  return requirementForRisk(definition.risk, policy) === "approval_confirmation_rollback";
}

export function requiresRollbackCheckpoint(
  definition: OperationDefinition,
  policy: ApprovalPolicyConfig = DEFAULT_APPROVAL_POLICY,
): boolean {
  if (definition.createsRollbackCheckpoint) return true;
  return requirementForRisk(definition.risk, policy) === "approval_confirmation_rollback";
}

export function classifyRiskFromPayload(payload: Record<string, unknown>): RiskLevel | null {
  const explicit = payload.risk;
  if (
    explicit === "safe" ||
    explicit === "moderate" ||
    explicit === "high" ||
    explicit === "critical"
  ) {
    return explicit;
  }
  return null;
}
