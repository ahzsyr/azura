"use server";

import { revalidatePath } from "next/cache";
import { Prisma, ServiceHealthStatus, IncidentStatus } from "@prisma/client";
import { requireAdmin } from "@/features/auth/guards";
import { uniqueSlug } from "@/features/portal/lib/unique-slug";
import { parseChildrenJson, str, num, bool } from "@/features/portal/lib/parse-children-json";
import { checkboxValue } from "@/features/portal/lib/action-helpers";
import { syncEntityRowTranslations } from "@/features/portal/lib/portal-translation";
import { revalidateMarketingHome } from "@/services/cache";
import { localeService } from "@/features/i18n/locale.service";
import { getDefaultLocaleFieldFromForm } from "@/features/translation/form-sync";
import { syncEntityTranslationsFromForm } from "@/features/translation/form-sync.server";
import { prisma } from "@/lib/prisma";

const ADMIN_BASE = "/admin/status";

function revalidateStatusBoardPaths(slug?: string, id?: string) {
  revalidateMarketingHome();
  revalidatePath(ADMIN_BASE);
  revalidatePath(`${ADMIN_BASE}/new`);
  if (id) revalidatePath(`${ADMIN_BASE}/${id}`);
  if (slug) revalidatePath(`/status/${slug}`);
}

function parseServiceHealth(value: string): ServiceHealthStatus {
  return Object.values(ServiceHealthStatus).includes(value as ServiceHealthStatus)
    ? (value as ServiceHealthStatus)
    : ServiceHealthStatus.OPERATIONAL;
}

function parseIncidentStatus(value: string): IncidentStatus {
  return Object.values(IncidentStatus).includes(value as IncidentStatus)
    ? (value as IncidentStatus)
    : IncidentStatus.INVESTIGATING;
}

export async function upsertStatusBoard(formData: FormData) {
  await requireAdmin();
  const enabledLocales = await localeService.listEnabled();
  const id = (formData.get("id") as string | null) || undefined;
  const titleForSlug = getDefaultLocaleFieldFromForm(formData, enabledLocales, "title");
  const slugInput = (formData.get("slug") as string | null)?.trim();
  const slug = slugInput
    ? await uniqueSlug(prisma.statusBoard, slugInput, id, "status")
    : await uniqueSlug(prisma.statusBoard, titleForSlug, id, "status");

  const data = {
    slug,
    isPublished: checkboxValue(formData.get("isPublished")),
    sortOrder: Number(formData.get("sortOrder") ?? 0),
  };

  const board =
    id != null
      ? await prisma.statusBoard.update({ where: { id }, data })
      : await prisma.statusBoard.create({
          data: {
            ...data,
            sortOrder: data.sortOrder || (await prisma.statusBoard.count()),
          },
        });

  await syncEntityTranslationsFromForm(formData, "StatusBoard", board.id, enabledLocales);

  const services = parseChildrenJson(formData.get("servicesJson"));
  const incidents = parseChildrenJson(formData.get("incidentsJson"));
  const maintenance = parseChildrenJson(formData.get("maintenanceJson"));
  const keptServiceIds = new Set<string>();
  const keptIncidentIds = new Set<string>();
  const keptMaintenanceIds = new Set<string>();

  for (let i = 0; i < services.length; i++) {
    const row = services[i];
    const serviceId = str(row.id);
    const serviceData = {
      boardId: board.id,
      status: parseServiceHealth(str(row.status, "OPERATIONAL")),
      uptimePercent: new Prisma.Decimal(num(row.uptimePercent, 100)),
      isPublished: bool(row.isPublished, true),
      sortOrder: num(row.sortOrder, i),
    };
    const service =
      serviceId != null
        ? await prisma.statusService.update({ where: { id: serviceId }, data: serviceData })
        : await prisma.statusService.create({ data: serviceData });
    keptServiceIds.add(service.id);
    await syncEntityRowTranslations("StatusService", service.id, row, enabledLocales);
  }
  await prisma.statusService.deleteMany({
    where: { boardId: board.id, id: { notIn: [...keptServiceIds] } },
  });

  for (let i = 0; i < incidents.length; i++) {
    const row = incidents[i];
    const incidentId = str(row.id);
    const incidentData = {
      boardId: board.id,
      status: parseIncidentStatus(str(row.status, "INVESTIGATING")),
      startedAt: row.startedAt ? new Date(str(row.startedAt)) : new Date(),
      resolvedAt: row.resolvedAt ? new Date(str(row.resolvedAt)) : null,
      isPublished: bool(row.isPublished, true),
      sortOrder: num(row.sortOrder, i),
    };
    const incident =
      incidentId != null
        ? await prisma.statusIncident.update({ where: { id: incidentId }, data: incidentData })
        : await prisma.statusIncident.create({ data: incidentData });
    keptIncidentIds.add(incident.id);
    await syncEntityRowTranslations("StatusIncident", incident.id, row, enabledLocales);
  }
  await prisma.statusIncident.deleteMany({
    where: { boardId: board.id, id: { notIn: [...keptIncidentIds] } },
  });

  for (let i = 0; i < maintenance.length; i++) {
    const row = maintenance[i];
    const maintenanceId = str(row.id);
    const startsAt = row.startsAt ? new Date(str(row.startsAt)) : new Date();
    const endsAt = row.endsAt ? new Date(str(row.endsAt)) : new Date(startsAt.getTime() + 3600000);
    const maintenanceData = {
      boardId: board.id,
      startsAt,
      endsAt,
      isPublished: bool(row.isPublished, true),
      sortOrder: num(row.sortOrder, i),
    };
    const rowEntity =
      maintenanceId != null
        ? await prisma.statusMaintenance.update({ where: { id: maintenanceId }, data: maintenanceData })
        : await prisma.statusMaintenance.create({ data: maintenanceData });
    keptMaintenanceIds.add(rowEntity.id);
    await syncEntityRowTranslations("StatusMaintenance", rowEntity.id, row, enabledLocales);
  }
  await prisma.statusMaintenance.deleteMany({
    where: { boardId: board.id, id: { notIn: [...keptMaintenanceIds] } },
  });

  revalidateStatusBoardPaths(board.slug, board.id);
  return board;
}

export async function patchStatusBoardFromForm(
  id: string,
  baseline: Record<string, string>,
  current: Record<string, string>,
) {
  const { patchStatusBoardFromForm: patchImpl } = await import(
    "@/features/portal/lib/entity-patch.server"
  );
  return patchImpl(id, baseline, current);
}

export async function deleteStatusBoard(id: string) {
  await requireAdmin();
  const row = await prisma.statusBoard.findUnique({ where: { id }, select: { slug: true } });
  await prisma.statusBoard.delete({ where: { id } });
  revalidateStatusBoardPaths(row?.slug, id);
}

export async function toggleStatusBoardPublished(id: string, isPublished: boolean) {
  await requireAdmin();
  const row = await prisma.statusBoard.update({
    where: { id },
    data: { isPublished },
    select: { slug: true, id: true },
  });
  revalidateStatusBoardPaths(row.slug, id);
}
