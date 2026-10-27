import {
  entityKey,
  seedPriorityEntities,
  type PageTargetEntityRef,
  type PageTargetSiteConfig,
  type PageSearchTarget,
} from "./page-search-target";

export function mergePriorityEntities(
  existing: PageTargetEntityRef[],
  additions: PageTargetEntityRef[],
): PageTargetEntityRef[] {
  const map = new Map<string, PageTargetEntityRef>();
  for (const ref of [...seedPriorityEntities(), ...existing, ...additions]) {
    if (!ref.type?.trim() || !ref.id?.trim()) continue;
    map.set(entityKey(ref), { type: ref.type.trim(), id: ref.id.trim() });
  }
  return [...map.values()];
}

export function setPriorityEntities(
  config: PageTargetSiteConfig,
  entities: PageTargetEntityRef[],
): PageTargetSiteConfig {
  const map = new Map<string, PageTargetEntityRef>();
  for (const ref of entities) {
    if (!ref.type?.trim() || !ref.id?.trim()) continue;
    map.set(entityKey(ref), { type: ref.type.trim(), id: ref.id.trim() });
  }
  return {
    ...config,
    priorityEntities: [...map.values()],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Entities in priorityEntities that lack a draft or active target for the locale.
 */
export function listUnassignedPriorityEntities(
  config: PageTargetSiteConfig,
  locale: string,
): PageTargetEntityRef[] {
  const assigned = new Set(
    config.targets
      .filter(
        (t) =>
          t.locale === locale &&
          (t.status === "active" || t.status === "draft") &&
          t.siteKey === config.siteKey,
      )
      .map((t) => entityKey(t.entity)),
  );

  return config.priorityEntities.filter((ref) => !assigned.has(entityKey(ref)));
}

export function sortTargetsByPriority(targets: PageSearchTarget[]): PageSearchTarget[] {
  return [...targets].sort((a, b) => {
    const pa = a.priority ?? 0;
    const pb = b.priority ?? 0;
    if (pb !== pa) return pb - pa;
    return a.primaryTopic.localeCompare(b.primaryTopic);
  });
}
