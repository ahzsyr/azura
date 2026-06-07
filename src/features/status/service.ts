import { prisma } from "@/lib/prisma";
import type { StatusBoardAdmin, StatusBoardPublic } from "./types";

function toNumber(value: { toString(): string } | number | null | undefined): number {
  if (value == null) return 0;
  return Number(value);
}

export const statusBoardService = {
  async getBySlug(slug: string): Promise<StatusBoardPublic | null> {
    const row = await prisma.statusBoard.findFirst({
      where: { slug, isPublished: true },
      include: {
        services: {
          where: { isPublished: true },
          orderBy: { sortOrder: "asc" },
        },
        incidents: {
          where: { isPublished: true },
          orderBy: { sortOrder: "asc" },
        },
        maintenance: {
          where: { isPublished: true },
          orderBy: { sortOrder: "asc" },
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
      services: row.services.map((s) => ({
        id: s.id,
        nameEn: s.nameEn,
        nameAr: s.nameAr,
        descriptionEn: s.descriptionEn,
        descriptionAr: s.descriptionAr,
        status: s.status,
        uptimePercent: toNumber(s.uptimePercent),
      })),
      incidents: row.incidents.map((i) => ({
        id: i.id,
        titleEn: i.titleEn,
        titleAr: i.titleAr,
        messageEn: i.messageEn,
        messageAr: i.messageAr,
        status: i.status,
        startedAt: i.startedAt.toISOString(),
        resolvedAt: i.resolvedAt?.toISOString() ?? null,
      })),
      maintenance: row.maintenance.map((m) => ({
        id: m.id,
        titleEn: m.titleEn,
        titleAr: m.titleAr,
        messageEn: m.messageEn,
        messageAr: m.messageAr,
        startsAt: m.startsAt.toISOString(),
        endsAt: m.endsAt.toISOString(),
      })),
    };
  },

  async listForAdmin(): Promise<StatusBoardAdmin[]> {
    const rows = await prisma.statusBoard.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        _count: { select: { services: true, incidents: true, maintenance: true } },
      },
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
      serviceCount: row._count.services,
      incidentCount: row._count.incidents,
      maintenanceCount: row._count.maintenance,
    }));
  },

  async getByIdForAdmin(id: string) {
    return prisma.statusBoard.findUnique({
      where: { id },
      include: {
        services: { orderBy: { sortOrder: "asc" } },
        incidents: { orderBy: { sortOrder: "asc" } },
        maintenance: { orderBy: { sortOrder: "asc" } },
      },
    });
  },
};
