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
  // #region agent log
  agentLog({
    location: "pages/[id]/page.tsx:entry",
    message: "EditPagePage render start",
    hypothesisId: "A",
    data: { pageId: id },
  });
  // #endregion

  try {
    const page = await cmsRepository.getPageById(id);
    if (!page) notFound();

    // #region agent log
    agentLog({
      location: "pages/[id]/page.tsx:afterGetPage",
      message: "page loaded",
      hypothesisId: "A",
      data: {
        pageId: id,
        blockCount: Array.isArray(page.blocks) ? (page.blocks as unknown[]).length : -1,
        rawBlockTypes: Array.isArray(page.blocks)
          ? (page.blocks as { type?: unknown }[]).map((b) => b.type)
          : [],
      },
    });
    // #endregion

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

    // #region agent log
    agentLog({
      location: "pages/[id]/page.tsx:afterMigrate",
      message: "blocks migrated",
      hypothesisId: "A",
      data: {
        pageId: id,
        blockCount: blocks.length,
        blockTypes: blocks.map((b) => b.type),
        migrationWarnings: migration.warnings.slice(0, 5),
      },
    });
    // #endregion

    const blockEntityIds = collectBlockEntityIds(blocks, "CmsPage", page.id);
    const [initialBlockTranslations, initialPageTranslations] = await Promise.all([
      blockEntityIds.length > 0
        ? translationService.getForBlockEntityIds(blockEntityIds)
        : Promise.resolve([]),
      translationService.getForEntity("CmsPage", page.id),
    ]);

    // #region agent log
    agentLog({
      location: "pages/[id]/page.tsx:afterTranslations",
      message: "translations loaded",
      hypothesisId: "C",
      data: {
        pageId: id,
        blockEntityIdCount: blockEntityIds.length,
        blockTranslationCount: initialBlockTranslations.length,
        pageTranslationCount: initialPageTranslations.length,
      },
    });
    // #endregion

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
      // #region agent log
      agentLogError(
        "pages/[id]/page.tsx:builderOptions",
        builderErr,
        "D",
        { pageId: id },
      );
      // #endregion
      // Builder option loaders fail closed to empty lists
    }

    // #region agent log
    agentLog({
      location: "pages/[id]/page.tsx:success",
      message: "EditPagePage render complete",
      hypothesisId: "A",
      data: { pageId: id },
    });
    // #endregion

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
    // #region agent log
    agentLogError("pages/[id]/page.tsx:render", error, "A", { pageId: id });
    // #endregion
    throw error;
  }
}
