"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/auth/guards";
import { localeService } from "@/features/i18n/locale.service";
import type { PageSearchTargetInput, PageTargetEntityRef, SearchIntent, PageSearchTargetStatus } from "./page-search-target";
import {
  deletePageSearchTarget,
  loadPageTargetSiteConfig,
  resolveCurrentSiteKey,
  retirePageSearchTarget,
  saveOwnershipException,
  updatePriorityEntities,
  upsertPageSearchTarget,
} from "./page-target-store";
import { buildOwnershipFindings } from "./ownership-findings";
import { listUnassignedPriorityEntities, sortTargetsByPriority } from "./priority-entities";
import { normalizeTopic } from "./page-search-target";

async function revalidateContentIntelligence() {
  revalidatePath("/admin/seo/search-intelligence/content");
  revalidatePath("/admin/seo/search-intelligence");
  revalidatePath("/admin/seo/search-intelligence/performance");
}

export async function getPageTargetsWorkspaceAction() {
  await requireAdmin();
  const siteKey = await resolveCurrentSiteKey();
  const locales = await localeService.listEnabled();
  const config = await loadPageTargetSiteConfig(siteKey);
  const ownershipFindings = buildOwnershipFindings(config);
  const unassignedByLocale = Object.fromEntries(
    locales.map((locale) => [
      locale.code,
      listUnassignedPriorityEntities(config, locale.code),
    ]),
  );

  return {
    siteKey,
    locales: locales.map((l) => ({ code: l.code, label: l.label, isDefault: l.isDefault })),
    config: {
      ...config,
      targets: sortTargetsByPriority(config.targets),
    },
    ownershipFindings,
    unassignedByLocale,
  };
}

export async function upsertPageSearchTargetAction(input: {
  entityType: string;
  entityId: string;
  locale: string;
  primaryTopic: string;
  supportingTopics?: string[];
  intent: SearchIntent;
  status?: PageSearchTargetStatus;
  priority?: number;
  monitoring?: boolean;
  clusterId?: string;
  id?: string;
}) {
  const session = await requireAdmin();
  const siteKey = await resolveCurrentSiteKey();
  const locales = await localeService.listEnabled();
  const payload: PageSearchTargetInput = {
    id: input.id,
    siteKey,
    entity: { type: input.entityType, id: input.entityId },
    locale: input.locale,
    primaryTopic: input.primaryTopic,
    supportingTopics: input.supportingTopics,
    intent: input.intent,
    status: input.status,
    priority: input.priority,
    monitoring: input.monitoring,
    clusterId: input.clusterId,
    updatedBy: session.user?.id ?? session.user?.email ?? "admin",
  };

  const result = await upsertPageSearchTarget({
    target: payload,
    enabledLocales: locales.map((l) => l.code),
    currentSiteKey: siteKey,
  });
  if (result.ok) await revalidateContentIntelligence();
  return result;
}

export async function retirePageSearchTargetAction(targetId: string) {
  await requireAdmin();
  const siteKey = await resolveCurrentSiteKey();
  const config = await retirePageSearchTarget({
    siteKey,
    targetId,
    currentSiteKey: siteKey,
  });
  await revalidateContentIntelligence();
  return { ok: true as const, config };
}

export async function deletePageSearchTargetAction(targetId: string) {
  await requireAdmin();
  const siteKey = await resolveCurrentSiteKey();
  const config = await deletePageSearchTarget({
    siteKey,
    targetId,
    currentSiteKey: siteKey,
  });
  await revalidateContentIntelligence();
  return { ok: true as const, config };
}

export async function acknowledgeOwnershipExceptionAction(input: {
  locale: string;
  normalizedTopic: string;
  entityIds: PageTargetEntityRef[];
  reason: string;
}) {
  const session = await requireAdmin();
  const siteKey = await resolveCurrentSiteKey();
  const result = await saveOwnershipException({
    currentSiteKey: siteKey,
    exception: {
      siteKey,
      locale: input.locale,
      normalizedTopic: normalizeTopic(input.normalizedTopic),
      entityIds: input.entityIds,
      reason: input.reason,
      reviewerId: session.user?.id ?? session.user?.email ?? "admin",
    },
  });
  if (result.ok) await revalidateContentIntelligence();
  return result;
}

export async function updatePriorityEntitiesAction(entities: PageTargetEntityRef[]) {
  await requireAdmin();
  const siteKey = await resolveCurrentSiteKey();
  const config = await updatePriorityEntities({
    siteKey,
    entities,
    currentSiteKey: siteKey,
  });
  await revalidateContentIntelligence();
  return { ok: true as const, config };
}
