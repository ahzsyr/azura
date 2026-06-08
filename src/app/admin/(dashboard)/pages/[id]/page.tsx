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
import { localeService } from "@/features/i18n/locale.service";
import { translationService } from "@/features/translation/translation.service";
import {
  collectBlockEntityIds,
} from "@/features/translation/block-translation";
import { migrateBlocksToBlockSystem } from "@/features/builder/migration/upgrade-blocks";
import type { PageBlocks } from "@/types/builder";

type Props = { params: Promise<{ id: string }> };

export default async function EditPagePage({ params }: Props) {
  const { id } = await params;
  const page = await cmsRepository.getPageById(id);
  if (!page) notFound();

  let galleryOptions: Awaited<ReturnType<typeof fetchGalleriesForBuilder>> = [];
  let faqSetOptions: Awaited<ReturnType<typeof fetchFaqSetsForBuilder>> = [];
  let testimonialOptions: Awaited<ReturnType<typeof fetchTestimonialsForBuilder>> = [];
  let testimonialCollectionOptions: Awaited<ReturnType<typeof fetchTestimonialCollectionsForBuilder>> =
    [];

  const locales = await localeService.listEnabled();
  const blocks = migrateBlocksToBlockSystem((page.blocks as PageBlocks) ?? []).blocks;
  const blockEntityIds = collectBlockEntityIds(blocks, "CmsPage", page.id);
  const [initialBlockTranslations, initialPageTranslations] = await Promise.all([
    blockEntityIds.length > 0
      ? translationService.getForBlockEntityIds(blockEntityIds)
      : Promise.resolve([]),
    translationService.getForEntity("CmsPage", page.id),
  ]);

  try {
    [galleryOptions, faqSetOptions, testimonialOptions, testimonialCollectionOptions] =
      await Promise.all([
        fetchGalleriesForBuilder(),
        fetchFaqSetsForBuilder(),
        fetchTestimonialsForBuilder(),
        fetchTestimonialCollectionsForBuilder(),
      ]);
  } catch {
    // Builder option loaders fail closed to empty lists
  }
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-muted-foreground">Loading page editor…</div>
      }
    >
      <PageEditorForm
        page={page}
        locales={locales}
        initialBlockTranslations={initialBlockTranslations}
        initialPageTranslations={initialPageTranslations}
        galleryOptions={galleryOptions}
        faqSetOptions={faqSetOptions}
        testimonialOptions={testimonialOptions}
        testimonialCollectionOptions={testimonialCollectionOptions}
      />
    </Suspense>
  );
}
