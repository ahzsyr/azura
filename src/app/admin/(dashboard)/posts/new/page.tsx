import { PostEditorForm } from "@/features/cms/components/post-editor-form";
import { cmsRepository } from "@/repositories/cms.repository";
import { localeService } from "@/features/i18n/locale.service";
import { fetchFaqSetsForBuilder } from "@/features/faq/actions";
import { fetchGalleriesForBuilder } from "@/features/gallery/actions";
import {
  fetchTestimonialCollectionsForBuilder,
  fetchTestimonialsForBuilder,
} from "@/features/testimonials/actions";

export default async function NewPostPage() {
  const [categories, tags, authors, locales] = await Promise.all([
    cmsRepository.listCategories(),
    cmsRepository.listTags(),
    cmsRepository.listAuthors(),
    localeService.listEnabled(),
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
      <h1 className="text-2xl font-bold">New Post</h1>
      <PostEditorForm
        categories={categories}
        tags={tags}
        authors={authors}
        galleryOptions={galleryOptions}
        faqSetOptions={faqSetOptions}
        testimonialOptions={testimonialOptions}
        testimonialCollectionOptions={testimonialCollectionOptions}
        locales={locales}
      />
    </div>
  );
}
