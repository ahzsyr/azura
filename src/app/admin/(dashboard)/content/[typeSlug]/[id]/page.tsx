import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ContentEditPage } from "@/features/content/admin/content-edit-page";
import { contentService } from "@/features/content/content.service";
import { contentRepository } from "@/features/content/content.repository";
import { loadContentTypeWithLegacyFields } from "@/features/translation/admin-entity-helpers";
import { loadAdminRowsWithLocalizedFields } from "@/features/translation/admin-entity-helpers";
import { loadTranslationsMap, localizedFieldValue } from "@/features/translation/bilingual-serialize";
import { resolveTranslation } from "@/features/translation/translation-resolver";
import { localeService } from "@/features/i18n/locale.service";
import { translationService } from "@/features/translation/translation.service";
import { collectBlockEntityIds } from "@/features/translation/block-translation";
import { migrateLegacyCatalogBlocks } from "@/features/builder/migrate-legacy-blocks";
import { compositionService } from "@/features/layout-engine/composition.service";
import { getCompositionBlocks } from "@/features/layout-engine/composition-editor-helpers";
import { fetchGalleriesForBuilder } from "@/features/gallery/actions";
import { fetchFaqSetsForBuilder } from "@/features/faq/actions";
import {
  fetchTestimonialsForBuilder,
  fetchTestimonialCollectionsForBuilder,
} from "@/features/testimonials/actions";
import {
  fetchCollectionsForBuilder,
  fetchProductsForBuilder,
} from "@/features/builder/blocks/commerce/product-blocks/actions";
import { fetchBrandsForBuilder } from "@/features/builder/blocks/commerce/commerce-showcase/actions";
import { prisma } from "@/lib/prisma";
import type { PageBlocks, ContentTypeOption } from "@/types/builder";
import type { EntityTranslation } from "@prisma/client";
import type { BlockParentType } from "@/features/translation/block-translation";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ typeSlug: string; id: string }> };

export default async function AdminContentEditRoute({ params }: Props) {
  const { typeSlug, id } = await params;
  try {

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

  // All content types now store blocks directly on ContentItem — no CmsPage linking.
  const editSource: {
    ownerType: BlockParentType;
    ownerId: string;
    blocks: PageBlocks;
    blockTranslations: EntityTranslation[];
  } = (() => {
    const blocks = migrateLegacyCatalogBlocks((item.blocks as PageBlocks) ?? []);
    return {
      ownerType: "ContentItem",
      ownerId: item.id,
      blocks,
      blockTranslations: [] as EntityTranslation[],
    };
  })();

    const itemBlocks = migrateLegacyCatalogBlocks((item.blocks as PageBlocks) ?? []);
    const itemComposition = compositionService.load({
      composition: "composition" in item ? item.composition : undefined,
      blocks: itemBlocks,
    });
    const itemBlockEntityIds = collectBlockEntityIds(
      getCompositionBlocks(itemComposition),
      "ContentItem",
      item.id,
    );

    const [
      initialItemTranslations,
      initialItemBlockTranslations,
      rawContentTypes,
      galleryOptions,
      faqSetOptions,
      testimonialOptions,
      testimonialCollectionOptions,
      collectionOptions,
      productOptions,
      brandOptions,
    ] = await Promise.all([
      translationService.getForEntity("ContentItem", item.id),
      itemBlockEntityIds.length > 0 ? translationService.getForBlockEntityIds(itemBlockEntityIds) : Promise.resolve([]),
      prisma.contentType.findMany({
        where: { isEnabled: true },
        select: { id: true, slug: true },
        orderBy: { sortOrder: "asc" },
      }).catch(() => [] as { id: string; slug: string }[]),
      fetchGalleriesForBuilder().catch(() => []),
      fetchFaqSetsForBuilder().catch(() => []),
      fetchTestimonialsForBuilder().catch(() => []),
      fetchTestimonialCollectionsForBuilder().catch(() => []),
      fetchCollectionsForBuilder().catch(() => []),
      fetchProductsForBuilder().catch(() => []),
      fetchBrandsForBuilder().catch(() => []),
    ]);

    const localizedContentTypes = await loadAdminRowsWithLocalizedFields(
      "ContentType",
      rawContentTypes,
      ["labelPlural", "name"],
      "labelPlural"
    );

    const contentTypeOptions: ContentTypeOption[] = localizedContentTypes.map((t) => ({
      slug: t.slug,
      labelPlural: t.displayTitle?.trim() || t.slug,
      isEnabled: true,
    }));

    const revisions = await prisma.contentItemRevision
      .findMany({
        where: { itemId: item.id },
        orderBy: { createdAt: "desc" },
        take: 20,
      })
      .catch(() => []);

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
          blocksOwnerType={editSource.ownerType}
          blocksOwnerId={editSource.ownerId}
          initialEditorBlocks={editSource.blocks}
          initialEditorBlockTranslations={editSource.blockTranslations}
          initialItemBlockTranslations={initialItemBlockTranslations}
          initialItemTranslations={initialItemTranslations}
          contentTypeOptions={contentTypeOptions}
          galleryOptions={galleryOptions}
          faqSetOptions={faqSetOptions}
          testimonialOptions={testimonialOptions}
          testimonialCollectionOptions={testimonialCollectionOptions}
          collectionOptions={collectionOptions}
          productOptions={productOptions}
          brandOptions={brandOptions}
          initialRevisions={revisions}
        />
      </Suspense>
    );
  } catch (error) {
    console.error("[admin/content] edit route failed:", error);
    throw error;
  }
}
