"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/features/auth/guards";
import { uniqueSlug } from "@/features/portal/lib/unique-slug";
import { parseChildrenJson, str, num, bool } from "@/features/portal/lib/parse-children-json";
import { checkboxValue } from "@/features/portal/lib/action-helpers";
import { revalidateMarketingHome } from "@/services/cache";
import { prisma } from "@/lib/prisma";

const ADMIN_BASE = "/admin/team";

function revalidateTeamDirectoryPaths(slug?: string, id?: string) {
  revalidateMarketingHome();
  revalidatePath(ADMIN_BASE);
  revalidatePath(`${ADMIN_BASE}/new`);
  if (id) revalidatePath(`${ADMIN_BASE}/${id}`);
  if (slug) revalidatePath(`/team/${slug}`);
}

export async function upsertTeamDirectory(formData: FormData) {
  await requireAdmin();
  const id = (formData.get("id") as string | null) || undefined;
  const titleEn = (formData.get("titleEn") as string) ?? "";
  const slugInput = (formData.get("slug") as string | null)?.trim();
  const slug = slugInput
    ? await uniqueSlug(prisma.teamDirectory, slugInput, id, "team")
    : await uniqueSlug(prisma.teamDirectory, titleEn, id, "team");

  const data = {
    slug,
    titleEn,
    titleAr: (formData.get("titleAr") as string) ?? "",
    descriptionEn: (formData.get("descriptionEn") as string) || "",
    descriptionAr: (formData.get("descriptionAr") as string) || "",
    isPublished: checkboxValue(formData.get("isPublished")),
    sortOrder: Number(formData.get("sortOrder") ?? 0),
  };

  const directory =
    id != null
      ? await prisma.teamDirectory.update({ where: { id }, data })
      : await prisma.teamDirectory.create({
          data: {
            ...data,
            sortOrder: data.sortOrder || (await prisma.teamDirectory.count()),
          },
        });

  const departments = parseChildrenJson(formData.get("departmentsJson"));
  const members = parseChildrenJson(formData.get("membersJson"));
  const keptDepartmentIds = new Set<string>();
  const keptMemberIds = new Set<string>();

  for (let i = 0; i < departments.length; i++) {
    const row = departments[i];
    const departmentId = str(row.id);
    const departmentData = {
      directoryId: directory.id,
      nameEn: str(row.nameEn),
      nameAr: str(row.nameAr),
      sortOrder: num(row.sortOrder, i),
    };
    if (departmentId) {
      await prisma.teamDepartment.update({ where: { id: departmentId }, data: departmentData });
      keptDepartmentIds.add(departmentId);
    } else {
      const created = await prisma.teamDepartment.create({ data: departmentData });
      keptDepartmentIds.add(created.id);
    }
  }
  await prisma.teamDepartment.deleteMany({
    where: { directoryId: directory.id, id: { notIn: [...keptDepartmentIds] } },
  });

  for (let i = 0; i < members.length; i++) {
    const row = members[i];
    const memberId = str(row.id);
    const skills = Array.isArray(row.skills) ? row.skills : [];
    const memberData = {
      directoryId: directory.id,
      departmentId: str(row.departmentId) || null,
      nameEn: str(row.nameEn),
      nameAr: str(row.nameAr),
      roleEn: str(row.roleEn),
      roleAr: str(row.roleAr),
      bioEn: str(row.bioEn),
      bioAr: str(row.bioAr),
      email: str(row.email),
      phone: str(row.phone),
      locationEn: str(row.locationEn),
      locationAr: str(row.locationAr),
      skills: skills as Prisma.InputJsonValue,
      imageUrl: str(row.imageUrl),
      isPublished: bool(row.isPublished, true),
      sortOrder: num(row.sortOrder, i),
    };
    if (memberId) {
      await prisma.teamMember.update({ where: { id: memberId }, data: memberData });
      keptMemberIds.add(memberId);
    } else {
      const created = await prisma.teamMember.create({ data: memberData });
      keptMemberIds.add(created.id);
    }
  }
  await prisma.teamMember.deleteMany({
    where: { directoryId: directory.id, id: { notIn: [...keptMemberIds] } },
  });

  revalidateTeamDirectoryPaths(directory.slug, directory.id);
  return directory;
}

export async function deleteTeamDirectory(id: string) {
  await requireAdmin();
  const row = await prisma.teamDirectory.findUnique({ where: { id }, select: { slug: true } });
  await prisma.teamDirectory.delete({ where: { id } });
  revalidateTeamDirectoryPaths(row?.slug, id);
}

export async function toggleTeamDirectoryPublished(id: string, isPublished: boolean) {
  await requireAdmin();
  const row = await prisma.teamDirectory.update({
    where: { id },
    data: { isPublished },
    select: { slug: true, id: true },
  });
  revalidateTeamDirectoryPaths(row.slug, id);
}
