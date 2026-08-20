import "server-only";

import type { EntityTranslation } from "@prisma/client";
import { teamMemberRepository } from "@/repositories/team-member.repository";
import { translationService } from "@/features/translation/translation.service";
import { resolveTranslation } from "@/features/translation/translation-resolver";
import type {
  Collection,
  EntityGetOptions,
  EntityListOptions,
  EntityListRow,
  EntityRecord,
} from "@/features/entities/types";
import type { EntityStorageAdapter } from "@/features/entities/adapters/types";

const PRESET_ID = "team-member" as const;
const CUID_PATTERN = /^c[a-z0-9]{20,}$/i;

type MemberRow = {
  id: string;
  directoryId: string;
  departmentId: string | null;
  email: string;
  phone: string;
  skills: unknown;
  imageUrl: string;
  sortOrder: number;
  isPublished: boolean;
  updatedAt: Date;
  directory?: { slug: string; isPublished?: boolean } | null;
};

function looksLikeMemberId(value: string): boolean {
  return CUID_PATTERN.test(value.trim());
}

function parseSkills(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((s): s is string => typeof s === "string");
}

function resolveName(translations: EntityTranslation[], fallback: string): string {
  const ctx = { translations };
  return (
    resolveTranslation("name", "en", ctx) ||
    resolveTranslation("name", "ar", ctx) ||
    fallback
  );
}

function mapMemberToListRow(member: MemberRow, translations: EntityTranslation[]): EntityListRow {
  const title = resolveName(translations, member.id);
  return {
    ref: {
      presetId: PRESET_ID,
      storage: "portal",
      id: member.id,
      slug: member.id,
    },
    title,
    status: member.isPublished ? "PUBLISHED" : "DRAFT",
    thumbnailUrl: member.imageUrl || null,
    updatedAt: member.updatedAt,
  };
}

function mapMemberToRecord(
  member: MemberRow,
  directorySlug: string,
  translations: EntityTranslation[],
): EntityRecord {
  const ctx = { translations };
  const title = resolveName(translations, member.id);

  return {
    ref: {
      presetId: PRESET_ID,
      storage: "portal",
      id: member.id,
      slug: member.id,
    },
    title,
    titleEn: resolveTranslation("name", "en", ctx) || undefined,
    titleAr: resolveTranslation("name", "ar", ctx) || undefined,
    status: member.isPublished ? "PUBLISHED" : "DRAFT",
    thumbnailUrl: member.imageUrl || null,
    updatedAt: member.updatedAt,
    fields: {
      role: resolveTranslation("role", "en", ctx) || resolveTranslation("role", "ar", ctx) || "",
      bio: resolveTranslation("bio", "en", ctx) || resolveTranslation("bio", "ar", ctx) || "",
      location:
        resolveTranslation("location", "en", ctx) ||
        resolveTranslation("location", "ar", ctx) ||
        "",
      email: member.email,
      phone: member.phone,
      skills: parseSkills(member.skills),
      imageUrl: member.imageUrl,
      departmentId: member.departmentId,
      teamDirectorySlug: directorySlug,
      directoryId: member.directoryId,
    },
  };
}

async function resolveTeamDirectory(
  slug: string | undefined,
  publishedOnly: boolean,
): Promise<{ id: string; slug: string } | null> {
  const trimmed = slug?.trim();
  if (!trimmed) return null;
  return teamMemberRepository.findDirectory(trimmed, publishedOnly);
}

export function createTeamMemberAdapter(): EntityStorageAdapter {
  return {
    async list(options?: EntityListOptions): Promise<EntityListRow[]> {
      const directory = await resolveTeamDirectory(
        options?.teamDirectorySlug,
        !options?.includeDeleted,
      );
      if (!directory) return [];

      const members = await teamMemberRepository.findMembers({
        directoryId: directory.id,
        publishedOnly: !options?.includeDeleted,
        departmentId: options?.departmentId,
        limit: options?.limit,
      });

      const ids = members.map((m) => m.id);
      const translationMap =
        ids.length > 0
          ? await translationService.getForEntities("TeamMember", ids)
          : new Map<string, EntityTranslation[]>();

      return members.map((member) =>
        mapMemberToListRow(member, translationMap.get(member.id) ?? []),
      );
    },

    async get(idOrSlug: string, options?: EntityGetOptions): Promise<EntityRecord | null> {
      const key = idOrSlug.trim();
      if (!key) return null;

      const publishedOnly = !options?.includeDeleted;
      let member: MemberRow | null = null;
      let directorySlug = options?.teamDirectorySlug?.trim() ?? "";

      if (looksLikeMemberId(key)) {
        member = await teamMemberRepository.findMemberById(key);
        if (member?.directory) {
          if (publishedOnly && (!member.isPublished || !member.directory.isPublished)) {
            return null;
          }
          directorySlug = member.directory.slug;
        }
      } else {
        return null;
      }

      if (!member || !directorySlug) return null;

      const translations = await translationService.getForEntity("TeamMember", member.id);
      return mapMemberToRecord(member, directorySlug, translations);
    },

    async listCollections(options?: EntityListOptions): Promise<Collection[]> {
      const directory = await resolveTeamDirectory(
        options?.teamDirectorySlug,
        !options?.includeDeleted,
      );
      if (!directory) return [];

      const departments = await teamMemberRepository.findDepartments(directory.id);

      const ids = departments.map((d) => d.id);
      const translationMap =
        ids.length > 0
          ? await translationService.getForEntities("TeamDepartment", ids)
          : new Map<string, EntityTranslation[]>();

      return departments.map((department, index) => {
        const translations = translationMap.get(department.id) ?? [];
        const title = resolveName(translations, department.id);
        return {
          id: department.id,
          slug: department.id,
          title,
          presetId: PRESET_ID,
          sortOrder: department.sortOrder ?? index,
        };
      });
    },
  };
}
