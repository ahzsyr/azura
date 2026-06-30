import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ContentEditPage } from "@/features/content/admin/content-edit-page";
import { contentService } from "@/features/content/content.service";
import { contentRepository } from "@/features/content/content.repository";
import { loadContentTypeWithLegacyFields } from "@/features/translation/admin-entity-helpers";
import { loadTranslationsMap, localizedFieldValue } from "@/features/translation/bilingual-serialize";
import { resolveTranslation } from "@/features/translation/translation-resolver";
import { localeService } from "@/features/i18n/locale.service";
import { translationService } from "@/features/translation/translation.service";
import { collectBlockEntityIds } from "@/features/translation/block-translation";
import { migrateLegacyCatalogBlocks } from "@/features/builder/migrate-legacy-blocks";
import type { PageBlocks } from "@/types/builder";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ typeSlug: string; id: string }> };

export default async function AdminContentEditRoute({ params }: Props) {
  const { typeSlug, id } = await params;
  await contentService.ensureReady();

  const contentType = await contentRepository.getTypeBySlug(typeSlug);
  if (!contentType) notFound();
  const enrichedType = await loadContentTypeWithLegacyFields(contentType);

  const item = await contentRepository.getItemById(id);
  if (!item || item.contentTypeId !== contentType.id) notFound();

  const mediaTranslations = await loadTranslationsMap(
    "ContentItemMedia",
    item.media.map((m) => m.id)
  );
  const enrichedItem = {
    ...item,
    media: item.media.map((m) => {
      const rowTranslations = mediaTranslations.get(m.id) ?? [];
      const ctx = { translations: rowTranslations };
      return {
        ...m,
        altEn: localizedFieldValue(rowTranslations, "alt"),
        altAr: resolveTranslation("alt", "ar", ctx),
        captionEn: localizedFieldValue(rowTranslations, "caption"),
        captionAr: resolveTranslation("caption", "ar", ctx),
      };
    }),
  };

  const collections = await contentRepository.listCollections(contentType.id);
  const locales = await localeService.listEnabled();
  const blocks = migrateLegacyCatalogBlocks((item.blocks as PageBlocks) ?? []);
  const blockEntityIds = collectBlockEntityIds(blocks, "ContentItem", item.id);
  const [initialBlockTranslations, initialItemTranslations] = await Promise.all([
    blockEntityIds.length > 0
      ? translationService.getForBlockEntityIds(blockEntityIds)
      : Promise.resolve([]),
    translationService.getForEntity("ContentItem", item.id),
  ]);

  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-muted-foreground">Loading content editor…</div>
      }
    >
      <ContentEditPage
        item={enrichedItem}
        contentType={enrichedType}
        collections={collections}
        locales={locales}
        initialBlockTranslations={initialBlockTranslations}
        initialItemTranslations={initialItemTranslations}
      />
    </Suspense>
  );
}
