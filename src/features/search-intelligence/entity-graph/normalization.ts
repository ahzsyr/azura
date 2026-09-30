import type {
  DataSourceKind,
  EntityProperties,
  GraphEntity,
  PropertyMeta,
  SourceRecord,
} from "../types";
import { buildPublicEntityId, slugifyEntitySegment } from "./ids";
import { createGraphEntity, createGraphRelationship, nowIso, propertyMeta } from "./factory";
import { isRelationshipAllowed } from "./ontology";
import type { EntityStore } from "./interfaces";
import type { PolicyEngine } from "./policy-engine";
import { createPolicyEngine } from "./policy-engine";
import { parsePublicEntityId } from "./ids";

export type NormalizationIssue = {
  level: "ERROR" | "WARNING" | "INFO";
  code: string;
  message: string;
  sourceKey?: string;
};

export type NormalizationResult = {
  entity: GraphEntity;
  issues: NormalizationIssue[];
  created: boolean;
};

function asPropertyMap(
  raw: Record<string, unknown>,
  source: DataSourceKind,
  editor?: string | null,
  timestamp?: string,
): EntityProperties {
  const props: EntityProperties = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined) continue;
    props[key] = propertyMeta(value, source, { editor, timestamp });
  }
  return props;
}

function mergeProperty(
  policy: PolicyEngine,
  key: string,
  current: PropertyMeta | undefined,
  incoming: PropertyMeta,
): { next: PropertyMeta; replaced: boolean; conflict: boolean } {
  if (!current) return { next: incoming, replaced: true, conflict: false };
  const sameValue = JSON.stringify(current.value) === JSON.stringify(incoming.value);
  if (sameValue) {
    return {
      next: {
        ...current,
        confidence: Math.max(current.confidence, incoming.confidence),
        verified: current.verified || incoming.verified,
        updatedAt: nowIso(),
      },
      replaced: false,
      conflict: false,
    };
  }
  if (policy.shouldReplace(key, current.source, incoming.source)) {
    return { next: incoming, replaced: true, conflict: true };
  }
  return { next: current, replaced: false, conflict: true };
}

export function createNormalizationPipeline(options?: {
  store: EntityStore;
  policy?: PolicyEngine;
}) {
  if (!options?.store) {
    throw new Error("Normalization pipeline requires an EntityStore");
  }
  const store = options.store;
  const policy = options.policy ?? createPolicyEngine();

  async function normalizeSourceRecord(record: SourceRecord): Promise<NormalizationResult> {
    const issues: NormalizationIssue[] = [];
    const slug = slugifyEntitySegment(record.slug);
    const publicId = buildPublicEntityId(record.entityType, slug);
    const existing = await store.entities.getByPublicId(publicId);
    const incomingProps = asPropertyMap(
      record.properties,
      record.source,
      record.editor,
      record.timestamp,
    );

    let created = false;
    let entity: GraphEntity;

    if (!existing) {
      created = true;
      entity = createGraphEntity({
        type: record.entityType,
        slug,
        properties: incomingProps,
        localeViews: record.locale
          ? { [record.locale]: incomingProps }
          : undefined,
      });
    } else {
      const merged: EntityProperties = { ...existing.properties };
      for (const [key, incoming] of Object.entries(incomingProps)) {
        if (!incoming || typeof incoming !== "object" || !("value" in incoming)) continue;
        const current = merged[key];
        const currentMeta =
          current && typeof current === "object" && "value" in current
            ? (current as PropertyMeta)
            : undefined;
        const result = mergeProperty(policy, key, currentMeta, incoming as PropertyMeta);
        merged[key] = result.next;
        if (result.conflict && result.replaced) {
          issues.push({
            level: "INFO",
            code: "property-replaced",
            message: `Property "${key}" replaced from ${currentMeta?.source} by ${incoming.source}`,
            sourceKey: record.sourceKey,
          });
        } else if (result.conflict && !result.replaced) {
          issues.push({
            level: "WARNING",
            code: "property-drift",
            message: `Property "${key}" drift ignored (incoming ${incoming.source} lower precedence than ${currentMeta?.source})`,
            sourceKey: record.sourceKey,
          });
        }
      }

      const localeViews = { ...(existing.localeViews ?? {}) };
      if (record.locale) {
        localeViews[record.locale] = {
          ...(localeViews[record.locale] ?? {}),
          ...incomingProps,
        };
      }

      entity = {
        ...existing,
        properties: merged,
        localeViews: Object.keys(localeViews).length ? localeViews : existing.localeViews,
        updatedAt: nowIso(),
      };
    }

    entity = await store.entities.upsert(entity);

    for (const rel of record.relationships ?? []) {
      const toSlug = slugifyEntitySegment(rel.toSlug);
      const toPublicId = buildPublicEntityId(rel.toType, toSlug);
      const toExists = await store.entities.getByPublicId(toPublicId);
      if (!toExists) {
        issues.push({
          level: "WARNING",
          code: "missing-relationship-target",
          message: `Relationship ${rel.type} target ${toPublicId} does not exist yet`,
          sourceKey: record.sourceKey,
        });
      }
      if (!isRelationshipAllowed(rel.type, record.entityType, rel.toType)) {
        issues.push({
          level: "ERROR",
          code: "invalid-relationship",
          message: `Relationship ${rel.type} not allowed from ${record.entityType} to ${rel.toType}`,
          sourceKey: record.sourceKey,
        });
        continue;
      }
      await store.relationships.upsert(
        createGraphRelationship({
          type: rel.type,
          fromPublicId: entity.publicId,
          toPublicId,
          source: record.source,
          properties: rel.properties
            ? asPropertyMap(rel.properties, record.source, record.editor, record.timestamp)
            : undefined,
        }),
      );
    }

    const parsed = parsePublicEntityId(entity.publicId);
    if (!parsed) {
      issues.push({
        level: "ERROR",
        code: "invalid-public-id",
        message: `Invalid public entity id ${entity.publicId}`,
        sourceKey: record.sourceKey,
      });
    }

    return { entity, issues, created };
  }

  return {
    policy,
    normalizeSourceRecord,
    async normalizeMany(records: SourceRecord[]) {
      const results: NormalizationResult[] = [];
      for (const record of records) {
        results.push(await normalizeSourceRecord(record));
      }
      return results;
    },
  };
}

export type NormalizationPipeline = ReturnType<typeof createNormalizationPipeline>;
