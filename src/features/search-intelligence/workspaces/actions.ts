"use server";

import { revalidatePath } from "next/cache";
import { getSearchOperationsPlatform } from "@/features/search-intelligence/workspaces/server";

async function revalidateWorkspaces() {
  revalidatePath("/admin/seo/search-operations");
  revalidatePath("/admin/seo/search-operations/overview");
  revalidatePath("/admin/seo/search-operations/operations");
  revalidatePath("/admin/seo/search-operations/pages");
  revalidatePath("/admin/seo/search-operations/entities");
  revalidatePath("/admin/seo/search-operations/content");
  revalidatePath("/admin/seo/search-operations/google");
  revalidatePath("/admin/seo/search-operations/monitoring");
  revalidatePath("/admin/seo/search-operations/automation");
  revalidatePath("/admin/seo/search-operations/settings");
}

export async function enqueueSearchOperationAction(input: {
  definitionId: string;
  payload?: Record<string, unknown>;
  targetId?: string | null;
  targetLabel?: string | null;
  forceApproval?: boolean;
  executeNow?: boolean;
}) {
  const platform = await getSearchOperationsPlatform();
  const record = platform.enqueueOperation({
    definitionId: input.definitionId,
    payload: input.payload ?? {},
    targetId: input.targetId ?? null,
    targetLabel: input.targetLabel ?? null,
    forceApproval: input.forceApproval,
    actor: "admin",
  });
  if (input.executeNow && record.status === "queued") {
    await platform.operations.execute(record.id, "admin");
  }
  await revalidateWorkspaces();
  return { id: record.id, status: record.status };
}

export async function approveSearchOperationAction(operationId: string) {
  const platform = await getSearchOperationsPlatform();
  platform.operations.approve(operationId, "admin");
  await platform.operations.execute(operationId, "admin");
  await revalidateWorkspaces();
  return { ok: true };
}

export async function rejectSearchOperationAction(operationId: string) {
  const platform = await getSearchOperationsPlatform();
  platform.operations.reject(operationId, "admin", "Rejected from Action Center");
  await revalidateWorkspaces();
  return { ok: true };
}

export async function undoSearchOperationAction(operationId: string) {
  const platform = await getSearchOperationsPlatform();
  platform.operations.undo(operationId, "admin");
  await revalidateWorkspaces();
  return { ok: true };
}

export async function updateApprovalPolicyAction(input: {
  moderateAutoExecute?: boolean;
  moderate?: "auto_execute" | "optional_approval";
}) {
  const platform = await getSearchOperationsPlatform();
  if (typeof input.moderateAutoExecute === "boolean") {
    platform.operations.setModerateAutoExecute(input.moderateAutoExecute);
  }
  if (input.moderate) {
    platform.operations.updatePolicy({ moderate: input.moderate });
  }
  await revalidateWorkspaces();
  return { policy: platform.operations.getPolicy() };
}

export async function runAutomationRuleAction(ruleId: string) {
  const platform = await getSearchOperationsPlatform();
  const run = await platform.automation.runRule(ruleId, {}, "admin");
  await revalidateWorkspaces();
  return run;
}

export async function toggleAutomationRuleAction(ruleId: string, enabled: boolean) {
  const platform = await getSearchOperationsPlatform();
  platform.automation.setEnabled(ruleId, enabled);
  await revalidateWorkspaces();
  return { ok: true };
}

export async function editEntityAction(input: {
  publicId: string;
  fields: Record<string, unknown>;
}) {
  return enqueueSearchOperationAction({
    definitionId: "entity.edit",
    payload: { publicId: input.publicId, fields: input.fields },
    targetId: input.publicId,
    executeNow: true,
  });
}

export async function applyLinkRecommendationsAction(input: {
  fromPublicId: string;
  toPublicIds: string[];
}) {
  return enqueueSearchOperationAction({
    definitionId: "linking.apply",
    payload: {
      fromPublicId: input.fromPublicId,
      links: input.toPublicIds.map((toPublicId) => ({ toPublicId })),
    },
    targetId: input.fromPublicId,
    executeNow: true,
  });
}

export async function applyAiSuggestionsAction(input: {
  url: string;
  fields?: Record<string, unknown>;
}) {
  return enqueueSearchOperationAction({
    definitionId: "ai.apply_metadata",
    payload: { url: input.url, fields: input.fields ?? { title: true, description: true } },
    targetId: input.url,
    executeNow: false,
  });
}

export async function createContentDraftAction(topic: string) {
  return enqueueSearchOperationAction({
    definitionId: "content.create_draft",
    payload: { topic },
    targetLabel: topic,
    executeNow: true,
  });
}

export async function approveNextWaitingOperationAction() {
  const platform = await getSearchOperationsPlatform();
  const waiting = platform.operations.list({ status: "waiting_approval" })[0];
  if (!waiting) return;
  platform.operations.approve(waiting.id, "admin");
  await platform.operations.execute(waiting.id, "admin");
  await revalidateWorkspaces();
}

export async function testSearchOpsConnectorAction(formData: FormData) {
  const raw = String(formData.get("connectorId") ?? "");
  const { CONNECTOR_DEFINITIONS } = await import("../integrations");
  const connectorId = CONNECTOR_DEFINITIONS.find((d) => d.id === raw)?.id;
  if (!connectorId) return;

  const { testSeoConnector } = await import("../integrations/seo-bridge");
  const platform = await getSearchOperationsPlatform();
  const result = await testSeoConnector(connectorId);
  platform.connectors.applyRuntime(connectorId, {
    state: result.state,
    message: result.message,
    lastSyncAt: result.ok ? new Date().toISOString() : platform.connectors.get(connectorId).lastSyncAt,
  });
  await revalidateWorkspaces();
}
