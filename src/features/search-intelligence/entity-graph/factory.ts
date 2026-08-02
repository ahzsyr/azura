import type {
  DataSourceKind,
  EntityProperties,
  GraphEntity,
  GraphRelationship,
  PropertyMeta,
  PublicEntityId,
  RelationshipType,
} from "../types";
import { buildPublicEntityId, createEntityUuid } from "./ids";
import type { EntityType } from "../types";

export function nowIso(): string {
  return new Date().toISOString();
}

export function propertyMeta<T>(
  value: T,
  source: DataSourceKind,
  options?: {
    confidence?: number;
    verified?: boolean;
    editor?: string | null;
    timestamp?: string;
  },
): PropertyMeta<T> {
  const timestamp = options?.timestamp ?? nowIso();
  return {
    value,
    source,
    confidence: options?.confidence ?? defaultConfidence(source),
    verified: options?.verified ?? (source === "manual_admin" || source === "company_profile"),
    editor: options?.editor ?? null,
    timestamp,
    updatedAt: timestamp,
  };
}

export function defaultConfidence(source: DataSourceKind): number {
  switch (source) {
    case "manual_admin":
      return 1;
    case "company_profile":
      return 0.95;
    case "google_business":
      return 0.9;
    case "cms":
    case "product_catalog":
      return 0.85;
    case "api":
      return 0.8;
    case "social":
      return 0.75;
    case "importer":
      return 0.6;
    case "crawler":
      return 0.55;
    case "forms":
      return 0.5;
    case "ai":
      return 0.45;
    case "media":
      return 0.7;
    default:
      return 0.5;
  }
}

export function createGraphEntity(input: {
  type: EntityType;
  slug: string;
  properties?: EntityProperties;
  localeViews?: GraphEntity["localeViews"];
  uuid?: string;
}): GraphEntity {
  const timestamp = nowIso();
  return {
    uuid: input.uuid ?? createEntityUuid(),
    publicId: buildPublicEntityId(input.type, input.slug),
    type: input.type,
    slug: input.slug,
    properties: input.properties ?? {},
    localeViews: input.localeViews,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createGraphRelationship(input: {
  type: RelationshipType;
  fromPublicId: PublicEntityId;
  toPublicId: PublicEntityId;
  source: DataSourceKind;
  confidence?: number;
  properties?: EntityProperties;
  uuid?: string;
}): GraphRelationship {
  const timestamp = nowIso();
  return {
    uuid: input.uuid ?? createEntityUuid(),
    type: input.type,
    fromPublicId: input.fromPublicId,
    toPublicId: input.toPublicId,
    properties: input.properties,
    confidence: input.confidence ?? defaultConfidence(input.source),
    source: input.source,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function readPropertyValue<T = unknown>(
  entity: GraphEntity,
  key: string,
  locale?: string,
): T | undefined {
  if (locale && entity.localeViews?.[locale]?.[key]) {
    const localized = entity.localeViews[locale][key];
    if (localized && typeof localized === "object" && "value" in localized) {
      return (localized as PropertyMeta<T>).value;
    }
  }
  const prop = entity.properties[key];
  if (!prop) return undefined;
  if (typeof prop === "object" && "value" in prop) {
    return (prop as PropertyMeta<T>).value;
  }
  return undefined;
}
