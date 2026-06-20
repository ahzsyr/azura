import type { SearchEntityType } from "@prisma/client";
import { SEARCH_ENTITY_TYPES } from "@/features/search/constants";
import type { SearchIndexRecord } from "@/features/search-framework/types";

const VALID_ENTITY_TYPES = new Set<string>(SEARCH_ENTITY_TYPES);

/** SearchDocument.entityId column limit (Prisma @db.VarChar(36)). */
export const SEARCH_DOCUMENT_ENTITY_ID_MAX = 36;

export class InvalidSearchIndexRecordError extends Error {
  readonly record: Partial<SearchIndexRecord>;
  readonly field: string;

  constructor(field: string, record: Partial<SearchIndexRecord>, detail: string) {
    const kind = record.kind ?? "unknown";
    const entityType = record.entityType ?? "(missing)";
    const entityId = record.entityId ?? "(missing)";
    const locale = record.locale ?? "(missing)";
    const title = record.title?.slice(0, 80) ?? "(missing)";
    super(
      `Invalid search index record (${field}): ${detail}. kind=${kind} entityType=${entityType} entityId=${entityId} locale=${locale} title=${title}`
    );
    this.name = "InvalidSearchIndexRecordError";
    this.field = field;
    this.record = record;
  }
}

export function validateIndexRecord(record: SearchIndexRecord): void {
  const entityType = record.entityType;
  if (!entityType || typeof entityType !== "string" || !VALID_ENTITY_TYPES.has(entityType)) {
    throw new InvalidSearchIndexRecordError(
      "entityType",
      record,
      `expected one of ${SEARCH_ENTITY_TYPES.join(", ")}, got ${JSON.stringify(entityType)}`
    );
  }

  if (!record.entityId?.trim()) {
    throw new InvalidSearchIndexRecordError("entityId", record, "entityId must be non-empty");
  }

  if (record.entityId.trim().length > SEARCH_DOCUMENT_ENTITY_ID_MAX) {
    throw new InvalidSearchIndexRecordError(
      "entityId",
      record,
      `entityId must be at most ${SEARCH_DOCUMENT_ENTITY_ID_MAX} characters`
    );
  }

  if (!record.locale?.trim()) {
    throw new InvalidSearchIndexRecordError("locale", record, "locale must be non-empty");
  }

  if (!record.title?.trim()) {
    throw new InvalidSearchIndexRecordError("title", record, "title must be non-empty");
  }

  if (!record.urlPath?.trim()) {
    throw new InvalidSearchIndexRecordError("urlPath", record, "urlPath must be non-empty");
  }
}

/** Normalize provider output before persistence. */
export function normalizeIndexRecord(record: SearchIndexRecord): SearchIndexRecord {
  const meta = { ...record.metadata };
  delete meta.entityType;

  return {
    ...record,
    entityType: record.entityType as SearchEntityType,
    entityId: record.entityId.trim(),
    locale: record.locale.trim(),
    title: record.title.trim(),
    urlPath: record.urlPath.trim(),
    metadata: meta,
  };
}
