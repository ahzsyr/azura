import { Suspense } from "react";
import { PageEditorForm } from "@/features/cms/components/page-editor-form";
import { localeService } from "@/features/i18n/locale.service";
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

export default async function NewPagePage() {
  const locales = await localeService.listEnabled();
  let galleryOptions: Awaited<ReturnType<typeof fetchGalleriesForBuilder>> = [];
  let faqSetOptions: Awaited<ReturnType<typeof fetchFaqSetsForBuilder>> = [];
  let testimonialOptions: Awaited<ReturnType<typeof fetchTestimonialsForBuilder>> = [];
  let testimonialCollectionOptions: Awaited<ReturnType<typeof fetchTestimonialCollectionsForBuilder>> =
    [];
  let collectionOptions: Awaited<ReturnType<typeof fetchCollectionsForBuilder>> = [];
  let productOptions: Awaited<ReturnType<typeof fetchProductsForBuilder>> = [];
  let brandOptions: Awaited<ReturnType<typeof fetchBrandsForBuilder>> = [];

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
        collectionOptions={collectionOptions}
        productOptions={productOptions}
        brandOptions={brandOptions}
      />
    </Suspense>
  );
}
