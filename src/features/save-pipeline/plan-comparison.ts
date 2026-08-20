import "server-only";

import type { ExecutionPlan } from "./execution-plan";

export type ExecutionPlanMismatch = Readonly<{
  field: string;
  patchValue: unknown;
  shadowValue: unknown;
}>;

export type ExecutionPlanComparison = Readonly<{
  ok: boolean;
  mismatches: readonly ExecutionPlanMismatch[];
}>;

function ids<T extends { id: string }>(items: readonly T[]): string[] {
  return items.map((item) => item.id).sort();
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stable(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function pushMismatch(
  mismatches: ExecutionPlanMismatch[],
  field: string,
  patchValue: unknown,
  shadowValue: unknown,
) {
  if (stable(patchValue) !== stable(shadowValue)) {
    mismatches.push({ field, patchValue, shadowValue });
  }
}

export function compareExecutionPlans(
  patchPlan: ExecutionPlan,
  shadowPlan: ExecutionPlan,
): ExecutionPlanComparison {
  const mismatches: ExecutionPlanMismatch[] = [];
  pushMismatch(mismatches, "finalState", patchPlan.finalState, shadowPlan.finalState);
  pushMismatch(mismatches, "effects", ids(patchPlan.effects), ids(shadowPlan.effects));
  pushMismatch(mismatches, "asyncTasks", ids(patchPlan.asyncTasks), ids(shadowPlan.asyncTasks));
  pushMismatch(
    mismatches,
    "revalidationTargets",
    [...patchPlan.revalidationTargets].sort(),
    [...shadowPlan.revalidationTargets].sort(),
  );
  pushMismatch(mismatches, "revision", patchPlan.revision, shadowPlan.revision);
  pushMismatch(mismatches, "reasoningTrace", patchPlan.reasoningTrace, shadowPlan.reasoningTrace);
  return { ok: mismatches.length === 0, mismatches };
}
