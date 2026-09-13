"use server";

import { revalidatePath } from "next/cache";
import { ReleaseEntryCategory, ReleaseStatus } from "@prisma/client";
import { requireAdmin } from "@/features/auth/guards";
import { uniqueSlug } from "@/features/portal/lib/unique-slug";
import { parseChildrenJson, str, num, bool } from "@/features/portal/lib/parse-children-json";
import { checkboxValue } from "@/features/portal/lib/action-helpers";
import { syncLegacyJsonRowTranslations } from "@/features/portal/lib/portal-translation";
import { revalidateMarketingHome } from "@/services/cache";
import { localeService } from "@/features/i18n/locale.service";
import { getDefaultLocaleFieldFromForm } from "@/features/translation/form-sync";
import { syncEntityTranslationsFromForm } from "@/features/translation/form-sync.server";
import { prisma } from "@/lib/prisma";

const ADMIN_BASE = "/admin/releases";

function revalidateReleasePaths(slug?: string, id?: string) {
  revalidateMarketingHome();
  revalidatePath(ADMIN_BASE);
  revalidatePath(`${ADMIN_BASE}/new`);
  if (id) revalidatePath(`${ADMIN_BASE}/${id}`);
  if (slug) revalidatePath(`/releases/${slug}`);
}

export async function upsertReleaseSet(formData: FormData) {
  await requireAdmin();
  const enabledLocales = await localeService.listEnabled();
  const id = (formData.get("id") as string | null) || undefined;
  const titleForSlug = getDefaultLocaleFieldFromForm(formData, enabledLocales, "title");
  const slugInput = (formData.get("slug") as string | null)?.trim();
  const slug = slugInput
    ? await uniqueSlug(prisma.releaseSet, slugInput, id, "releases")
    : await uniqueSlug(prisma.releaseSet, titleForSlug, id, "releases");

  const data = {
    slug,
    isPublished: checkboxValue(formData.get("isPublished")),
    sortOrder: Number(formData.get("sortOrder") ?? 0),
  };

  const releaseSet =
    id != null
      ? await prisma.releaseSet.update({ where: { id }, data })
      : await prisma.releaseSet.create({
          data: {
            ...data,
            sortOrder: data.sortOrder || (await prisma.releaseSet.count()),
          },
        });

  await syncEntityTranslationsFromForm(formData, "ReleaseSet", releaseSet.id, enabledLocales);

  const releases = parseChildrenJson(formData.get("releasesJson"));
  const keptReleaseIds = new Set<string>();

  for (let i = 0; i < releases.length; i++) {
    const row = releases[i];
    const releaseId = str(row.id);
    const statusRaw = str(row.status, "RELEASED");
    const status = Object.values(ReleaseStatus).includes(statusRaw as ReleaseStatus)
      ? (statusRaw as ReleaseStatus)
      : ReleaseStatus.RELEASED;

    const releaseData = {
      releaseSetId: releaseSet.id,
      version: str(row.version, `v${i + 1}`),
      releaseDate: row.releaseDate ? new Date(str(row.releaseDate)) : null,
      status,
      tags: Array.isArray(row.tags) ? row.tags : [],
      isPublished: bool(row.isPublished, true),
      sortOrder: num(row.sortOrder, i),
    };

    const release =
      releaseId != null
        ? await prisma.release.update({ where: { id: releaseId }, data: releaseData })
        : await prisma.release.create({ data: releaseData });
    keptReleaseIds.add(release.id);

    const entries = Array.isArray(row.entries) ? (row.entries as Record<string, unknown>[]) : [];
    const keptEntryIds = new Set<string>();
    for (let j = 0; j < entries.length; j++) {
      const entry = entries[j];
      const entryId = str(entry.id);
      const categoryRaw = str(entry.category, "FEATURES");
      const category = Object.values(ReleaseEntryCategory).includes(
        categoryRaw as ReleaseEntryCategory
      )
        ? (categoryRaw as ReleaseEntryCategory)
        : ReleaseEntryCategory.FEATURES;
      const entryData = {
        releaseId: release.id,
        category,
        sortOrder: num(entry.sortOrder, j),
      };
      const entryRow =
        entryId != null
          ? await prisma.releaseEntry.update({ where: { id: entryId }, data: entryData })
          : await prisma.releaseEntry.create({ data: entryData });
      keptEntryIds.add(entryRow.id);
      await syncLegacyJsonRowTranslations("ReleaseEntry", entryRow.id, entry, enabledLocales);
    }
    await prisma.releaseEntry.deleteMany({
      where: { releaseId: release.id, id: { notIn: [...keptEntryIds] } },
    });
  }

  await prisma.release.deleteMany({
    where: { releaseSetId: releaseSet.id, id: { notIn: [...keptReleaseIds] } },
  });

  revalidateReleasePaths(releaseSet.slug, releaseSet.id);
  return releaseSet;
}

export async function deleteReleaseSet(id: string) {
  await requireAdmin();
  const row = await prisma.releaseSet.findUnique({ where: { id }, select: { slug: true } });
  await prisma.releaseSet.delete({ where: { id } });
  revalidateReleasePaths(row?.slug, id);
}

export async function toggleReleaseSetPublished(id: string, isPublished: boolean) {
  await requireAdmin();
  const row = await prisma.releaseSet.update({
    where: { id },
    data: { isPublished },
    select: { slug: true, id: true },
  });
  revalidateReleasePaths(row.slug, id);
}
