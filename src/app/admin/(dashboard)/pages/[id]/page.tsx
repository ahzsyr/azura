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
} from "@/features/product-blocks/actions";
import { fetchBrandsForBuilder } from "@/features/commerce-showcase/actions";
import { localeService } from "@/features/i18n/locale.service";
import { translationService } from "@/features/translation/translation.service";
import {
  collectBlockEntityIds,
} from "@/features/translation/block-translation";
import { migrateBlocksToBlockSystem } from "@/features/builder/migration/upgrade-blocks";
import type { PageBlocks } from "@/types/builder";
import type { Prisma } from "@prisma/client";
import { agentLog, agentLogError } from "@/lib/debug/agent-log";

type Props = { params: Promise<{ id: string }> };

export default async function EditPagePage({ params }: Props) {
  const { id } = await params;

  try {
    const page = await cmsRepository.getPageById(id);
    if (!page) notFound();


    let galleryOptions: Awaited<ReturnType<typeof fetchGalleriesForBuilder>> = [];
    let faqSetOptions: Awaited<ReturnType<typeof fetchFaqSetsForBuilder>> = [];
    let testimonialOptions: Awaited<ReturnType<typeof fetchTestimonialsForBuilder>> = [];
    let testimonialCollectionOptions: Awaited<
      ReturnType<typeof fetchTestimonialCollectionsForBuilder>
    > = [];
    let collectionOptions: Awaited<ReturnType<typeof fetchCollectionsForBuilder>> = [];
    let productOptions: Awaited<ReturnType<typeof fetchProductsForBuilder>> = [];
    let brandOptions: Awaited<ReturnType<typeof fetchBrandsForBuilder>> = [];

    const locales = await localeService.listEnabled();
    const migration = migrateBlocksToBlockSystem((page.blocks as PageBlocks) ?? []);
    const blocks = migration.blocks;


    const blockEntityIds = collectBlockEntityIds(blocks, "CmsPage", page.id);
    const [initialBlockTranslations, initialPageTranslations] = await Promise.all([
      blockEntityIds.length > 0
        ? translationService.getForBlockEntityIds(blockEntityIds)
        : Promise.resolve([]),
      translationService.getForEntity("CmsPage", page.id),
    ]);


    try {
      [
        galleryOptions,
        faqSetOptions,
        testimonialOptions,
        testimonialCollectionOptions,
        collectionOptions,
        productOptions,
        brandOptions,
      ] = await Promise.all([
        fetchGalleriesForBuilder(),
        fetchFaqSetsForBuilder(),
        fetchTestimonialsForBuilder(),
        fetchTestimonialCollectionsForBuilder(),
        fetchCollectionsForBuilder(),
        fetchProductsForBuilder(),
        fetchBrandsForBuilder(),
      ]);
    } catch (builderErr) {
      // Builder option loaders fail closed to empty lists
    }


    const pageForEditor = {
      ...page,
      blocks: blocks as unknown as Prisma.JsonValue,
    };

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
  } catch (error) {
    throw error;
  }
}
