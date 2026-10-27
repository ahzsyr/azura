import {
  entityKey,
  normalizeTopic,
  type OwnershipException,
  type PageSearchTarget,
  type PageTargetEntityRef,
  type PageTargetSiteConfig,
} from "./page-search-target";

export type OwnershipFinding = {
  id: string;
  siteKey: string;
  locale: string;
  normalizedTopic: string;
  primaryTopicSample: string;
  targets: PageSearchTarget[];
  status: "open" | "acknowledged";
  exceptionId?: string;
};

function exceptionCovers(
  exception: OwnershipException,
  finding: { siteKey: string; locale: string; normalizedTopic: string; entities: PageTargetEntityRef[] },
): boolean {
  if (exception.siteKey !== finding.siteKey) return false;
  if (exception.locale !== finding.locale) return false;
  if (exception.normalizedTopic !== finding.normalizedTopic) return false;
  const allowed = new Set(exception.entityIds.map(entityKey));
  return finding.entities.every((e) => allowed.has(entityKey(e)));
}

/**
 * Possible topic ownership conflicts within a site+locale.
 * Review findings only — never block persistence.
 */
export function buildOwnershipFindings(config: PageTargetSiteConfig): OwnershipFinding[] {
  const active = config.targets.filter(
    (t) => t.siteKey === config.siteKey && (t.status === "active" || t.status === "draft"),
  );

  const groups = new Map<string, PageSearchTarget[]>();
  for (const target of active) {
    const key = `${target.locale}::${normalizeTopic(target.primaryTopic)}`;
    const list = groups.get(key) ?? [];
    list.push(target);
    groups.set(key, list);
  }

  const findings: OwnershipFinding[] = [];

  for (const [groupKey, targets] of groups) {
    if (targets.length < 2) continue;
    const [locale, normalizedTopic] = groupKey.split("::");
    const entities = targets.map((t) => t.entity);
    const exception = config.exceptions.find((ex) =>
      exceptionCovers(ex, {
        siteKey: config.siteKey,
        locale,
        normalizedTopic,
        entities,
      }),
    );

    findings.push({
      id: `own-${config.siteKey}-${locale}-${normalizedTopic}`,
      siteKey: config.siteKey,
      locale,
      normalizedTopic,
      primaryTopicSample: targets[0]?.primaryTopic ?? normalizedTopic,
      targets,
      status: exception ? "acknowledged" : "open",
      exceptionId: exception?.id,
    });
  }

  return findings.sort((a, b) => {
    if (a.status !== b.status) return a.status === "open" ? -1 : 1;
    return a.normalizedTopic.localeCompare(b.normalizedTopic);
  });
}

export type OwnershipExceptionInput = {
  siteKey: string;
  locale: string;
  normalizedTopic: string;
  entityIds: PageTargetEntityRef[];
  reason: string;
  reviewerId: string;
  id?: string;
};

export function createOwnershipException(input: OwnershipExceptionInput): OwnershipException {
  return {
    id: input.id ?? `ox_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    siteKey: input.siteKey,
    locale: input.locale,
    normalizedTopic: normalizeTopic(input.normalizedTopic),
    entityIds: input.entityIds.map((e) => ({ type: e.type.trim(), id: e.id.trim() })),
    reason: input.reason.trim(),
    reviewerId: input.reviewerId,
    decidedAt: new Date().toISOString(),
  };
}
