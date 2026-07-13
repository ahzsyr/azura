import { prisma } from "@/lib/prisma";
import {
  loadBundleForRefs,
  localizedField,
  type EntityRef,
} from "@/features/portal/lib/portal-translation";
import type { TeamDirectoryAdmin, TeamDirectoryBlockInput, TeamDirectoryPublic } from "./types";

function parseSkills(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((s): s is string => typeof s === "string");
}

function collectTeamRefs(row: {
  id: string;
  departments: { id: string }[];
  members: { id: string }[];
}): EntityRef[] {
  return [
    { entityType: "TeamDirectory", entityId: row.id },
    ...row.departments.map((d) => ({ entityType: "TeamDepartment", entityId: d.id })),
    ...row.members.map((m) => ({ entityType: "TeamMember", entityId: m.id })),
  ];
}

export const teamDirectoryService = {
  async getBySlug(
    slug: string,
    opts?: Pick<TeamDirectoryBlockInput, "departmentId" | "limit">
  ): Promise<TeamDirectoryPublic | null> {
    const row = await prisma.teamDirectory.findFirst({
      where: { slug, isPublished: true },
      include: {
        departments: { orderBy: { sortOrder: "asc" } },
        members: {
          where: {
            isPublished: true,
            ...(opts?.departmentId ? { departmentId: opts.departmentId } : {}),
          },
          orderBy: { sortOrder: "asc" },
          take: opts?.limit && opts.limit > 0 ? opts.limit : undefined,
        },
      },
    });
    if (!row) return null;

    const bundle = await loadBundleForRefs(collectTeamRefs(row));

    return {
      id: row.id,
      slug: row.slug,
      title: localizedField(bundle, "TeamDirectory", row.id, "title"),
      description: localizedField(bundle, "TeamDirectory", row.id, "description"),
      departments: row.departments.map((d) => ({
        id: d.id,
        name: localizedField(bundle, "TeamDepartment", d.id, "name"),
      })),
      members: row.members.map((m) => ({
        id: m.id,
        departmentId: m.departmentId,
        name: localizedField(bundle, "TeamMember", m.id, "name"),
        role: localizedField(bundle, "TeamMember", m.id, "role"),
        bio: localizedField(bundle, "TeamMember", m.id, "bio"),
        email: m.email,
        phone: m.phone,
        location: localizedField(bundle, "TeamMember", m.id, "location"),
        skills: parseSkills(m.skills),
        imageUrl: m.imageUrl,
      })),
    };
  },

  async listForAdmin(): Promise<TeamDirectoryAdmin[]> {
    const rows = await prisma.teamDirectory.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { departments: true, members: true } } },
    });
    const bundle = await loadBundleForRefs(
      rows.map((row) => ({ entityType: "TeamDirectory", entityId: row.id }))
    );
    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: localizedField(bundle, "TeamDirectory", row.id, "title"),
      description: localizedField(bundle, "TeamDirectory", row.id, "description"),
      sortOrder: row.sortOrder,
      isPublished: row.isPublished,
      departmentCount: row._count.departments,
      memberCount: row._count.members,
    }));
  },

  async getByIdForAdmin(id: string) {
    return prisma.teamDirectory.findUnique({
      where: { id },
      include: {
        departments: { orderBy: { sortOrder: "asc" } },
        members: { orderBy: { sortOrder: "asc" } },
      },
    });
  },
};
