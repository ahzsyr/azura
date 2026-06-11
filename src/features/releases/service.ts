import { prisma } from "@/lib/prisma";
import type { ReleaseSetAdmin, ReleaseSetPublic } from "./types";

function parseTags(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((t): t is string => typeof t === "string");
  return [];
}

export const releaseSetService = {
  async getBySlug(slug: string): Promise<ReleaseSetPublic | null> {
    const row = await prisma.releaseSet.findFirst({
      where: { slug, isPublished: true },
      include: {
        releases: {
          where: { isPublished: true },
          orderBy: { sortOrder: "asc" },
          include: {
            entries: { orderBy: { sortOrder: "asc" } },
          },
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
      releases: row.releases.map((r) => ({
        id: r.id,
        version: r.version,
        releaseDate: r.releaseDate?.toISOString() ?? null,
        status: r.status,
        tags: parseTags(r.tags),
        entries: r.entries.map((e) => ({
          id: e.id,
          category: e.category,
          textEn: e.textEn,
          textAr: e.textAr,
        })),
      })),
    };
  },

  async listForAdmin(): Promise<ReleaseSetAdmin[]> {
    const rows = await prisma.releaseSet.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { releases: true } } },
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
      releaseCount: row._count.releases,
    }));
  },

  async getByIdForAdmin(id: string) {
    return prisma.releaseSet.findUnique({
      where: { id },
      include: {
        releases: {
          orderBy: { sortOrder: "asc" },
          include: { entries: { orderBy: { sortOrder: "asc" } } },
        },
      },
    });
  },
};
