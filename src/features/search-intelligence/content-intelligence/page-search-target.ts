import { PRIORITY_INDEXABLE_PAGE_KEYS } from "@/features/seo/constants";

export const SEARCH_INTENTS = [
  "informational",
  "commercial",
  "transactional",
  "navigational",
] as const;

export type SearchIntent = (typeof SEARCH_INTENTS)[number];

/** Target lifecycle only — not CMS publication state. */
export const PAGE_SEARCH_TARGET_STATUSES = ["draft", "active", "retired"] as const;
export type PageSearchTargetStatus = (typeof PAGE_SEARCH_TARGET_STATUSES)[number];

export const PAGE_TARGET_ENTITY_TYPES = [
  "pageKey",
  "CMS_PAGE",
  "POST",
  "PRODUCT",
  "CONTENT_ITEM",
  "PACKAGE",
] as const;

export type PageTargetEntityType = (typeof PAGE_TARGET_ENTITY_TYPES)[number];

export type PageTargetEntityRef = {
  type: string;
  id: string;
};

export type PageSearchTarget = {
  id: string;
  siteKey: string;
  entity: PageTargetEntityRef;
  locale: string;
  primaryTopic: string;
  supportingTopics: string[];
  intent: SearchIntent;
  clusterId?: string;
  status: PageSearchTargetStatus;
  priority?: number;
  monitoring?: boolean;
  updatedAt: string;
  updatedBy?: string;
};

export type OwnershipException = {
  id: string;
  siteKey: string;
  locale: string;
  normalizedTopic: string;
  entityIds: PageTargetEntityRef[];
  reason: string;
  reviewerId: string;
  decidedAt: string;
};

export type PageTargetSiteConfig = {
  siteKey: string;
  priorityEntities: PageTargetEntityRef[];
  targets: PageSearchTarget[];
  exceptions: OwnershipException[];
  updatedAt: string;
};

export const MAX_SUPPORTING_TOPICS = 5;

export function normalizeSiteKey(origin: string): string {
  const trimmed = origin.trim().replace(/\/$/, "");
  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    return `${url.protocol}//${host}`;
  } catch {
    return trimmed.toLowerCase();
  }
}

export function normalizeTopic(topic: string): string {
  return topic
    .toLowerCase()
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
}

export function entityKey(entity: PageTargetEntityRef): string {
  return `${entity.type}:${entity.id}`;
}

export function targetIdentityKey(input: {
  siteKey: string;
  entity: PageTargetEntityRef;
  locale: string;
}): string {
  return `${input.siteKey}::${entityKey(input.entity)}::${input.locale}`;
}

export function isAllowedEntityType(type: string): type is PageTargetEntityType {
  return (PAGE_TARGET_ENTITY_TYPES as readonly string[]).includes(type);
}

export function seedPriorityEntities(): PageTargetEntityRef[] {
  return PRIORITY_INDEXABLE_PAGE_KEYS.map((pageKey) => ({
    type: "pageKey",
    id: pageKey,
  }));
}

export function emptySiteConfig(siteKey: string): PageTargetSiteConfig {
  return {
    siteKey,
    priorityEntities: seedPriorityEntities(),
    targets: [],
    exceptions: [],
    updatedAt: new Date().toISOString(),
  };
}

export type PageSearchTargetInput = {
  siteKey: string;
  entity: PageTargetEntityRef;
  locale: string;
  primaryTopic: string;
  supportingTopics?: string[];
  intent: SearchIntent;
  clusterId?: string;
  status?: PageSearchTargetStatus;
  priority?: number;
  monitoring?: boolean;
  id?: string;
  updatedBy?: string;
};

export type TargetValidationError = {
  field?: string;
  message: string;
};

export function validatePageSearchTargetInput(
  input: PageSearchTargetInput,
  options: { enabledLocales: string[]; currentSiteKey: string },
): TargetValidationError[] {
  const errors: TargetValidationError[] = [];

  if (!input.siteKey?.trim()) {
    errors.push({ field: "siteKey", message: "siteKey is required" });
  } else if (normalizeSiteKey(input.siteKey) !== normalizeSiteKey(options.currentSiteKey)) {
    errors.push({ field: "siteKey", message: "siteKey does not match the current site" });
  }

  if (!input.entity?.type?.trim() || !input.entity?.id?.trim()) {
    errors.push({ field: "entity", message: "entity.type and entity.id are required" });
  } else if (!isAllowedEntityType(input.entity.type)) {
    errors.push({
      field: "entity.type",
      message: `Unsupported entity type: ${input.entity.type}`,
    });
  }

  if (!input.locale?.trim()) {
    errors.push({ field: "locale", message: "locale is required" });
  } else if (
    options.enabledLocales.length > 0 &&
    !options.enabledLocales.includes(input.locale)
  ) {
    errors.push({ field: "locale", message: `Locale is not enabled: ${input.locale}` });
  }

  if (!input.primaryTopic?.trim()) {
    errors.push({ field: "primaryTopic", message: "primaryTopic is required" });
  }

  if (input.intent && !(SEARCH_INTENTS as readonly string[]).includes(input.intent)) {
    errors.push({ field: "intent", message: `Invalid intent: ${input.intent}` });
  }

  if (
    input.status &&
    !(PAGE_SEARCH_TARGET_STATUSES as readonly string[]).includes(input.status)
  ) {
    errors.push({ field: "status", message: `Invalid status: ${input.status}` });
  }

  const supporting = input.supportingTopics ?? [];
  if (supporting.length > MAX_SUPPORTING_TOPICS) {
    errors.push({
      field: "supportingTopics",
      message: `At most ${MAX_SUPPORTING_TOPICS} supporting topics`,
    });
  }

  return errors;
}

export function normalizePageSearchTarget(
  input: PageSearchTargetInput,
  existingId?: string,
): PageSearchTarget {
  const supporting = (input.supportingTopics ?? [])
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, MAX_SUPPORTING_TOPICS);

  return {
    id: existingId ?? input.id ?? cryptoRandomId(),
    siteKey: normalizeSiteKey(input.siteKey),
    entity: {
      type: input.entity.type.trim(),
      id: input.entity.id.trim(),
    },
    locale: input.locale.trim(),
    primaryTopic: input.primaryTopic.trim(),
    supportingTopics: supporting,
    intent: input.intent,
    clusterId: input.clusterId?.trim() || undefined,
    status: input.status ?? "draft",
    priority: typeof input.priority === "number" ? input.priority : undefined,
    monitoring: Boolean(input.monitoring),
    updatedAt: new Date().toISOString(),
    updatedBy: input.updatedBy,
  };
}

function cryptoRandomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `pst_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
