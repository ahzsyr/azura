import {
  SEARCH_INTENTS,
  normalizeSiteKey,
  normalizeTopic,
  type PageTargetEntityRef,
  type SearchIntent,
} from "./page-search-target";

export const KEYWORD_RECORD_STATUSES = [
  "draft",
  "assigned",
  "active",
  "retired",
] as const;
export type KeywordRecordStatus = (typeof KEYWORD_RECORD_STATUSES)[number];

export const CLUSTER_CONTENT_TYPES = [
  "category",
  "product",
  "article",
  "brand",
  "page",
] as const;
export type ClusterContentType = (typeof CLUSTER_CONTENT_TYPES)[number];

export type KeywordVolumeObservation = {
  value: number;
  source: string;
  asOf: string;
};

export type KeywordRecord = {
  id: string;
  siteKey: string;
  keyword: string;
  normalizedKeyword: string;
  locale: string;
  intent: SearchIntent;
  clusterId: string;
  assignedEntity?: PageTargetEntityRef;
  priority?: number;
  status: KeywordRecordStatus;
  volumeObservation?: KeywordVolumeObservation;
  updatedAt: string;
  updatedBy?: string;
};

export type KeywordCluster = {
  id: string;
  siteKey: string;
  name: string;
  primaryTopic: string;
  synonyms: string[];
  audience?: string;
  location?: string;
  contentType: ClusterContentType;
  primaryEntity?: PageTargetEntityRef;
  updatedAt: string;
  updatedBy?: string;
};

export type KeywordClusterInput = {
  siteKey: string;
  name: string;
  primaryTopic: string;
  synonyms?: string[];
  audience?: string;
  location?: string;
  contentType: ClusterContentType;
  primaryEntity?: PageTargetEntityRef;
  id?: string;
  updatedBy?: string;
};

export type KeywordRecordInput = {
  siteKey: string;
  keyword: string;
  locale: string;
  intent: SearchIntent;
  clusterId: string;
  assignedEntity?: PageTargetEntityRef;
  priority?: number;
  status?: KeywordRecordStatus;
  volumeObservation?: KeywordVolumeObservation;
  id?: string;
  updatedBy?: string;
};

function randomId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeKeyword(keyword: string): string {
  return normalizeTopic(keyword);
}

export function validateKeywordClusterInput(
  input: KeywordClusterInput,
  currentSiteKey: string,
): Array<{ field?: string; message: string }> {
  const errors: Array<{ field?: string; message: string }> = [];
  if (normalizeSiteKey(input.siteKey) !== normalizeSiteKey(currentSiteKey)) {
    errors.push({ field: "siteKey", message: "siteKey does not match the current site" });
  }
  if (!input.name?.trim()) errors.push({ field: "name", message: "name is required" });
  if (!input.primaryTopic?.trim()) {
    errors.push({ field: "primaryTopic", message: "primaryTopic is required" });
  }
  if (!(CLUSTER_CONTENT_TYPES as readonly string[]).includes(input.contentType)) {
    errors.push({ field: "contentType", message: `Invalid contentType: ${input.contentType}` });
  }
  return errors;
}

export function normalizeKeywordCluster(
  input: KeywordClusterInput,
  existingId?: string,
): KeywordCluster {
  return {
    id: existingId ?? input.id ?? randomId("kc"),
    siteKey: normalizeSiteKey(input.siteKey),
    name: input.name.trim(),
    primaryTopic: input.primaryTopic.trim(),
    synonyms: (input.synonyms ?? []).map((s) => s.trim()).filter(Boolean).slice(0, 20),
    audience: input.audience?.trim() || undefined,
    location: input.location?.trim() || undefined,
    contentType: input.contentType,
    primaryEntity: input.primaryEntity
      ? { type: input.primaryEntity.type.trim(), id: input.primaryEntity.id.trim() }
      : undefined,
    updatedAt: new Date().toISOString(),
    updatedBy: input.updatedBy,
  };
}

