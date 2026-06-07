import { Suspense } from "react";
import { PageEditorForm } from "@/features/cms/components/page-editor-form";
import { localeService } from "@/features/i18n/locale.service";
import { fetchFaqSetsForBuilder } from "@/features/faq/actions";
import { fetchGalleriesForBuilder } from "@/features/gallery/actions";
import {
  fetchTestimonialCollectionsForBuilder,
  fetchTestimonialsForBuilder,
} from "@/features/testimonials/actions";

export default async function NewPagePage() {
  const locales = await localeService.listEnabled();
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
    <Suspense
      fallback={
        <div className="p-6 text-sm text-muted-foreground">Loading page editor…</div>
      }
    >
      <PageEditorForm
        locales={locales}
        galleryOptions={galleryOptions}
        faqSetOptions={faqSetOptions}
        testimonialOptions={testimonialOptions}
        testimonialCollectionOptions={testimonialCollectionOptions}
      />
    </Suspense>
  );
}
