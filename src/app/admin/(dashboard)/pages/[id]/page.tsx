import { Suspense } from "react";
import { notFound } from "next/navigation";
import { cmsRepository } from "@/repositories/cms.repository";
import { PageEditorForm } from "@/features/cms/components/page-editor-form";
import { fetchFaqSetsForBuilder } from "@/features/faq/actions";
import { fetchGalleriesForBuilder } from "@/features/gallery/actions";
import {
  fetchTestimonialCollectionsForBuilder,
  fetchTestimonialsForBuilder,
} from "@/features/testimonials/actions";
import {
  fetchCollectionsForBuilder,
  fetchProductsForBuilder,
} from "@/features/builder/blocks/commerce/product-blocks/actions";
import { fetchBrandsForBuilder } from "@/features/builder/blocks/commerce/commerce-showcase/actions";
import { localeService } from "@/features/i18n/locale.service";
import { translationService } from "@/features/translation/translation.service";
import { collectBlockEntityIds } from "@/features/translation/block-translation";
import { migrateBlocksToBlockSystem } from "@/features/builder/migration/upgrade-blocks";
import { toSeoMetaFormProps } from "@/features/seo/mappers/to-seo-meta-form-props";
import { resolvePageSeoContext } from "@/features/seo/resolve-page-seo-context";
import type { PageBlocks } from "@/types/builder";
import type { Prisma } from "@prisma/client";

type Props = { params: Promise<{ id: string }> };

export default async function EditPagePage({ params }: Props) {
  const { id } = await params;

  const page = await cmsRepository.getPageById(id);
  if (!page) notFound();

  const [locales, seoContext] = await Promise.all([
    localeService.listEnabled(),
    resolvePageSeoContext({ cmsPageId: id }),
  ]);

  const migration = migrateBlocksToBlockSystem((page.blocks as PageBlocks) ?? []);
  const blocks = migration.blocks;
  const blockEntityIds = collectBlockEntityIds(blocks, "CmsPage", page.id);

  const [initialBlockTranslations, initialPageTranslations, galleryOptions, faqSetOptions, testimonialOptions, testimonialCollectionOptions, collectionOptions, productOptions, brandOptions] =
    await Promise.all([
      blockEntityIds.length > 0
        ? translationService.getForBlockEntityIds(blockEntityIds)
        : Promise.resolve([]),
      translationService.getForEntity("CmsPage", page.id),
      fetchGalleriesForBuilder().catch(() => []),
      fetchFaqSetsForBuilder().catch(() => []),
      fetchTestimonialsForBuilder().catch(() => []),
      fetchTestimonialCollectionsForBuilder().catch(() => []),
      fetchCollectionsForBuilder().catch(() => []),
      fetchProductsForBuilder().catch(() => []),
      fetchBrandsForBuilder().catch(() => []),
    ]);

  const pageForEditor = {
    ...page,
    blocks: blocks as unknown as Prisma.JsonValue,
  };

  const seoFormProps = toSeoMetaFormProps(seoContext);

  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-muted-foreground">Loading page editor…</div>
      }
    >
      <PageEditorForm
        page={pageForEditor}
        locales={locales}
        initialBlockTranslations={initialBlockTranslations}
        initialPageTranslations={initialPageTranslations}
        seoFormProps={seoFormProps}
        galleryOptions={galleryOptions}
        faqSetOptions={faqSetOptions}
        testimonialOptions={testimonialOptions}
        testimonialCollectionOptions={testimonialCollectionOptions}
        collectionOptions={collectionOptions}
        productOptions={productOptions}
        brandOptions={brandOptions}
      />
    </Suspense>
  );
}
