import "server-only";
import { revalidatePath } from "next/cache";
import { localeService } from "@/features/i18n/locale.service";
import { FALLBACK_LOCALES } from "@/i18n/locale-config";
import { contentItemPaths } from "@/features/seo/triggers/path-resolver";
import {
  CACHE_TAGS,
  revalidateContentList,
  revalidateTranslations,
} from "@/services/cache";
import { revalidateTag } from "next/cache";

const FALLBACK_PREFIXES = FALLBACK_LOCALES.map((locale) => locale.urlPrefix);

async function localePrefixes(): Promise<string[]> {
  const locales = await localeService.getEnabledUrlPrefixes().catch(() => []);
  return locales.length > 0 ? locales : [...FALLBACK_PREFIXES];
}

/** Revalidate admin content screens after a save or status change. */
export function revalidateContentAdminPaths(
  typeSlug: string,
  itemId?: string,
): void {
  revalidatePath("/admin/content");
  revalidatePath(`/admin/content/${typeSlug}`);
  if (itemId) revalidatePath(`/admin/content/${typeSlug}/${itemId}`);
}

/**
 * Revalidate every public URL for a content item (all enabled locale prefixes).
 * Also busts translation bundles and content list caches.
 */
export async function revalidateContentItemPublicPaths(input: {
  typeSlug: string;
  routePrefix?: string | null;
  slug?: string | null;
  itemId?: string;
}): Promise<string[]> {
  const { typeSlug, routePrefix, slug, itemId } = input;
  const publicSegment = routePrefix?.trim() || typeSlug;
  const prefixes = await localePrefixes();
  const paths: string[] = [];

  revalidateContentList(typeSlug);
  revalidateTag(CACHE_TAGS.marketing, "max");

  if (itemId) {
    revalidateTranslations("ContentItem", itemId);
  }

  if (publicSegment) {
    for (const locale of prefixes) {
      revalidatePath(`/${locale}/${publicSegment}`);
    }
    revalidatePath(`/pages/${typeSlug}`);

    if (slug) {
      const itemPaths = await contentItemPaths(routePrefix, slug, typeSlug);
      for (const path of itemPaths) {
        revalidatePath(path);
      }
      paths.push(...itemPaths);

      // Legacy locale-less paths (older revalidation callers).
      revalidatePath(`/${publicSegment}/${slug}`);
    }
  }

  if (typeSlug === "catalog-items") {
    for (const locale of prefixes) {
      revalidatePath(`/${locale}/packages`);
      if (slug) revalidatePath(`/${locale}/packages/${slug}`);
    }
    revalidatePath("/packages");
    if (slug) revalidatePath(`/packages/${slug}`);
  }

  return paths;
}
