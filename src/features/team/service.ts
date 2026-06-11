import { prisma } from "@/lib/prisma";
import type { TeamDirectoryAdmin, TeamDirectoryBlockInput, TeamDirectoryPublic } from "./types";

function parseSkills(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((s): s is string => typeof s === "string");
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
    return {
      id: row.id,
      slug: row.slug,
      titleEn: row.titleEn,
      titleAr: row.titleAr,
      descriptionEn: row.descriptionEn,
      descriptionAr: row.descriptionAr,
      departments: row.departments.map((d) => ({
        id: d.id,
        nameEn: d.nameEn,
        nameAr: d.nameAr,
      })),
      members: row.members.map((m) => ({
        id: m.id,
        departmentId: m.departmentId,
        nameEn: m.nameEn,
        nameAr: m.nameAr,
        roleEn: m.roleEn,
        roleAr: m.roleAr,
        bioEn: m.bioEn,
        bioAr: m.bioAr,
        email: m.email,
        phone: m.phone,
        locationEn: m.locationEn,
        locationAr: m.locationAr,
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
    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      titleEn: row.titleEn,
      titleAr: row.titleAr,
      descriptionEn: row.descriptionEn,
      descriptionAr: row.descriptionAr,
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
