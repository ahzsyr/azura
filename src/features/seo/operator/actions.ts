"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/auth/guards";
import { seoTaskService } from "./task.service";
import { seoSetupStore } from "./setup-store";
import type { SeoSetupStepId, SeoTaskStatus } from "./types";

function revalidateOperator() {
  revalidatePath("/admin/seo");
  revalidatePath("/admin/seo/tasks");
  revalidatePath("/admin/seo/tasks/today");
  revalidatePath("/admin/seo/tasks/week");
  revalidatePath("/admin/seo/audit");
  revalidatePath("/admin/seo/setup");
}

export async function setSeoTaskStatusAction(taskId: string, status: SeoTaskStatus) {
  await requireAdmin();
  await seoTaskService.setStatus(taskId, status);
  revalidateOperator();
}

export async function markSeoSetupStepAction(stepId: SeoSetupStepId, done = true) {
  await requireAdmin();
  const state = await seoSetupStore.markStep(stepId, done);
  revalidateOperator();
  return state;
}

export async function completeSeoSetupAction() {
  await requireAdmin();
  const state = await seoSetupStore.complete();
  revalidateOperator();
  return state;
}

export async function skipSeoSetupAction() {
  await requireAdmin();
  const state = await seoSetupStore.skip();
  revalidateOperator();
  return state;
}
