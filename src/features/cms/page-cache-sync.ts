import { pageCache } from "@/features/storage/page-cache";
import type { CmsPage } from "@prisma/client";
import type { PageBlocks } from "@/types/builder";
import { translationService } from "@/features/translation/translation.service";
import { resolveTranslation } from "@/features/translation/translation-resolver";
import { FALLBACK_LOCALES } from "@/i18n/locale-config";

export async function syncCmsPageCache(page: CmsPage) {
  if (page.status !== "PUBLISHED") {
    await pageCache.invalidate(page.slug);
    return;
  }
  const translations = await translationService.getForEntity("CmsPage", page.id);
  const defaultCode = FALLBACK_LOCALES.find((locale) => locale.isDefault)?.code ?? "en";
  const ctx = { translations, enabledLocales: FALLBACK_LOCALES, defaultCode };
  const titleEn = resolveTranslation("title", "en", ctx);
  const titleAr = resolveTranslation("title", "ar", ctx);
  const excerptEn = resolveTranslation("excerpt", "en", ctx) || null;
  const excerptAr = resolveTranslation("excerpt", "ar", ctx) || null;
  await pageCache.set({
    id: page.id,
    slug: page.slug,
    title: resolveTranslation("title", defaultCode, ctx) || titleEn || titleAr || "",
    excerpt: resolveTranslation("excerpt", defaultCode, ctx) || excerptEn || excerptAr || null,
    titleEn,
    titleAr,
    excerptEn,
    excerptAr,
    blocks: (page.blocks as PageBlocks) ?? [],
    updatedAt: page.updatedAt.toISOString(),
  });
}
