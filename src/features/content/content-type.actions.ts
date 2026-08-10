"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/features/auth/guards";
import { contentTypeSchema } from "@/schemas/content/content-type";
import { RESERVED_URL_PREFIXES } from "@/i18n/reserved-slugs";
import { prisma } from "@/lib/prisma";
import { searchIndexer } from "@/capabilities/search/search-indexer.service";
import { revalidateComparableTypes } from "@/services/cache";
import { seoTriggerService } from "@/features/seo/triggers/seo-trigger.service";
import { localeService } from "@/features/i18n/locale.service";
import { syncEntityTranslationsFromForm } from "@/features/translation/form-sync.server";
import { getDefaultLocaleFieldFromForm } from "@/features/translation/form-fields";
import { mergeSearchDefaultsIntoAdminConfig } from "@/features/content/generate-search-profile-defaults";

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

function validateRoutePrefix(prefix: string | null | undefined) {
  if (!prefix?.trim()) return null;
  const normalized = prefix.trim().toLowerCase();
  if (RESERVED_URL_PREFIXES.has(normalized)) {
    throw new Error(`Route prefix "${normalized}" is reserved`);
  }
  return normalized;
}

export async function upsertContentType(formData: FormData) {
  await requireAdmin();

  const enabledLocales = await localeService.listEnabled();

  const isEnabledValues = formData.getAll("isEnabled");
  const isEnabled =
    isEnabledValues.includes("true") ||
    isEnabledValues.includes("on") ||
    (isEnabledValues.length === 0
      ? formData.get("isEnabled") === "true" || formData.get("isEnabled") === "on"
      : false);

  const fieldSchema = contentTypeSchema.shape.fieldSchema.parse(
    parseJson(formData.get("fieldSchema"), []),
  );

  const rawAdminConfig = parseJson(formData.get("adminConfig"), {}) as Record<string, unknown>;
  const adminConfig = mergeSearchDefaultsIntoAdminConfig(rawAdminConfig, fieldSchema);

  const parsed = contentTypeSchema.parse({
    id: formString(formData.get("id")) || undefined,
    slug: formString(formData.get("slug")),
    name: getDefaultLocaleFieldFromForm(formData, enabledLocales, "name"),
    labelSingular: getDefaultLocaleFieldFromForm(formData, enabledLocales, "labelSingular"),
    labelPlural: getDefaultLocaleFieldFromForm(formData, enabledLocales, "labelPlural"),
    icon: formString(formData.get("icon")) || "box",
    routePrefix: formString(formData.get("routePrefix")) || null,
    isEnabled,
    sortOrder: formString(formData.get("sortOrder")) || 0,
    fieldSchema,
    displaySchema: parseJson(formData.get("displaySchema"), {}),
    adminConfig,
  });

  const routePrefix = validateRoutePrefix(parsed.routePrefix);

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

  await syncEntityTranslationsFromForm(formData, "ContentType", type.id, enabledLocales, [
    "name",
    "labelSingular",
    "labelPlural",
    "excerpt",
  ]);

  revalidatePath("/admin/content");
  revalidatePath("/admin/content/types");
  revalidatePath("/admin/translations");
  if (routePrefix) revalidatePath(`/${routePrefix}`);
  revalidatePath(`/compare/${parsed.slug}`);
  revalidateComparableTypes();

  await searchIndexer.reindexContentType(type.id);

  await seoTriggerService.handle({
    type: "content.sitemapChanged",
    entityType: "CONTENT_TYPE",
    entityId: type.id,
    path: routePrefix ? `/${routePrefix}` : undefined,
  });

  redirect(`/admin/content/types/${type.id}`);
}

export async function updateContentTypeListAspect(typeId: string, aspect: string) {
  await requireAdmin();
  const type = await prisma.contentType.findUnique({
    where: { id: typeId },
    select: { adminConfig: true, slug: true },
  });
  if (!type) throw new Error("Content type not found");
  const current = (type.adminConfig ?? {}) as Record<string, unknown>;
  await prisma.contentType.update({
    where: { id: typeId },
    data: { adminConfig: { ...current, adminListImageAspect: aspect } },
  });
  revalidatePath(`/admin/content/${type.slug}`);
}

export async function deleteContentType(id: string) {
  await requireAdmin();

  const itemCount = await prisma.contentItem.count({
    where: { contentTypeId: id, deletedAt: null },
  });
  if (itemCount > 0) {
    throw new Error(`Cannot delete: ${itemCount} items still use this type`);
  }

  const type = await prisma.contentType.delete({ where: { id } });

  await seoTriggerService.handle({
    type: "content.sitemapChanged",
    entityType: "CONTENT_TYPE",
    entityId: id,
    path: type.routePrefix ? `/${type.routePrefix}` : undefined,
  });

  revalidatePath("/admin/content");
  revalidatePath("/admin/content/types");
  redirect("/admin/content/types");
}
