import { prisma } from "@/lib/prisma";
import {
  loadBundleForRefs,
  localizedField,
  type EntityRef,
} from "@/features/portal/lib/portal-translation";
import type { StatusBoardAdmin, StatusBoardPublic } from "./types";

function toNumber(value: { toString(): string } | number | null | undefined): number {
  if (value == null) return 0;
  return Number(value);
}

function collectStatusBoardRefs(row: {
  id: string;
  services: { id: string }[];
  incidents: { id: string }[];
  maintenance: { id: string }[];
}): EntityRef[] {
  return [
    { entityType: "StatusBoard", entityId: row.id },
    ...row.services.map((s) => ({ entityType: "StatusService", entityId: s.id })),
    ...row.incidents.map((i) => ({ entityType: "StatusIncident", entityId: i.id })),
    ...row.maintenance.map((m) => ({ entityType: "StatusMaintenance", entityId: m.id })),
  ];
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

    const bundle = await loadBundleForRefs(collectStatusBoardRefs(row));

    return {
      id: row.id,
      slug: row.slug,
      title: localizedField(bundle, "StatusBoard", row.id, "title"),
      description: localizedField(bundle, "StatusBoard", row.id, "description"),
      services: row.services.map((s) => ({
        id: s.id,
        name: localizedField(bundle, "StatusService", s.id, "name"),
        description: localizedField(bundle, "StatusService", s.id, "description"),
        status: s.status,
        uptimePercent: toNumber(s.uptimePercent),
      })),
      incidents: row.incidents.map((i) => ({
        id: i.id,
        title: localizedField(bundle, "StatusIncident", i.id, "title"),
        message: localizedField(bundle, "StatusIncident", i.id, "message"),
        status: i.status,
        startedAt: i.startedAt.toISOString(),
        resolvedAt: i.resolvedAt?.toISOString() ?? null,
      })),
      maintenance: row.maintenance.map((m) => ({
        id: m.id,
        title: localizedField(bundle, "StatusMaintenance", m.id, "title"),
        message: localizedField(bundle, "StatusMaintenance", m.id, "message"),
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
    const bundle = await loadBundleForRefs(
      rows.map((row) => ({ entityType: "StatusBoard", entityId: row.id }))
    );
    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: localizedField(bundle, "StatusBoard", row.id, "title"),
      description: localizedField(bundle, "StatusBoard", row.id, "description"),
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
