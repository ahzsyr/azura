"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSection } from "@/features/auth/guards";
import { localeService } from "@/features/i18n/locale.service";
import { assertAdvancedSeoMutationAllowed } from "@/modules/advanced-seo/guard";
import type { PageSearchTargetInput, PageTargetEntityRef, SearchIntent, PageSearchTargetStatus } from "./page-search-target";
import {
  deleteKeywordCluster,
  deleteKeywordRecord,
  deletePageSearchTarget,
  loadPageTargetSiteConfig,
  resolveCurrentSiteKey,
  retirePageSearchTarget,
  saveOwnershipException,
  updatePriorityEntities,
  upsertKeywordCluster,
  upsertKeywordRecord,
  upsertPageSearchTarget,
} from "./page-target-store";
import { buildOwnershipFindings } from "./ownership-findings";
import { listUnassignedPriorityEntities, sortTargetsByPriority } from "./priority-entities";
import { normalizeTopic } from "./page-search-target";
import {
  buildKeywordAssignmentFindings,
  type ClusterContentType,
  type KeywordRecordStatus,
} from "./keyword-registry";
import { createPlanningBrief } from "./planning-brief";

async function revalidateContentIntelligence() {
  revalidatePath("/admin/seo/search-intelligence/content");
  revalidatePath("/admin/seo/search-intelligence");
  revalidatePath("/admin/seo/search-intelligence/performance");
}

export async function getPageTargetsWorkspaceAction() {
  await requireAdminSection("seo");
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
    keywordAssignmentFindings: buildKeywordAssignmentFindings({
      siteKey,
      keywords: config.keywords,
    }),
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
  await assertAdvancedSeoMutationAllowed();
  const session = await requireAdminSection("seo");
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
  await assertAdvancedSeoMutationAllowed();
  await requireAdminSection("seo");
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
  await assertAdvancedSeoMutationAllowed();
  await requireAdminSection("seo");
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
  await assertAdvancedSeoMutationAllowed();
  const session = await requireAdminSection("seo");
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
  await assertAdvancedSeoMutationAllowed();
  await requireAdminSection("seo");
  const siteKey = await resolveCurrentSiteKey();
  const config = await updatePriorityEntities({
    siteKey,
    entities,
    currentSiteKey: siteKey,
  });
  await revalidateContentIntelligence();
  return { ok: true as const, config };
}

export async function upsertKeywordClusterAction(input: {
  id?: string;
  name: string;
  primaryTopic: string;
  synonyms?: string[];
  audience?: string;
  location?: string;
  contentType: ClusterContentType;
  primaryEntityType?: string;
  primaryEntityId?: string;
}) {
  await assertAdvancedSeoMutationAllowed();
  const session = await requireAdminSection("seo");
  const siteKey = await resolveCurrentSiteKey();
  const result = await upsertKeywordCluster({
    currentSiteKey: siteKey,
    cluster: {
      id: input.id,
      siteKey,
      name: input.name,
      primaryTopic: input.primaryTopic,
      synonyms: input.synonyms,
      audience: input.audience,
      location: input.location,
      contentType: input.contentType,
      primaryEntity:
        input.primaryEntityType && input.primaryEntityId
          ? { type: input.primaryEntityType, id: input.primaryEntityId }
          : undefined,
      updatedBy: session.user?.id ?? session.user?.email ?? "admin",
    },
  });
  if (result.ok) await revalidateContentIntelligence();
  return result;
}

export async function deleteKeywordClusterAction(clusterId: string) {
  await assertAdvancedSeoMutationAllowed();
  await requireAdminSection("seo");
  const siteKey = await resolveCurrentSiteKey();
  const config = await deleteKeywordCluster({
    siteKey,
    clusterId,
    currentSiteKey: siteKey,
  });
  await revalidateContentIntelligence();
  return { ok: true as const, config };
}

export async function upsertKeywordRecordAction(input: {
  id?: string;
  keyword: string;
  locale: string;
  intent: SearchIntent;
  clusterId: string;
  assignedEntityType?: string;
  assignedEntityId?: string;
  priority?: number;
  status?: KeywordRecordStatus;
}) {
  await assertAdvancedSeoMutationAllowed();
  const session = await requireAdminSection("seo");
  const siteKey = await resolveCurrentSiteKey();
  const locales = await localeService.listEnabled();
  const result = await upsertKeywordRecord({
    currentSiteKey: siteKey,
    enabledLocales: locales.map((l) => l.code),
    keyword: {
      id: input.id,
      siteKey,
      keyword: input.keyword,
      locale: input.locale,
      intent: input.intent,
      clusterId: input.clusterId,
      assignedEntity:
        input.assignedEntityType && input.assignedEntityId
          ? { type: input.assignedEntityType, id: input.assignedEntityId }
          : undefined,
      priority: input.priority,
      status: input.status,
      updatedBy: session.user?.id ?? session.user?.email ?? "admin",
    },
  });
  if (result.ok) await revalidateContentIntelligence();
  return result;
}

export async function deleteKeywordRecordAction(keywordId: string) {
  await assertAdvancedSeoMutationAllowed();
  await requireAdminSection("seo");
  const siteKey = await resolveCurrentSiteKey();
  const config = await deleteKeywordRecord({
    siteKey,
    keywordId,
    currentSiteKey: siteKey,
  });
  await revalidateContentIntelligence();
  return { ok: true as const, config };
}

export async function createPlanningBriefAction(input: {
  primaryTopic: string;
  pageType: ClusterContentType;
  locale: string;
  relatedKeywords?: string[];
  audience?: string;
  location?: string;
  entityType?: string;
  entityId?: string;
  intent?: SearchIntent;
}) {
  await assertAdvancedSeoMutationAllowed();
  const session = await requireAdminSection("seo");
  const siteKey = await resolveCurrentSiteKey();
  const locales = await localeService.listEnabled();
  const result = await createPlanningBrief({
    siteKey,
    currentSiteKey: siteKey,
    enabledLocales: locales.map((l) => l.code),
    primaryTopic: input.primaryTopic,
    pageType: input.pageType,
    locale: input.locale,
    relatedKeywords: input.relatedKeywords,
    audience: input.audience,
    location: input.location,
    entityType: input.entityType,
    entityId: input.entityId,
    intent: input.intent ?? "commercial",
    updatedBy: session.user?.id ?? session.user?.email ?? "admin",
  });
  if (result.ok) await revalidateContentIntelligence();
  return result;
}
