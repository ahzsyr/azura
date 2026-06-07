"use server";

import { revalidatePath } from "next/cache";
import { Prisma, ServiceHealthStatus, IncidentStatus } from "@prisma/client";
import { requireAdmin } from "@/features/auth/guards";
import { uniqueSlug } from "@/features/portal/lib/unique-slug";
import { parseChildrenJson, str, num, bool } from "@/features/portal/lib/parse-children-json";
import { checkboxValue } from "@/features/portal/lib/action-helpers";
import { revalidateMarketingHome } from "@/services/cache";
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
  const id = (formData.get("id") as string | null) || undefined;
  const titleEn = (formData.get("titleEn") as string) ?? "";
  const slugInput = (formData.get("slug") as string | null)?.trim();
  const slug = slugInput
    ? await uniqueSlug(prisma.statusBoard, slugInput, id, "status")
    : await uniqueSlug(prisma.statusBoard, titleEn, id, "status");

  const data = {
    slug,
    titleEn,
    titleAr: (formData.get("titleAr") as string) ?? "",
    descriptionEn: (formData.get("descriptionEn") as string) || "",
    descriptionAr: (formData.get("descriptionAr") as string) || "",
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
      nameEn: str(row.nameEn),
      nameAr: str(row.nameAr),
      descriptionEn: str(row.descriptionEn),
      descriptionAr: str(row.descriptionAr),
      status: parseServiceHealth(str(row.status, "OPERATIONAL")),
      uptimePercent: new Prisma.Decimal(num(row.uptimePercent, 100)),
      isPublished: bool(row.isPublished, true),
      sortOrder: num(row.sortOrder, i),
    };
    if (serviceId) {
      await prisma.statusService.update({ where: { id: serviceId }, data: serviceData });
      keptServiceIds.add(serviceId);
    } else {
      const created = await prisma.statusService.create({ data: serviceData });
      keptServiceIds.add(created.id);
    }
  }
  await prisma.statusService.deleteMany({
    where: { boardId: board.id, id: { notIn: [...keptServiceIds] } },
  });

  for (let i = 0; i < incidents.length; i++) {
    const row = incidents[i];
    const incidentId = str(row.id);
    const incidentData = {
      boardId: board.id,
      titleEn: str(row.titleEn),
      titleAr: str(row.titleAr),
      messageEn: str(row.messageEn),
      messageAr: str(row.messageAr),
      status: parseIncidentStatus(str(row.status, "INVESTIGATING")),
      startedAt: row.startedAt ? new Date(str(row.startedAt)) : new Date(),
      resolvedAt: row.resolvedAt ? new Date(str(row.resolvedAt)) : null,
      isPublished: bool(row.isPublished, true),
      sortOrder: num(row.sortOrder, i),
    };
    if (incidentId) {
      await prisma.statusIncident.update({ where: { id: incidentId }, data: incidentData });
      keptIncidentIds.add(incidentId);
    } else {
      const created = await prisma.statusIncident.create({ data: incidentData });
      keptIncidentIds.add(created.id);
    }
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
      titleEn: str(row.titleEn),
      titleAr: str(row.titleAr),
      messageEn: str(row.messageEn),
      messageAr: str(row.messageAr),
      startsAt,
      endsAt,
      isPublished: bool(row.isPublished, true),
      sortOrder: num(row.sortOrder, i),
    };
    if (maintenanceId) {
      await prisma.statusMaintenance.update({ where: { id: maintenanceId }, data: maintenanceData });
      keptMaintenanceIds.add(maintenanceId);
    } else {
      const created = await prisma.statusMaintenance.create({ data: maintenanceData });
      keptMaintenanceIds.add(created.id);
    }
  }
  await prisma.statusMaintenance.deleteMany({
    where: { boardId: board.id, id: { notIn: [...keptMaintenanceIds] } },
  });

  revalidateStatusBoardPaths(board.slug, board.id);
  return board;
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
