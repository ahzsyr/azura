import type { EntityPresetId } from "@/features/entities/types";
import { resolvePresetByContentTypeSlug } from "@/features/entities/preset-registry";
import type {
  ContentPresetCardTemplateId,
  ContentPresetDetailTemplateId,
  KnowledgeArticleCardTemplateId,
  KnowledgeArticleDetailTemplateId,
  PartnerCardTemplateId,
  PricingPlanCardTemplateId,
  TeamMemberCardTemplateId,
} from "@/view-models/types";

export type ContentPresetId = Extract<EntityPresetId, "destination" | "service" | "property">;

const CARD_TEMPLATE_BY_PRESET: Record<ContentPresetId, ContentPresetCardTemplateId> = {
  destination: "destination-card",
  service: "service-card",
  property: "property-card",
};

const DETAIL_TEMPLATE_BY_PRESET: Record<ContentPresetId, ContentPresetDetailTemplateId> = {
  destination: "destination-detail",
  service: "service-detail",
  property: "property-detail",
};

const PRESET_BY_CONTENT_TYPE: Record<string, ContentPresetId> = {
  "catalog-items": "destination",
  offerings: "service",
  listings: "property",
};

const CONTENT_TYPE_BY_PRESET: Record<ContentPresetId, string> = {
  destination: "catalog-items",
  service: "offerings",
  property: "listings",
};

export function isContentPresetId(presetId: EntityPresetId): presetId is ContentPresetId {
  return presetId === "destination" || presetId === "service" || presetId === "property";
}

export function resolveCardTemplateId(presetId: ContentPresetId): ContentPresetCardTemplateId {
  return CARD_TEMPLATE_BY_PRESET[presetId];
}

export function resolveDetailTemplateId(presetId: ContentPresetId): ContentPresetDetailTemplateId {
  return DETAIL_TEMPLATE_BY_PRESET[presetId];
}

export function resolveCardTemplateIdFromContentType(
  contentTypeSlug: string,
): ContentPresetCardTemplateId | null {
  const presetId = resolvePresetFromContentTypeSlug(contentTypeSlug);
  return presetId ? resolveCardTemplateId(presetId) : null;
}

export function resolvePresetFromContentTypeSlug(contentTypeSlug: string): ContentPresetId | null {
  const fromRegistry = resolvePresetByContentTypeSlug(contentTypeSlug);
  if (fromRegistry && isContentPresetId(fromRegistry)) return fromRegistry;
  return PRESET_BY_CONTENT_TYPE[contentTypeSlug] ?? null;
}

export function resolveContentTypeSlugForPreset(presetId: ContentPresetId): string {
  return CONTENT_TYPE_BY_PRESET[presetId];
}

export function isKnowledgePresetId(presetId: EntityPresetId): presetId is "knowledge" {
  return presetId === "knowledge";
}

export function resolveKnowledgeArticleCardTemplateId(): KnowledgeArticleCardTemplateId {
  return "knowledge-article-card";
}

export function resolveKnowledgeArticleDetailTemplateId(): KnowledgeArticleDetailTemplateId {
  return "knowledge-article-detail";
}

export function isTeamMemberPresetId(presetId: EntityPresetId): presetId is "team-member" {
  return presetId === "team-member";
}

export function isPartnerPresetId(presetId: EntityPresetId): presetId is "partner" {
  return presetId === "partner";
}

export function resolveTeamMemberCardTemplateId(): TeamMemberCardTemplateId {
  return "member-card";
}

export function resolvePartnerCardTemplateId(): PartnerCardTemplateId {
  return "partner-card";
}

export function isPricingPresetId(presetId: EntityPresetId): presetId is "pricing" {
  return presetId === "pricing";
}

export function resolvePricingPlanCardTemplateId(): PricingPlanCardTemplateId {
  return "plan-card";
}

export function isCustomContentTypeSlug(contentTypeSlug: string): boolean {
  return resolvePresetFromContentTypeSlug(contentTypeSlug) == null;
}

export function resolveCardTemplateIdForContentType(
  contentTypeSlug: string,
): ContentPresetCardTemplateId | "entity-card" {
  const presetId = resolvePresetFromContentTypeSlug(contentTypeSlug);
  if (presetId) return resolveCardTemplateId(presetId);
  return "entity-card";
}

export function resolveDetailTemplateIdForContentType(
  contentTypeSlug: string,
): ContentPresetDetailTemplateId | "entity-detail" {
  const presetId = resolvePresetFromContentTypeSlug(contentTypeSlug);
  if (presetId) return resolveDetailTemplateId(presetId);
  return "entity-detail";
}

export function resolvePresetFromBlockProps(input: {
  presetId?: string | null;
  contentTypeSlug?: string | null;
}): ContentPresetId | null {
  const rawPreset = typeof input.presetId === "string" ? input.presetId.trim() : "";
  if (rawPreset && isContentPresetId(rawPreset as EntityPresetId)) {
    return rawPreset as ContentPresetId;
  }
  const slug = typeof input.contentTypeSlug === "string" ? input.contentTypeSlug.trim() : "";
  if (slug) return resolvePresetFromContentTypeSlug(slug);
  return "destination";
}
