import { notFound } from "next/navigation";
import { cmsRepository } from "@/repositories/cms.repository";
import { PostEditorForm } from "@/features/cms/components/post-editor-form";
import { fetchFaqSetsForBuilder } from "@/features/faq/actions";
import { fetchGalleriesForBuilder } from "@/features/gallery/actions";
import {
  fetchTestimonialCollectionsForBuilder,
  fetchTestimonialsForBuilder,
} from "@/features/testimonials/actions";
import { localeService } from "@/features/i18n/locale.service";
import { translationService } from "@/features/translation/translation.service";
import { collectBlockEntityIds } from "@/features/translation/block-translation";
import { migrateLegacyCatalogBlocks } from "@/features/builder/migrate-legacy-blocks";
import type { PageBlocks } from "@/types/builder";

type Props = { params: Promise<{ id: string }> };

export default async function EditPostPage({ params }: Props) {
  const { id } = await params;
  const [post, categories, tags, authors, postPickerOptions, locales] = await Promise.all([
    cmsRepository.getPostById(id),
    cmsRepository.listCategories(),
    cmsRepository.listTags(),
    cmsRepository.listAuthors(),
    cmsRepository.listPostsForPicker(id),
    localeService.listEnabled(),
  ]);
  if (!post) notFound();

  const blocks = migrateLegacyCatalogBlocks((post.blocks as PageBlocks) ?? []);
  const blockEntityIds = collectBlockEntityIds(blocks, "Post", post.id);
  const [initialBlockTranslations, initialTranslations] = await Promise.all([
    blockEntityIds.length > 0
      ? translationService.getForBlockEntityIds(blockEntityIds)
      : Promise.resolve([]),
    translationService.getForEntity("Post", post.id),
  ]);

  let galleryOptions: Awaited<ReturnType<typeof fetchGalleriesForBuilder>> = [];
  let faqSetOptions: Awaited<ReturnType<typeof fetchFaqSetsForBuilder>> = [];
  let testimonialOptions: Awaited<ReturnType<typeof fetchTestimonialsForBuilder>> = [];
  let testimonialCollectionOptions: Awaited<ReturnType<typeof fetchTestimonialCollectionsForBuilder>> =
    [];

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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Edit: {post.titleEn}</h1>
      <PostEditorForm
        post={post}
        categories={categories}
        tags={tags}
        authors={authors}
        postPickerOptions={postPickerOptions}
        galleryOptions={galleryOptions}
        faqSetOptions={faqSetOptions}
        testimonialOptions={testimonialOptions}
        testimonialCollectionOptions={testimonialCollectionOptions}
        locales={locales}
        initialTranslations={initialTranslations}
        initialBlockTranslations={initialBlockTranslations}
      />
    </div>
  );
}
