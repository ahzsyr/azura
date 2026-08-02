import type { StatusBoard, StatusIncident, StatusMaintenance, StatusService } from "@prisma/client";
import {
  legacyShapeFromBundle,
  loadBundleForRefs,
  type EntityRef,
  type TranslationBundle,
} from "@/features/portal/lib/portal-translation";

export type StatusBoardFormDrafts = {
  boardLegacy: Record<string, string>;
  services: Record<string, unknown>[];
  incidents: Record<string, unknown>[];
  maintenance: Record<string, unknown>[];
};

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

export async function loadStatusBoardFormDrafts(
  board: StatusBoard & {
    services: StatusService[];
    incidents: StatusIncident[];
    maintenance: StatusMaintenance[];
  }
): Promise<StatusBoardFormDrafts> {
  const bundle = await loadBundleForRefs(collectStatusBoardRefs(board));
  return buildStatusBoardFormDrafts(board, bundle);
}

export function buildStatusBoardFormDrafts(
  board: StatusBoard & {
    services: StatusService[];
    incidents: StatusIncident[];
    maintenance: StatusMaintenance[];
  },
  bundle: TranslationBundle
): StatusBoardFormDrafts {
  return {
    boardLegacy: legacyShapeFromBundle(bundle, "StatusBoard", board.id, ["title", "description"]),
    services: board.services.map((service) => ({
      id: service.id,
      status: service.status,
      uptimePercent: Number(service.uptimePercent),
      isPublished: service.isPublished,
      sortOrder: service.sortOrder,
      ...legacyShapeFromBundle(bundle, "StatusService", service.id, ["name", "description"]),
    })),
    incidents: board.incidents.map((incident) => ({
      id: incident.id,
      status: incident.status,
      startedAt: incident.startedAt.toISOString().slice(0, 16),
      resolvedAt: incident.resolvedAt?.toISOString().slice(0, 16) ?? "",
      isPublished: incident.isPublished,
      sortOrder: incident.sortOrder,
      ...legacyShapeFromBundle(bundle, "StatusIncident", incident.id, ["title", "message"]),
    })),
    maintenance: board.maintenance.map((item) => ({
      id: item.id,
      startsAt: item.startsAt.toISOString().slice(0, 16),
      endsAt: item.endsAt.toISOString().slice(0, 16),
      isPublished: item.isPublished,
      sortOrder: item.sortOrder,
      ...legacyShapeFromBundle(bundle, "StatusMaintenance", item.id, ["title", "message"]),
    })),
  };
}