export function validateKeywordRecordInput(
  input: KeywordRecordInput,
  options: { currentSiteKey: string; enabledLocales: string[]; clusterIds: Set<string> },
): Array<{ field?: string; message: string }> {
  const errors: Array<{ field?: string; message: string }> = [];
  if (normalizeSiteKey(input.siteKey) !== normalizeSiteKey(options.currentSiteKey)) {
    errors.push({ field: "siteKey", message: "siteKey does not match the current site" });
  }
  if (!input.keyword?.trim()) errors.push({ field: "keyword", message: "keyword is required" });
  if (!input.locale?.trim()) {
    errors.push({ field: "locale", message: "locale is required" });
  } else if (
    options.enabledLocales.length > 0 &&
    !options.enabledLocales.includes(input.locale)
  ) {
    errors.push({ field: "locale", message: `Locale is not enabled: ${input.locale}` });
  }
  if (!(SEARCH_INTENTS as readonly string[]).includes(input.intent)) {
    errors.push({ field: "intent", message: `Invalid intent: ${input.intent}` });
  }
  if (!input.clusterId?.trim() || !options.clusterIds.has(input.clusterId)) {
    errors.push({ field: "clusterId", message: "clusterId must reference an existing cluster" });
  }
  if (
    input.status &&
    !(KEYWORD_RECORD_STATUSES as readonly string[]).includes(input.status)
  ) {
    errors.push({ field: "status", message: `Invalid status: ${input.status}` });
  }
  return errors;
}

export function normalizeKeywordRecord(
  input: KeywordRecordInput,
  existingId?: string,
): KeywordRecord {
  const keyword = input.keyword.trim();
  return {
    id: existingId ?? input.id ?? randomId("kw"),
    siteKey: normalizeSiteKey(input.siteKey),
    keyword,
    normalizedKeyword: normalizeKeyword(keyword),
    locale: input.locale.trim(),
    intent: input.intent,
    clusterId: input.clusterId.trim(),
    assignedEntity: input.assignedEntity
      ? { type: input.assignedEntity.type.trim(), id: input.assignedEntity.id.trim() }
      : undefined,
    priority: typeof input.priority === "number" ? input.priority : undefined,
    status: input.status ?? (input.assignedEntity ? "assigned" : "draft"),
    volumeObservation: input.volumeObservation
      ? {
          value: Number(input.volumeObservation.value),
          source: input.volumeObservation.source.trim(),
          asOf: input.volumeObservation.asOf,
        }
      : undefined,
    updatedAt: new Date().toISOString(),
    updatedBy: input.updatedBy,
  };
}

/** Keyword-level ownership collisions: same normalized keyword + locale assigned to multiple entities. */
export function buildKeywordAssignmentFindings(input: {
  siteKey: string;
  keywords: KeywordRecord[];
}): Array<{
  id: string;
  locale: string;
  normalizedKeyword: string;
  keywords: KeywordRecord[];
}> {
  const active = input.keywords.filter(
    (k) =>
      k.siteKey === input.siteKey &&
      (k.status === "active" || k.status === "assigned") &&
      k.assignedEntity,
  );
  const groups = new Map<string, KeywordRecord[]>();
  for (const row of active) {
    const key = `${row.locale}::${row.normalizedKeyword}`;
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }
  const findings: Array<{
    id: string;
    locale: string;
    normalizedKeyword: string;
    keywords: KeywordRecord[];
  }> = [];
  for (const [groupKey, rows] of groups) {
    const entities = new Set(rows.map((r) => `${r.assignedEntity!.type}:${r.assignedEntity!.id}`));
    if (entities.size < 2) continue;
    const [locale, normalizedKeyword] = groupKey.split("::");
    findings.push({
      id: `kw-own-${input.siteKey}-${locale}-${normalizedKeyword}`,
      locale,
      normalizedKeyword,
      keywords: rows,
    });
  }
  return findings;
}
