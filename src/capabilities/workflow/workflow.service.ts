import type { TranslationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { revalidateTranslations } from "@/services/cache";

export type WorkflowStatus = "DRAFT" | "REVIEW" | "PUBLISHED";

const TRANSITIONS: Record<WorkflowStatus, WorkflowStatus[]> = {
  DRAFT: ["REVIEW", "PUBLISHED"],
  REVIEW: ["DRAFT", "PUBLISHED"],
  PUBLISHED: ["DRAFT", "REVIEW"],
};

export function canTransition(from: WorkflowStatus, to: WorkflowStatus): boolean {
  if (from === to) return true;
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export async function transitionEntityTranslation(
  translationId: string,
  to: WorkflowStatus,
): Promise<void> {
  const row = await prisma.entityTranslation.findUnique({ where: { id: translationId } });
  if (!row) throw new Error("Translation not found");

  const from = row.status as WorkflowStatus;
  if (!canTransition(from, to)) {
    throw new Error(`Invalid workflow transition from ${from} to ${to}`);
  }

  await prisma.entityTranslation.update({
    where: { id: translationId },
    data: { status: to as TranslationStatus },
  });

  revalidateTranslations(row.entityType, row.entityId);
}

export const workflowCapability = {
  id: "workflow" as const,
  canTransition,
  transitionEntityTranslation,
};
