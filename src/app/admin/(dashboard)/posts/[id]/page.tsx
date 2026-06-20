import { notFound } from "next/navigation";
import { cmsRepository } from "@/repositories/cms.repository";
import { PostEditorForm } from "@/features/cms/components/post-editor-form";
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
import { collectBlockEntityIds } from "@/features/translation/block-translation";
import { migrateLegacyCatalogBlocks } from "@/features/builder/migrate-legacy-blocks";
import { legacyShapeFromTranslations } from "@/features/portal/lib/portal-translation";
import { loadTranslationsMap, localizedFieldValue } from "@/features/translation/bilingual-serialize";
import { resolveTranslation } from "@/features/translation/translation-resolver";
import type { PageBlocks } from "@/types/builder";

type Props = { params: Promise<{ id: string }> };

export default async function EditPostPage({ params }: Props) {
  const { id } = await params;
  const [post, categories, tags, authors, postPickerRows, locales] = await Promise.all([
    cmsRepository.getPostById(id),
    cmsRepository.listCategories(),
    cmsRepository.listTags(),
    cmsRepository.listAuthors(),
    cmsRepository.listPostsForPicker(id),
    localeService.listEnabled(),
  ]);
  if (!post) notFound();

  const postPickerIds = postPickerRows.map((p) => p.id);
  const [pickerTranslations, categoryTranslations, tagTranslations, authorTranslations] =
    await Promise.all([
      loadTranslationsMap("Post", postPickerIds),
      loadTranslationsMap(
        "PostCategory",
        categories.map((c) => c.id)
      ),
      loadTranslationsMap(
        "PostTag",
        tags.map((t) => t.id)
      ),
      loadTranslationsMap(
        "PostAuthor",
        authors.map((a) => a.id)
      ),
    ]);
  const postPickerOptions = postPickerRows.map((p) => {
    const rowTranslations = pickerTranslations.get(p.id) ?? [];
    const ctx = { translations: rowTranslations };
    const titleEn = localizedFieldValue(rowTranslations, "title");
    const titleAr = resolveTranslation("title", "ar", ctx);
    return {
      id: p.id,
      slug: p.slug,
      status: p.status,
      displayTitle: titleEn || titleAr || p.slug,
    };
  });
  const enrichedCategories = categories.map((c) => {
    const rowTranslations = categoryTranslations.get(c.id) ?? [];
    const ctx = { translations: rowTranslations };
    return {
      ...c,
      nameEn: localizedFieldValue(rowTranslations, "name"),
      nameAr: resolveTranslation("name", "ar", ctx),
    };
  });
  const enrichedTags = tags.map((t) => {
    const rowTranslations = tagTranslations.get(t.id) ?? [];
    const ctx = { translations: rowTranslations };
    return {
      ...t,
      nameEn: localizedFieldValue(rowTranslations, "name"),
      nameAr: resolveTranslation("name", "ar", ctx),
    };
  });
  const enrichedAuthors = authors.map((a) => {
    const rowTranslations = authorTranslations.get(a.id) ?? [];
    const ctx = { translations: rowTranslations };
    return {
      ...a,
      bioEn: localizedFieldValue(rowTranslations, "bio"),
      bioAr: resolveTranslation("bio", "ar", ctx),
    };
  });

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

  const postTitle =
    legacyShapeFromTranslations(initialTranslations, ["title"]).titleEn ||
    legacyShapeFromTranslations(initialTranslations, ["title"]).titleAr ||
    post.slug;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Edit: {postTitle}</h1>
      <PostEditorForm
        post={post}
        categories={enrichedCategories}
        tags={enrichedTags}
        authors={enrichedAuthors}
        postPickerOptions={postPickerOptions}
        galleryOptions={galleryOptions}
        faqSetOptions={faqSetOptions}
        testimonialOptions={testimonialOptions}
        testimonialCollectionOptions={testimonialCollectionOptions}
        collectionOptions={collectionOptions}
        productOptions={productOptions}
        brandOptions={brandOptions}
        locales={locales}
        initialTranslations={initialTranslations}
        initialBlockTranslations={initialBlockTranslations}
      />
    </div>
  );
}
