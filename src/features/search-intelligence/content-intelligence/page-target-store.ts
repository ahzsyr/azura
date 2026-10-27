import "server-only";

import type { Prisma } from "@prisma/client";
import { jsonStoreRepository } from "@/repositories/json-store.repository";
import { SEO_PAGE_TARGETS_NAMESPACE } from "@/features/seo/constants";
import { resolveSiteOrigin } from "@/features/seo/resolve-site-origin";
import {
  emptySiteConfig,
  normalizePageSearchTarget,
  normalizeSiteKey,
  targetIdentityKey,
  validatePageSearchTargetInput,
  type OwnershipException,
  type PageSearchTarget,
  type PageSearchTargetInput,
  type PageTargetEntityRef,
  type PageTargetSiteConfig,
} from "./page-search-target";
import { createOwnershipException, type OwnershipExceptionInput } from "./ownership-findings";
import { setPriorityEntities } from "./priority-entities";

export async function resolveCurrentSiteKey(): Promise<string> {
  const origin = await resolveSiteOrigin("public");
  return normalizeSiteKey(origin);
}

function assertSiteKeyMatch(requested: string, current: string): void {
  if (normalizeSiteKey(requested) !== normalizeSiteKey(current)) {
    throw new Error("Forbidden: siteKey does not match the current site");
  }
}

export async function loadPageTargetSiteConfig(siteKey?: string): Promise<PageTargetSiteConfig> {
  const current = siteKey ? normalizeSiteKey(siteKey) : await resolveCurrentSiteKey();
  const stored = await jsonStoreRepository.get<PageTargetSiteConfig>(
    SEO_PAGE_TARGETS_NAMESPACE,
    current,
  );
  if (!stored || stored.siteKey !== current) {
    return emptySiteConfig(current);
  }
  return {
    ...emptySiteConfig(current),
    ...stored,
    siteKey: current,
    priorityEntities: Array.isArray(stored.priorityEntities)
      ? stored.priorityEntities
      : emptySiteConfig(current).priorityEntities,
    targets: Array.isArray(stored.targets) ? stored.targets : [],
    exceptions: Array.isArray(stored.exceptions) ? stored.exceptions : [],
  };
}

async function saveConfig(config: PageTargetSiteConfig): Promise<PageTargetSiteConfig> {
  const next = { ...config, updatedAt: new Date().toISOString() };
  await jsonStoreRepository.set(
    SEO_PAGE_TARGETS_NAMESPACE,
    config.siteKey,
    next as unknown as Prisma.InputJsonValue,
  );
  return next;
}

export async function upsertPageSearchTarget(input: {
  target: PageSearchTargetInput;
  enabledLocales: string[];
  currentSiteKey: string;
}): Promise<{ ok: true; target: PageSearchTarget; config: PageTargetSiteConfig } | { ok: false; errors: Array<{ field?: string; message: string }> }> {
  assertSiteKeyMatch(input.target.siteKey, input.currentSiteKey);
  const errors = validatePageSearchTargetInput(input.target, {
    enabledLocales: input.enabledLocales,
    currentSiteKey: input.currentSiteKey,
  });
  if (errors.length) return { ok: false, errors };

  const config = await loadPageTargetSiteConfig(input.currentSiteKey);
  const identity = targetIdentityKey({
    siteKey: config.siteKey,
    entity: input.target.entity,
    locale: input.target.locale,
  });
  const existingIndex = config.targets.findIndex(
    (t) =>
      targetIdentityKey({ siteKey: t.siteKey, entity: t.entity, locale: t.locale }) === identity,
  );
  const existingId = existingIndex >= 0 ? config.targets[existingIndex]?.id : input.target.id;
  const normalized = normalizePageSearchTarget(
    { ...input.target, siteKey: config.siteKey },
    existingId,
  );

  const targets = [...config.targets];
  if (existingIndex >= 0) targets[existingIndex] = normalized;
  else targets.push(normalized);

  const next = await saveConfig({ ...config, targets });
  return { ok: true, target: normalized, config: next };
}

export async function retirePageSearchTarget(input: {
  siteKey: string;
  targetId: string;
  currentSiteKey: string;
}): Promise<PageTargetSiteConfig> {
  assertSiteKeyMatch(input.siteKey, input.currentSiteKey);
  const config = await loadPageTargetSiteConfig(input.currentSiteKey);
  const targets = config.targets.map((t) =>
    t.id === input.targetId && t.siteKey === config.siteKey
      ? { ...t, status: "retired" as const, updatedAt: new Date().toISOString() }
      : t,
  );
  return saveConfig({ ...config, targets });
}

export async function deletePageSearchTarget(input: {
  siteKey: string;
  targetId: string;
  currentSiteKey: string;
}): Promise<PageTargetSiteConfig> {
  assertSiteKeyMatch(input.siteKey, input.currentSiteKey);
  const config = await loadPageTargetSiteConfig(input.currentSiteKey);
  return saveConfig({
    ...config,
    targets: config.targets.filter((t) => !(t.id === input.targetId && t.siteKey === config.siteKey)),
  });
}

export async function saveOwnershipException(input: {
  exception: OwnershipExceptionInput;
  currentSiteKey: string;
}): Promise<{ ok: true; exception: OwnershipException; config: PageTargetSiteConfig } | { ok: false; message: string }> {
  assertSiteKeyMatch(input.exception.siteKey, input.currentSiteKey);
  if (!input.exception.reason.trim()) {
    return { ok: false, message: "Exception reason is required" };
  }
  if (!input.exception.reviewerId.trim()) {
    return { ok: false, message: "reviewerId is required" };
  }
  if (input.exception.entityIds.length < 2) {
    return { ok: false, message: "Exception must scope at least two entities" };
  }

  const config = await loadPageTargetSiteConfig(input.currentSiteKey);
  const exception = createOwnershipException({
    ...input.exception,
    siteKey: config.siteKey,
  });
  const exceptions = [
    ...config.exceptions.filter((e) => e.id !== exception.id),
    exception,
  ];
  const next = await saveConfig({ ...config, exceptions });
  return { ok: true, exception, config: next };
}

export async function updatePriorityEntities(input: {
  siteKey: string;
  entities: PageTargetEntityRef[];
  currentSiteKey: string;
}): Promise<PageTargetSiteConfig> {
  assertSiteKeyMatch(input.siteKey, input.currentSiteKey);
  const config = await loadPageTargetSiteConfig(input.currentSiteKey);
  return saveConfig(setPriorityEntities(config, input.entities));
}

export async function getTargetForEntity(input: {
  siteKey?: string;
  entity: PageTargetEntityRef;
  locale: string;
}): Promise<PageSearchTarget | null> {
  const config = await loadPageTargetSiteConfig(input.siteKey);
  return (
    config.targets.find(
      (t) =>
        t.entity.type === input.entity.type &&
        t.entity.id === input.entity.id &&
        t.locale === input.locale &&
        t.status !== "retired",
    ) ?? null
  );
}
