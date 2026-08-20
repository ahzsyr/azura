import { resolveTeamMemberCardTemplateId } from "@/templates/preset-template-map";
import type { TeamMemberCardViewModel } from "@/view-models/team-member-card";

export type PortalSearchHit = {
  entityId: string;
  facets?: Record<string, string | string[] | number | boolean>;
  card?: Record<string, unknown>;
};

function readPortalCard(hit: PortalSearchHit): Record<string, unknown> {
  if (hit.card && typeof hit.card === "object") return hit.card;
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

export function resolveMemberCardFromSearchHit(
  hit: PortalSearchHit,
  teamDirectorySlug: string,
): TeamMemberCardViewModel {
  const card = readPortalCard(hit);
  const facets = hit.facets;
  return {
    templateId: resolveTeamMemberCardTemplateId(),
    presetId: "team-member",
    entityId: readString(card.entityId, hit.entityId),
    teamDirectorySlug: readString(card.teamDirectorySlug, teamDirectorySlug),
    departmentId: readString(card.departmentId) ?? facetString(facets, "departmentId"),
    name: readString(card.name),
    role: readString(card.role),
    bio: readString(card.bio),
    email: readString(card.email),
    phone: readString(card.phone),
    location: readString(card.location),
    skills: readStringArray(card.skills),
    imageUrl: readString(card.imageUrl),
    imageAlt: readString(card.imageAlt, readString(card.name)),
  };
}
