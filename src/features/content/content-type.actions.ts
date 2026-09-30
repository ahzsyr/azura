"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
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
import { loadContentTypeOptionsForBuilder } from "@/features/content/admin/load-content-type-builder-options";
import { slugifyContentTypeName } from "@/features/content/content-admin-paths";
import { isCustomContentTypeSlug } from "@/templates/preset-template-map";
import {
  getBuiltinContentType,
  markReplacedBuiltinSlug,
  preserveBuiltinRetirement,
  readOriginBuiltinSlug,
  readRetiredBuiltinSlugs,
} from "@/features/content/content-type.registry";

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

function actionErrorMessage(error: unknown): string {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Invalid content type";
  }
  if (error instanceof Error) return error.message;
  return "Failed to save content type";
}

async function saveContentTypeFromForm(formData: FormData) {
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
    slug: formString(formData.get("slug")).trim().toLowerCase(),
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

  const existing = parsed.id
    ? await prisma.contentType.findUnique({
        where: { id: parsed.id },
        select: { slug: true, adminConfig: true },
      })
    : null;
  if (parsed.id && !existing) {
    throw new Error("Content type not found");
  }

  const slugConflict = await prisma.contentType.findFirst({
    where: {
      slug: parsed.slug,
      ...(parsed.id ? { NOT: { id: parsed.id } } : {}),
    },
    select: { slug: true },
  });
  if (slugConflict) {
    throw new Error(`Slug "${parsed.slug}" is already used`);
  }

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

  let persistedAdminConfig = preserveBuiltinRetirement(existing?.adminConfig, parsed.adminConfig);
  if (existing?.slug && existing.slug !== parsed.slug && getBuiltinContentType(existing.slug)) {
    persistedAdminConfig = markReplacedBuiltinSlug(persistedAdminConfig, existing.slug);
  }

  const data = {
    slug: parsed.slug,
    icon: parsed.icon,
    routePrefix,
    isEnabled: parsed.isEnabled,
    sortOrder: parsed.sortOrder,
    fieldSchema: parsed.fieldSchema as object,
    displaySchema: parsed.displaySchema as object,
    adminConfig: persistedAdminConfig as Prisma.InputJsonValue,
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

  try {
    revalidatePath("/admin/content");
    revalidatePath("/admin/content/types");
    revalidatePath("/admin/translations");
    revalidatePath(`/admin/content/${type.slug}`);
    revalidatePath(`/${type.slug}`);
    revalidatePath(`/pages/${type.slug}`);
    if (routePrefix) revalidatePath(`/${routePrefix}`);
    revalidatePath(`/compare/${parsed.slug}`);
    if (existing?.slug && existing.slug !== type.slug) {
      revalidatePath(`/admin/content/${existing.slug}`);
      revalidatePath(`/compare/${existing.slug}`);
    }
    revalidateComparableTypes();
  } catch (error) {
    console.error("[content-type] revalidate after save failed", error);
  }

  try {
    await searchIndexer.reindexContentType(type.id);
  } catch (error) {
    console.error("[content-type] search reindex after save failed", error);
  }

  try {
    await seoTriggerService.handle({
      type: "content.sitemapChanged",
      entityType: "CONTENT_TYPE",
      entityId: type.id,
      path: routePrefix ? `/${routePrefix}` : undefined,
    });
  } catch (error) {
    console.error("[content-type] seo trigger after save failed", error);
  }

  return { type, existingSlug: existing?.slug ?? null };
}

export async function upsertContentType(formData: FormData) {
  try {
    const { type } = await saveContentTypeFromForm(formData);
    return { ok: true as const, id: type.id, slug: type.slug };
  } catch (error) {
    return { ok: false as const, error: actionErrorMessage(error) };
  }
}

export async function quickCreateContentType(formData: FormData) {
  try {
    const { type } = await saveContentTypeFromForm(formData);
    return { ok: true as const, id: type.id, slug: type.slug };
  } catch (error) {
    return { ok: false as const, error: actionErrorMessage(error) };
  }
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

export async function fetchContentTypeOptionsForBuilder() {
  await requireAdmin();
  return loadContentTypeOptionsForBuilder();
}

export type ContentTypeDeleteImpact = {
  typeId: string;
  slug: string;
  label: string;
  isPreset: boolean;
  liveItemCount: number;
  softDeletedItemCount: number;
  collectionCount: number;
  sampleLiveItems: Array<{ id: string; slug: string | null; title: string }>;
  canDelete: boolean;
  blockReason: string | null;
};

async function allocateUniqueSlug(base: string) {
  const normalized = slugifyContentTypeName(base) || "type";
  let candidate = normalized.slice(0, 64);
  let n = 2;
  while (await prisma.contentType.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    const suffix = `-${n}`;
    candidate = `${normalized.slice(0, Math.max(1, 64 - suffix.length))}${suffix}`;
    n += 1;
  }
  return candidate;
}

async function allocateUniqueRoutePrefix(preferred: string | null) {
  if (!preferred?.trim()) return null;
  const base = preferred.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!base || RESERVED_URL_PREFIXES.has(base)) return null;
  let candidate = base;
  let n = 2;
  while (
    await prisma.contentType.findFirst({
      where: { routePrefix: candidate, isEnabled: true },
      select: { id: true },
    })
  ) {
    const suffix = `-${n}`;
    candidate = `${base.slice(0, Math.max(1, 64 - suffix.length))}${suffix}`;
    n += 1;
    if (n > 50) return null;
  }
  return candidate;
}

export async function getContentTypeDeleteImpact(id: string): Promise<ContentTypeDeleteImpact> {
  await requireAdmin();

  const type = await prisma.contentType.findUnique({
    where: { id },
    select: { id: true, slug: true },
  });
  if (!type) throw new Error("Content type not found");

  const [liveItemCount, softDeletedItemCount, collectionCount, liveItems, nameRows] = await Promise.all([
    prisma.contentItem.count({ where: { contentTypeId: id, deletedAt: null } }),
    prisma.contentItem.count({ where: { contentTypeId: id, deletedAt: { not: null } } }),
    prisma.contentCollection.count({ where: { contentTypeId: id } }),
    prisma.contentItem.findMany({
      where: { contentTypeId: id, deletedAt: null },
      select: { id: true, slug: true },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.entityTranslation.findMany({
      where: { entityType: "ContentType", entityId: id, field: { in: ["name", "labelPlural"] } },
      select: { field: true, localeCode: true, value: true },
    }),
  ]);

  const label =
    nameRows.find((r) => r.field === "labelPlural" && r.value.trim())?.value ||
    nameRows.find((r) => r.field === "name" && r.value.trim())?.value ||
    type.slug;

  const itemIds = liveItems.map((item) => item.id);
  const titleRows =
    itemIds.length > 0
      ? await prisma.entityTranslation.findMany({
          where: { entityType: "ContentItem", entityId: { in: itemIds }, field: "title" },
          select: { entityId: true, value: true, localeCode: true },
        })
      : [];
  const titleByItem = new Map<string, string>();
  for (const row of titleRows) {
    if (!titleByItem.has(row.entityId) && row.value.trim()) {
      titleByItem.set(row.entityId, row.value.trim());
    }
  }

  const canDelete = liveItemCount === 0;
  return {
    typeId: type.id,
    slug: type.slug,
    label,
    isPreset: !isCustomContentTypeSlug(type.slug),
    liveItemCount,
    softDeletedItemCount,
    collectionCount,
    sampleLiveItems: liveItems.map((item) => ({
      id: item.id,
      slug: item.slug,
      title: titleByItem.get(item.id) || item.slug || item.id,
    })),
    canDelete,
    blockReason: canDelete
      ? null
      : `Cannot delete while ${liveItemCount} live item${liveItemCount === 1 ? "" : "s"} still use this type. Move or delete those items first.`,
  };
}

export async function duplicateContentType(id: string) {
  await requireAdmin();

  const source = await prisma.contentType.findUnique({ where: { id } });
  if (!source) {
    return { ok: false as const, error: "Content type not found" };
  }

  try {
    const sourceTranslations = await prisma.entityTranslation.findMany({
      where: { entityType: "ContentType", entityId: id },
    });

    const nameEn =
      sourceTranslations.find((r) => r.field === "name" && r.localeCode === "en")?.value ||
      sourceTranslations.find((r) => r.field === "name")?.value ||
      source.slug;
    const pluralEn =
      sourceTranslations.find((r) => r.field === "labelPlural" && r.localeCode === "en")?.value ||
      sourceTranslations.find((r) => r.field === "labelPlural")?.value ||
      nameEn;

    const newSlug = await allocateUniqueSlug(`${source.slug}-copy`);
    const routePrefix = await allocateUniqueRoutePrefix(
      source.routePrefix ? `${source.routePrefix}-copy` : `${source.slug}-copy`,
    );

    const created = await prisma.contentType.create({
      data: {
        slug: newSlug,
        icon: source.icon || "box",
        routePrefix,
        isEnabled: source.isEnabled,
        sortOrder: source.sortOrder,
        fieldSchema: (source.fieldSchema ?? []) as object,
        displaySchema: (source.displaySchema ?? {}) as object,
        adminConfig: (source.adminConfig ?? {}) as object,
      },
    });

    const translationInputs = sourceTranslations.map((row) => {
      let value = row.value;
      if (row.field === "name" || row.field === "labelPlural") {
        value = value.trim() ? `${value.trim()} copy` : `${pluralEn} copy`;
      }
      return {
        entityType: "ContentType",
        entityId: created.id,
        field: row.field,
        localeCode: row.localeCode,
        value,
        status: row.status,
      };
    });

    if (translationInputs.length === 0) {
      translationInputs.push(
        {
          entityType: "ContentType",
          entityId: created.id,
          field: "name",
          localeCode: "en",
          value: `${nameEn} copy`,
          status: "PUBLISHED" as const,
        },
        {
          entityType: "ContentType",
          entityId: created.id,
          field: "labelSingular",
          localeCode: "en",
          value: nameEn,
          status: "PUBLISHED" as const,
        },
        {
          entityType: "ContentType",
          entityId: created.id,
          field: "labelPlural",
          localeCode: "en",
          value: `${pluralEn} copy`,
          status: "PUBLISHED" as const,
        },
      );
    }

    await prisma.entityTranslation.createMany({ data: translationInputs });

    revalidatePath("/admin/content");
    revalidatePath("/admin/content/types");
    revalidatePath(`/admin/content/${created.slug}`);
    revalidateComparableTypes();
    await searchIndexer.reindexContentType(created.id);

    return { ok: true as const, id: created.id, slug: created.slug };
  } catch (error) {
    return { ok: false as const, error: actionErrorMessage(error) };
  }
}

export async function deleteContentType(id: string) {
  await requireAdmin();

  const impact = await getContentTypeDeleteImpact(id);
  if (!impact.canDelete) {
    return { ok: false as const, error: impact.blockReason ?? "Cannot delete this content type" };
  }

  const type = await prisma.contentType.findUnique({ where: { id } });
  if (!type) {
    return { ok: false as const, error: "Content type not found" };
  }

  const [items, collections] = await Promise.all([
    prisma.contentItem.findMany({ where: { contentTypeId: id }, select: { id: true } }),
    prisma.contentCollection.findMany({ where: { contentTypeId: id }, select: { id: true } }),
  ]);
  const itemIds = items.map((item) => item.id);
  const collectionIds = collections.map((collection) => collection.id);

  await prisma.$transaction(async (tx) => {
    if (itemIds.length > 0) {
      await tx.entityTranslation.deleteMany({
        where: { entityType: "ContentItem", entityId: { in: itemIds } },
      });
      await tx.localizedSlug.deleteMany({
        where: { entityType: "ContentItem", entityId: { in: itemIds } },
      });
      await tx.searchDocument.deleteMany({
        where: { entityType: "CONTENT_ITEM", entityId: { in: itemIds } },
      });
    }
    if (collectionIds.length > 0) {
      await tx.entityTranslation.deleteMany({
        where: { entityType: "ContentCollection", entityId: { in: collectionIds } },
      });
      await tx.localizedSlug.deleteMany({
        where: { entityType: "ContentCollection", entityId: { in: collectionIds } },
      });
      await tx.searchDocument.deleteMany({
        where: { entityType: "CONTENT_COLLECTION", entityId: { in: collectionIds } },
      });
    }
    await tx.entityTranslation.deleteMany({
      where: { entityType: "ContentType", entityId: id },
    });
    await tx.searchDocument.deleteMany({
      where: { entityType: "CONTENT_TYPE", entityId: id },
    });
    await tx.contentType.delete({ where: { id } });

    const slugsToRetire = new Set<string>([
      ...readRetiredBuiltinSlugs(type.adminConfig),
      ...(readOriginBuiltinSlug(type.adminConfig) ? [readOriginBuiltinSlug(type.adminConfig)!] : []),
      ...(getBuiltinContentType(type.slug) ? [type.slug] : []),
    ]);
    if (slugsToRetire.size > 0) {
      const sibling = await tx.contentType.findFirst({
        orderBy: { sortOrder: "asc" },
        select: { id: true, adminConfig: true },
      });
      if (sibling) {
        let nextConfig: Prisma.InputJsonValue = sibling.adminConfig as Prisma.InputJsonValue;
        for (const slug of slugsToRetire) {
          nextConfig = markReplacedBuiltinSlug(nextConfig, slug) as Prisma.InputJsonValue;
        }
        await tx.contentType.update({
          where: { id: sibling.id },
          data: { adminConfig: nextConfig },
        });
      }
    }
  });

  await seoTriggerService.handle({
    type: "content.sitemapChanged",
    entityType: "CONTENT_TYPE",
    entityId: id,
    path: type.routePrefix ? `/${type.routePrefix}` : undefined,
  });

  revalidatePath("/admin/content");
  revalidatePath("/admin/content/types");
  revalidatePath(`/${type.slug}`);
  revalidatePath(`/pages/${type.slug}`);
  if (type.routePrefix) revalidatePath(`/${type.routePrefix}`);
  revalidateComparableTypes();

  return { ok: true as const, slug: type.slug };
}
