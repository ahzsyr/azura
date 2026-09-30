import { getLocalizedField } from "@/lib/utils";
import { resolveIndexTitle } from "@/capabilities/search/lib/resolve-index-title";
import type { LocalizedValueMap } from "@/features/translation/types";
import { defineSearchProvider } from "@/capabilities/search/engine/providers/search-provider";
import type { SearchIndexRecord } from "@/capabilities/search/engine/types";

export type TeamMemberIndexSource = {
  id: string;
  directoryId: string;
  directorySlug: string;
  departmentId?: string | null;
  email?: string;
  phone?: string;
  skills?: string[];
  imageUrl?: string;
  isPublished?: boolean;
  name?: LocalizedValueMap;
  role?: LocalizedValueMap;
  bio?: LocalizedValueMap;
  location?: LocalizedValueMap;
};

export type PartnerIndexSource = {
  id: string;
  programId: string;
  programSlug: string;
  categoryId?: string | null;
  categorySlug?: string | null;
  logoUrl?: string;
  websiteUrl?: string;
  profileUrl?: string;
  email?: string;
  phone?: string;
  certifications?: string[];
  isPublished?: boolean;
  name?: LocalizedValueMap;
  description?: LocalizedValueMap;
  location?: LocalizedValueMap;
};

function readSkills(skills: unknown): string[] {
  if (!Array.isArray(skills)) return [];
  return skills.filter((s): s is string => typeof s === "string");
}

export const teamMemberSearchProvider = defineSearchProvider<TeamMemberIndexSource>({
  kind: "team_member",
  entityType: "TEAM_MEMBER",
  defaultVisibility: "public",
  defaultBoost: 0.85,
  shouldIndex: (member) => member.isPublished !== false,
  buildRecords(member, ctx) {
    const name = getLocalizedField(member, "name", ctx.urlPrefix);
    const role = getLocalizedField(member, "role", ctx.urlPrefix);
    const bio = getLocalizedField(member, "bio", ctx.urlPrefix);
    const location = getLocalizedField(member, "location", ctx.urlPrefix);
    const title = resolveIndexTitle(name, member.id, {
      entityType: "TEAM_MEMBER",
      entityId: member.id,
      locale: ctx.urlPrefix,
    });
    const body = [role, bio, location, member.email, member.phone, ...readSkills(member.skills)]
      .filter(Boolean)
      .join(" ");
    const directorySlug = member.directorySlug;
    const record: SearchIndexRecord = {
      entityType: "TEAM_MEMBER",
      entityId: member.id,
      locale: ctx.urlPrefix,
      title,
      body,
      urlPath: `/${ctx.urlPrefix}/team/${directorySlug}`,
      kind: "team_member",
      visibility: "public",
      boost: 0.85,
      facets: {
        teamDirectorySlug: directorySlug,
        ...(member.departmentId ? { departmentId: member.departmentId } : {}),
      },
      metadata: {
        adminPath: `/admin/team/${member.directoryId}`,
        teamDirectorySlug: directorySlug,
        departmentId: member.departmentId ?? null,
        portalCard: {
          entityId: member.id,
          teamDirectorySlug: directorySlug,
          departmentId: member.departmentId ?? null,
          name,
          role,
          bio,
          email: member.email ?? "",
          phone: member.phone ?? "",
          location,
          skills: readSkills(member.skills),
          imageUrl: member.imageUrl ?? "",
          imageAlt: name,
        },
        card: {
          entityId: member.id,
          teamDirectorySlug: directorySlug,
          departmentId: member.departmentId ?? null,
          name,
          role,
          bio,
          email: member.email ?? "",
          phone: member.phone ?? "",
          location,
          skills: readSkills(member.skills),
          imageUrl: member.imageUrl ?? "",
          imageAlt: name,
        },
      },
    };
    return [record];
  },
});

export const partnerSearchProvider = defineSearchProvider<PartnerIndexSource>({
  kind: "partner",
  entityType: "PARTNER",
  defaultVisibility: "public",
  defaultBoost: 0.85,
  shouldIndex: (partner) => partner.isPublished !== false,
  buildRecords(partner, ctx) {
    const name = getLocalizedField(partner, "name", ctx.urlPrefix);
    const description = getLocalizedField(partner, "description", ctx.urlPrefix);
    const location = getLocalizedField(partner, "location", ctx.urlPrefix);
    const title = resolveIndexTitle(name, partner.id, {
      entityType: "PARTNER",
      entityId: partner.id,
      locale: ctx.urlPrefix,
    });
    const body = [description, location, partner.email, partner.phone]
      .filter(Boolean)
      .join(" ");
    const programSlug = partner.programSlug;
    const record: SearchIndexRecord = {
      entityType: "PARTNER",
      entityId: partner.id,
      locale: ctx.urlPrefix,
      title,
      body,
      urlPath: `/${ctx.urlPrefix}/partners/${programSlug}`,
      kind: "partner",
      visibility: "public",
      boost: 0.85,
      facets: {
        partnerProgramSlug: programSlug,
        ...(partner.categorySlug ? { categorySlug: partner.categorySlug } : {}),
      },
      metadata: {
        adminPath: `/admin/partners/${partner.programId}`,
        partnerProgramSlug: programSlug,
        categorySlug: partner.categorySlug ?? null,
        portalCard: {
          entityId: partner.id,
          partnerProgramSlug: programSlug,
          categorySlug: partner.categorySlug ?? null,
          name,
          description,
          location,
          logoUrl: partner.logoUrl ?? "",
          logoAlt: name,
          websiteUrl: partner.websiteUrl ?? "",
          profileUrl: partner.profileUrl ?? "",
          email: partner.email ?? "",
          phone: partner.phone ?? "",
          certifications: readSkills(partner.certifications),
        },
        card: {
          entityId: partner.id,
          partnerProgramSlug: programSlug,
          categorySlug: partner.categorySlug ?? null,
          name,
          description,
          location,
          logoUrl: partner.logoUrl ?? "",
          logoAlt: name,
          websiteUrl: partner.websiteUrl ?? "",
          profileUrl: partner.profileUrl ?? "",
          email: partner.email ?? "",
          phone: partner.phone ?? "",
          certifications: readSkills(partner.certifications),
        },
      },
    };
    return [record];
  },
});

export const PORTAL_SEARCH_PROVIDERS = [teamMemberSearchProvider, partnerSearchProvider] as const;
