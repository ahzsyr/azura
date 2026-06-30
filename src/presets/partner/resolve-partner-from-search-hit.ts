import { resolvePartnerCardTemplateId } from "@/templates/preset-template-map";
import type { PartnerCardViewModel } from "@/view-models/partner-card";

export type PortalSearchHit = {
  entityId: string;
  facets?: Record<string, string | string[] | number | boolean>;
  card?: Record<string, unknown>;
};

function readPortalCard(hit: PortalSearchHit): Record<string, unknown> {
  const card = hit.card;
  if (card && typeof card === "object") return card;
  const metaCard = (hit as { metadata?: { portalCard?: unknown } }).metadata?.portalCard;
  if (metaCard && typeof metaCard === "object") return metaCard as Record<string, unknown>;
  return {};
}

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function facetString(
  facets: Record<string, string | string[] | number | boolean> | undefined,
  key: string,
): string | null {
  const value = facets?.[key];
  if (typeof value === "string" && value) return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return null;
}

export function resolvePartnerCardFromSearchHit(
  hit: PortalSearchHit,
  partnerProgramSlug: string,
): PartnerCardViewModel {
  const card = readPortalCard(hit);
  const facets = hit.facets;
  return {
    templateId: resolvePartnerCardTemplateId(),
    presetId: "partner",
    entityId: readString(card.entityId, hit.entityId),
    partnerProgramSlug: readString(card.partnerProgramSlug, partnerProgramSlug),
    categorySlug: readString(card.categorySlug) ?? facetString(facets, "categorySlug"),
    name: readString(card.name),
    description: readString(card.description),
    location: readString(card.location),
    logoUrl: readString(card.logoUrl),
    logoAlt: readString(card.logoAlt, readString(card.name)),
    websiteUrl: readString(card.websiteUrl),
    profileUrl: readString(card.profileUrl),
    email: readString(card.email),
    phone: readString(card.phone),
    certifications: readStringArray(card.certifications),
  };
}
