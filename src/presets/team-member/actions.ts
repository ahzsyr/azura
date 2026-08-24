"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
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
import {
  removeTeamDirectorySearchIndex,
  syncTeamDirectorySearchIndex,
} from "@/capabilities/search/engine/indexing/portal-index-hooks";

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
  const enabledLocales = await localeService.listEnabled();
  const id = (formData.get("id") as string | null) || undefined;
  const titleForSlug = getDefaultLocaleFieldFromForm(formData, enabledLocales, "title");
  const slugInput = (formData.get("slug") as string | null)?.trim();
  const slug = slugInput
    ? await uniqueSlug(prisma.teamDirectory, slugInput, id, "team")
    : await uniqueSlug(prisma.teamDirectory, titleForSlug, id, "team");

  const data = {
    slug,
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

  await syncEntityTranslationsFromForm(formData, "TeamDirectory", directory.id, enabledLocales);

  const departments = parseChildrenJson(formData.get("departmentsJson"));
  const members = parseChildrenJson(formData.get("membersJson"));
  const keptDepartmentIds = new Set<string>();
  const keptMemberIds = new Set<string>();

  for (let i = 0; i < departments.length; i++) {
    const row = departments[i];
    const departmentId = str(row.id);
    const departmentData = {
      directoryId: directory.id,
      sortOrder: num(row.sortOrder, i),
    };
    const department =
      departmentId != null
        ? await prisma.teamDepartment.update({ where: { id: departmentId }, data: departmentData })
        : await prisma.teamDepartment.create({ data: departmentData });
    keptDepartmentIds.add(department.id);
    await syncEntityRowTranslations("TeamDepartment", department.id, row, enabledLocales);
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
      email: str(row.email),
      phone: str(row.phone),
      skills: skills as Prisma.InputJsonValue,
      imageUrl: str(row.imageUrl),
      isPublished: bool(row.isPublished, true),
      sortOrder: num(row.sortOrder, i),
    };
    const member =
      memberId != null
        ? await prisma.teamMember.update({ where: { id: memberId }, data: memberData })
        : await prisma.teamMember.create({ data: memberData });
    keptMemberIds.add(member.id);
    await syncEntityRowTranslations("TeamMember", member.id, row, enabledLocales);
  }
  const removingMembers = await prisma.teamMember.findMany({
    where: { directoryId: directory.id, id: { notIn: [...keptMemberIds] } },
    select: { id: true },
  });
  const { frameworkSearchIndexer } = await import("@/capabilities/search/engine");
  for (const member of removingMembers) {
    await frameworkSearchIndexer.remove("TEAM_MEMBER", member.id, { revalidate: false });
  }
  await prisma.teamMember.deleteMany({
    where: { directoryId: directory.id, id: { notIn: [...keptMemberIds] } },
  });

  revalidateTeamDirectoryPaths(directory.slug, directory.id);
  await syncTeamDirectorySearchIndex(directory.id);
  return directory;
}

export async function deleteTeamDirectory(id: string) {
  await requireAdmin();
  const row = await prisma.teamDirectory.findUnique({ where: { id }, select: { slug: true } });
  await removeTeamDirectorySearchIndex(id);
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
  await syncTeamDirectorySearchIndex(id);
}
