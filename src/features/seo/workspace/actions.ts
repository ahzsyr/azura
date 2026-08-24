"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/auth/guards";
import { seoWorkspaceService } from "./seo-workspace.service";
import type { AuditTarget, SeoIssueFilter } from "./types";

function revalidateWorkspace() {
  revalidatePath("/admin/seo");
  revalidatePath("/admin/seo/technical");
  revalidatePath("/admin/seo/issues");
  revalidatePath("/admin/seo/history");
  revalidatePath("/admin/seo/recommendations");
  revalidatePath("/admin/seo/content");
}

export async function runSiteAuditAction() {
  await requireAdmin();
  const result = await seoWorkspaceService.runSiteAudit();
  revalidateWorkspace();
  return result;
}

export async function getSeoOverviewAction(snapshotId?: string) {
  await requireAdmin();
  return seoWorkspaceService.getOverview(snapshotId);
}

export async function getTechnicalAuditAction(snapshotId?: string) {
  await requireAdmin();
  return seoWorkspaceService.getTechnicalAudit(snapshotId);
}

export async function listWorkspaceIssuesAction(
  filter: SeoIssueFilter = {},
  snapshotId?: string,
) {
  await requireAdmin();
  return seoWorkspaceService.listIssues(filter, snapshotId);
}

export async function getContentAuditAction(target: AuditTarget) {
  await requireAdmin();
  return seoWorkspaceService.getContentAudit(target);
}

export async function getRecommendationsAction(target?: AuditTarget) {
  await requireAdmin();
  return seoWorkspaceService.getRecommendations(target);
}

export async function listAuditHistoryAction(limit = 30) {
  await requireAdmin();
  return seoWorkspaceService.listAuditHistory(limit);
}
