import "server-only";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/features/auth/guards";
import { localeService } from "@/features/i18n/locale.service";
import { syncEntityTranslationsFromForm } from "@/features/translation/form-sync.server";
import { isEmptyPatch } from "@/lib/patch";
import { mergeAndPatch } from "@/lib/patch/form-data-patch";

function checkboxFromString(value: string | undefined): boolean {
  return value === "true" || value === "on" || value === "1";
}

function revalidateGalleryPaths(slug?: string, galleryId?: string) {
  revalidatePath("/admin/gallery");
  if (galleryId) revalidatePath(`/admin/gallery/${galleryId}`);
  if (slug) revalidatePath(`/gallery/${slug}`);
}

export async function patchGallery(id: string, changes: Record<string, unknown>) {
  await requireAdmin();
  if (isEmptyPatch(changes)) return { ok: true as const, noop: true as const };

  const existing = await prisma.gallery.findUnique({ where: { id } });
  if (!existing) throw new Error("Gallery not found");

  const baseline = {
    slug: existing.slug,
    coverUrl: existing.coverUrl ?? "",
    isPublished: String(existing.isPublished),
    sortOrder: String(existing.sortOrder),
  };

  const result = await mergeAndPatch(baseline, changes, async (merged) => {
    return prisma.gallery.update({
      where: { id },
      data: {
        slug: merged.slug,
        coverUrl: merged.coverUrl || null,
        isPublished: checkboxFromString(merged.isPublished),
        sortOrder: Number(merged.sortOrder) || 0,
      },
    });
  });

  if (result.ok && !result.noop) {
    const hasTitleChange = Object.keys(changes).some((k) => k.startsWith("title"));
    if (hasTitleChange) {
      const enabledLocales = await localeService.listEnabled();
      const formData = new FormData();
      formData.set("id", id);
      for (const [key, value] of Object.entries(changes)) {
        if (key.startsWith("title")) formData.set(key, String(value));
      }
      await syncEntityTranslationsFromForm(formData, "Gallery", id, enabledLocales, ["title"]);
    }
  }

  if (result.ok && result.entity && !result.noop) {
    revalidateGalleryPaths(result.entity.slug, id);
  }

  return result;
}

export async function patchStatusBoardFromForm(
  id: string,
  baseline: Record<string, string>,
  current: Record<string, string>,
) {
  await requireAdmin();
  const { computePatch } = await import("@/lib/patch");
  const changes = computePatch(baseline, current);
  if (isEmptyPatch(changes)) return { ok: true as const, noop: true as const };

  const scalarKeys = ["slug", "isPublished", "sortOrder"];
  const scalarChanges: Record<string, unknown> = {};
  for (const key of scalarKeys) {
    if (key in changes) scalarChanges[key] = changes[key as keyof typeof changes];
  }

  const existing = await prisma.statusBoard.findUnique({ where: { id } });
  if (!existing) throw new Error("Status board not found");

  if (!isEmptyPatch(scalarChanges)) {
    await mergeAndPatch(
      {
        slug: existing.slug,
        isPublished: String(existing.isPublished),
        sortOrder: String(existing.sortOrder),
      },
      scalarChanges,
      async (merged) =>
        prisma.statusBoard.update({
          where: { id },
          data: {
            slug: merged.slug,
            isPublished: checkboxFromString(merged.isPublished),
            sortOrder: Number(merged.sortOrder) || 0,
          },
        }),
    );
  }

  if ("servicesJson" in changes || "incidentsJson" in changes || "maintenanceJson" in changes) {
    const formData = new FormData();
    for (const [key, value] of Object.entries(current)) {
      formData.set(key, value);
    }
    formData.set("id", id);
    const { upsertStatusBoard } = await import("@/features/status/actions");
    await upsertStatusBoard(formData);
    return { ok: true as const };
  }

  revalidatePath("/admin/status");
  revalidatePath(`/admin/status/${id}`);
  if (existing.slug) revalidatePath(`/status/${existing.slug}`);

  return { ok: true as const };
}

export async function patchFaqSetFromForm(
  id: string,
  baseline: Record<string, string>,
  current: Record<string, string>,
) {
  await requireAdmin();
  const { computePatch } = await import("@/lib/patch");
  const changes = computePatch(baseline, current);
  if (isEmptyPatch(changes)) return { ok: true as const, noop: true as const };

  const formData = new FormData();
  for (const [key, value] of Object.entries(current)) {
    formData.set(key, value);
  }
  formData.set("id", id);
  const { upsertFaqSet } = await import("@/features/faq/actions");
  await upsertFaqSet(formData);
  return { ok: true as const };
}

export async function patchPartnerProgramFromForm(
  id: string,
  baseline: Record<string, string>,
  current: Record<string, string>,
) {
  await requireAdmin();
  const { computePatch } = await import("@/lib/patch");
  const changes = computePatch(baseline, current);
  if (isEmptyPatch(changes)) return { ok: true as const, noop: true as const };

  const formData = new FormData();
  for (const [key, value] of Object.entries(current)) {
    formData.set(key, value);
  }
  formData.set("id", id);
  const { upsertPartnerProgram } = await import("@/features/partners/actions");
  await upsertPartnerProgram(formData);
  return { ok: true as const };
}
