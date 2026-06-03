import { notFound } from "next/navigation";
import { ContentEditPage } from "@/features/content/admin/content-edit-page";
import { contentService } from "@/features/content/content.service";
import { contentRepository } from "@/features/content/content.repository";
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

  const item = await contentRepository.getItemById(id);
  if (!item || item.contentTypeId !== contentType.id) notFound();

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
    <ContentEditPage
      item={item}
      contentType={contentType}
      collections={collections}
      locales={locales}
      initialBlockTranslations={initialBlockTranslations}
      initialItemTranslations={initialItemTranslations}
    />
  );
}
