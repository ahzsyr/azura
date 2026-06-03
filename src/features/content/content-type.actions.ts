"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/features/auth/guards";
import { contentTypeSchema } from "@/schemas/content/content-type";
import { RESERVED_URL_PREFIXES } from "@/i18n/reserved-slugs";
import { prisma } from "@/lib/prisma";
import { searchIndexer } from "@/features/search/search-indexer.service";

function formString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

function parseJson(raw: FormDataEntryValue | null, fallback: unknown) {
  if (!raw || typeof raw !== "string" || !raw.trim()) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function validateRoutePrefix(prefix: string | null | undefined, slug: string, excludeId?: string) {
  if (!prefix?.trim()) return null;
  const normalized = prefix.trim().toLowerCase();
  if (RESERVED_URL_PREFIXES.has(normalized)) {
    throw new Error(`Route prefix "${normalized}" is reserved`);
  }
  return normalized;
}

export async function upsertContentType(formData: FormData) {
  await requireAdmin();

  const isEnabledValues = formData.getAll("isEnabled");
  const isEnabled =
    isEnabledValues.includes("true") ||
    isEnabledValues.includes("on") ||
    (isEnabledValues.length === 0
      ? formData.get("isEnabled") === "true" || formData.get("isEnabled") === "on"
      : false);

  const parsed = contentTypeSchema.parse({
    id: formString(formData.get("id")) || undefined,
    slug: formString(formData.get("slug")),
    nameEn: formString(formData.get("nameEn")),
    nameAr: formString(formData.get("nameAr")),
    labelSingularEn: formString(formData.get("labelSingularEn")),
    labelSingularAr: formString(formData.get("labelSingularAr")),
    labelPluralEn: formString(formData.get("labelPluralEn")),
    labelPluralAr: formString(formData.get("labelPluralAr")),
    icon: formString(formData.get("icon")) || "box",
    routePrefix: formString(formData.get("routePrefix")) || null,
    isEnabled,
    sortOrder: formString(formData.get("sortOrder")) || 0,
    fieldSchema: parseJson(formData.get("fieldSchema"), []),
    displaySchema: parseJson(formData.get("displaySchema"), {}),
    adminConfig: parseJson(formData.get("adminConfig"), {}),
  });

  const routePrefix = validateRoutePrefix(parsed.routePrefix, parsed.slug, parsed.id);

  if (routePrefix) {
    const conflict = await prisma.contentType.findFirst({
      where: {
        routePrefix,
        isEnabled: true,
        ...(parsed.id ? { NOT: { id: parsed.id } } : {}),
      },
    });
    if (conflict) {
      throw new Error(`Route prefix "${routePrefix}" is already used by ${conflict.slug}`);
    }
  }

  const data = {
    slug: parsed.slug,
    nameEn: parsed.nameEn,
    nameAr: parsed.nameAr,
    labelSingularEn: parsed.labelSingularEn,
    labelSingularAr: parsed.labelSingularAr,
    labelPluralEn: parsed.labelPluralEn,
    labelPluralAr: parsed.labelPluralAr,
    icon: parsed.icon,
    routePrefix,
    isEnabled: parsed.isEnabled,
    sortOrder: parsed.sortOrder,
    fieldSchema: parsed.fieldSchema as object,
    displaySchema: parsed.displaySchema as object,
    adminConfig: parsed.adminConfig as object,
  };

  let type;
  if (parsed.id) {
    type = await prisma.contentType.update({ where: { id: parsed.id }, data });
  } else {
    type = await prisma.contentType.create({ data });
  }

  revalidatePath("/admin/content");
  revalidatePath("/admin/content/types");
  if (routePrefix) revalidatePath(`/${routePrefix}`);
  revalidatePath(`/compare/${parsed.slug}`);
  await searchIndexer.reindexContentType(type.id);
  redirect(`/admin/content/types/${type.id}`);
}

export async function deleteContentType(id: string) {
  await requireAdmin();

  const itemCount = await prisma.contentItem.count({
    where: { contentTypeId: id, deletedAt: null },
  });
  if (itemCount > 0) {
    throw new Error(`Cannot delete: ${itemCount} items still use this type`);
  }

  await prisma.contentType.delete({ where: { id } });
  revalidatePath("/admin/content");
  revalidatePath("/admin/content/types");
  redirect("/admin/content/types");
}
