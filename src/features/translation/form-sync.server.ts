import "server-only";

import type { PublicLocale } from "@/i18n/locale-config";
import { getContentFieldSuffix } from "@/i18n/locale-config";
import { getEntityConfig } from "./entity-registry";
import { translationService } from "./translation.service";
import { parseFormTranslations } from "./form-fields";
import { prisma } from "@/lib/prisma";
import { seoTriggerService } from "@/features/seo/triggers/seo-trigger.service";
import { contentItemPaths } from "@/features/seo/triggers/path-resolver";

function readLocalizedFormField(
  formData: FormData,
  field: string,
  localeCode: string
): string | null {
  const suffix = getContentFieldSuffix(localeCode);
  const legacyName = `${field}${suffix}`;
  const modernName = `${field}_${localeCode}`;
  const raw = formData.get(modernName) ?? formData.get(legacyName);
  if (raw === null || raw === undefined) return null;
  return String(raw);
}

/**
 * Sync EntityTranslation rows from admin form submission (server-only).
 */
export async function syncEntityTranslationsFromForm(
  formData: FormData,
  entityType: string,
  entityId: string,
  locales: PublicLocale[],
  fields?: string[]
) {
  const config = getEntityConfig(entityType);
  const fieldList =
    fields ?? config?.fields.map((f) => f.field) ?? ["title", "excerpt", "description", "name", "content"];
  const inputs = parseFormTranslations(formData, entityType, entityId, locales, fieldList);
  const nonEmpty = inputs.filter((i) => i.value.trim());
  const empty = inputs.filter((i) => !i.value.trim());

  if (nonEmpty.length > 0) {
    await translationService.upsertMany(nonEmpty);
  }
  if (empty.length > 0) {
    await translationService.deleteMany(
      empty.map(({ entityType: et, entityId: eid, field, localeCode }) => ({
        entityType: et,
        entityId: eid,
        field,
        localeCode,
      }))
    );
  }
  return nonEmpty.length;
}

/** Persist localized slugs alongside the canonical entity.slug. */
export async function syncEntitySlugsFromForm(
  formData: FormData,
  entityType: string,
  entityId: string,
  canonicalSlug: string,
  locales: PublicLocale[]
) {
  const base = canonicalSlug.trim();
  if (!base) return;

  await Promise.all(
    locales.map(async (locale) => {
      const localized =
        readLocalizedFormField(formData, "slug", locale.code)?.trim() ||
        (formData.get("slug") as string | null)?.trim() ||
        base;
      const previous = await translationService.getLocalizedSlug(
        entityType,
        entityId,
        locale.code,
        base
      );
      await translationService.upsertSlug(entityType, entityId, locale.code, localized);
      if (previous !== localized) {
        const path = await localizedSeoPath(entityType, entityId, locale.urlPrefix, localized);
        const oldPath = await localizedSeoPath(entityType, entityId, locale.urlPrefix, previous);
        if (path) {
          await seoTriggerService.handle({
            type: "content.localizedSlugChanged",
            entityType:
              entityType === "CmsPage"
                ? "CMS_PAGE"
                : entityType === "Post"
                  ? "POST"
                  : "CONTENT_ITEM",
            entityId,
            locale: locale.code,
            path,
            oldPath,
          });
        }
      }
    })
  );
}

async function localizedSeoPath(
  entityType: string,
  entityId: string,
  urlPrefix: string,
  slug: string
) {
  if (entityType === "CmsPage") return `/${urlPrefix}/pages/${slug}`;
  if (entityType === "Post") return `/${urlPrefix}/blog/${slug}`;
  if (entityType === "ContentItem") {
    const item = await prisma.contentItem.findUnique({
      where: { id: entityId },
      select: { contentType: { select: { routePrefix: true } } },
    });
    return (await contentItemPaths(item?.contentType.routePrefix, slug)).find((path) =>
      path.startsWith(`/${urlPrefix}/`)
    );
  }
  return undefined;
}
