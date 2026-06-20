"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/auth/guards";
import { searchIndexer } from "@/features/search/search-indexer.service";
import { mediaRepository } from "@/repositories/media.repository";
import { revalidateSearch, revalidateMarketingHome } from "@/services/cache";
import { loadTranslationsMap, localizedFieldValue } from "@/features/translation/bilingual-serialize";
import { resolveTranslation } from "@/features/translation/translation-resolver";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { localeService } from "@/features/i18n/locale.service";
import { getDefaultLocaleFieldFromForm } from "@/features/translation/form-sync";
import {
  syncEntityTranslationsFromForm,
  syncEntitySlugsFromForm,
} from "@/features/translation/form-sync.server";
import { translationService } from "@/features/translation/translation.service";

function checkboxValue(raw: FormDataEntryValue | null): boolean {
  return raw === "true" || raw === "on" || raw === "1";
}

function revalidateTestimonialPaths(collectionSlug?: string, collectionId?: string) {
  revalidateMarketingHome();
  revalidatePath("/admin/testimonials");
  revalidatePath("/admin/testimonials/collections/new");
  revalidatePath("/testimonials");
  if (collectionId) revalidatePath(`/admin/testimonials/collections/${collectionId}`);
  if (collectionSlug) revalidatePath(`/testimonials?collection=${collectionSlug}`);
}

async function uniqueCollectionSlug(base: string, excludeId?: string): Promise<string> {
  const slug = slugify(base) || "testimonials";
  let candidate = slug;
  let n = 1;
  while (true) {
    const existing = await prisma.testimonialCollection.findFirst({
      where: { slug: candidate, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    });
    if (!existing) return candidate;
    n += 1;
    candidate = `${slug}-${n}`;
  }
}

export async function upsertTestimonialCollection(formData: FormData) {
  await requireAdmin();
  const enabledLocales = await localeService.listEnabled();
  const id = (formData.get("id") as string | null) || undefined;
  const titleForSlug = getDefaultLocaleFieldFromForm(formData, enabledLocales, "title");
  const slugInput = (formData.get("slug") as string | null)?.trim();
  const slug = slugInput
    ? await uniqueCollectionSlug(slugInput, id)
    : await uniqueCollectionSlug(titleForSlug, id);

  const data = {
    slug,
    isPublished: checkboxValue(formData.get("isPublished")),
    sortOrder: Number(formData.get("sortOrder") ?? 0),
  };

  const collection = id
    ? await prisma.testimonialCollection.update({ where: { id }, data })
    : await prisma.testimonialCollection.create({
        data: {
          ...data,
          sortOrder: data.sortOrder || (await prisma.testimonialCollection.count()),
        },
      });

  await syncEntityTranslationsFromForm(formData, "TestimonialCollection", collection.id, enabledLocales);
  await syncEntitySlugsFromForm(formData, "TestimonialCollection", collection.id, collection.slug, enabledLocales);

  revalidateTestimonialPaths(collection.slug, collection.id);
  return collection;
}

export async function deleteTestimonialCollection(id: string) {
  await requireAdmin();
  const collection = await prisma.testimonialCollection.findUnique({
    where: { id },
    select: { slug: true },
  });
  await prisma.testimonialCollection.delete({ where: { id } });
  revalidateSearch();
  revalidateTestimonialPaths(collection?.slug, id);
}

export async function reorderTestimonialCollections(ids: string[]) {
  await requireAdmin();
  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.testimonialCollection.update({ where: { id }, data: { sortOrder: index } })
    )
  );
  revalidateTestimonialPaths();
}

export async function toggleTestimonialCollectionPublished(id: string, isPublished: boolean) {
  await requireAdmin();
  const collection = await prisma.testimonialCollection.update({
    where: { id },
    data: { isPublished },
    select: { slug: true, id: true },
  });
  revalidateSearch();
  revalidateTestimonialPaths(collection.slug, id);
}

export async function addTestimonialToCollection(collectionId: string, testimonialId: string) {
  await requireAdmin();
  const existing = await prisma.testimonialCollectionItem.findFirst({
    where: { collectionId, testimonialId },
  });
  if (existing) return existing;

  const count = await prisma.testimonialCollectionItem.count({ where: { collectionId } });
  const item = await prisma.testimonialCollectionItem.create({
    data: { collectionId, testimonialId, sortOrder: count },
  });

  const collection = await prisma.testimonialCollection.findUnique({
    where: { id: collectionId },
    select: { slug: true },
  });
  revalidateTestimonialPaths(collection?.slug, collectionId);
  return item;
}

export async function removeTestimonialFromCollection(collectionId: string, itemId: string) {
  await requireAdmin();
  await prisma.testimonialCollectionItem.delete({ where: { id: itemId, collectionId } });
  const collection = await prisma.testimonialCollection.findUnique({
    where: { id: collectionId },
    select: { slug: true },
  });
  revalidateTestimonialPaths(collection?.slug, collectionId);
}

export async function reorderTestimonialCollectionItems(collectionId: string, itemIds: string[]) {
  await requireAdmin();
  await prisma.$transaction(
    itemIds.map((id, index) =>
      prisma.testimonialCollectionItem.update({
        where: { id, collectionId },
        data: { sortOrder: index },
      })
    )
  );
  const collection = await prisma.testimonialCollection.findUnique({
    where: { id: collectionId },
    select: { slug: true },
  });
  revalidateTestimonialPaths(collection?.slug, collectionId);
}

export async function upsertTestimonial(formData: FormData) {
  await requireAdmin();
  const enabledLocales = await localeService.listEnabled();
  const id = (formData.get("id") as string | null) || undefined;
  const data = {
    name: formData.get("name") as string,
    location: formData.get("location") as string,
    rating: Number(formData.get("rating") ?? 5),
    videoUrl: (formData.get("videoUrl") as string) || null,
    imageUrl: (formData.get("imageUrl") as string) || null,
    isPublished: checkboxValue(formData.get("isPublished")),
    sortOrder: Number(formData.get("sortOrder") ?? 0),
  };

  const testimonial = id
    ? await prisma.testimonial.update({ where: { id }, data })
    : await prisma.testimonial.create({
        data: {
          ...data,
          sortOrder: data.sortOrder || (await prisma.testimonial.count()),
        },
      });

  const mediaAssetId = (formData.get("mediaAssetId") as string | null) || null;
  const trackedId =
    mediaAssetId ?? (data.imageUrl ? (await mediaRepository.findByUrl(data.imageUrl))?.id : null);
  if (trackedId && data.imageUrl) {
    await mediaRepository.trackUsage(trackedId, "TESTIMONIAL", testimonial.id, "imageUrl");
  }

  await syncEntityTranslationsFromForm(formData, "Testimonial", testimonial.id, enabledLocales);

  await searchIndexer.indexTestimonial({
    id: testimonial.id,
    name: testimonial.name,
    isPublished: testimonial.isPublished,
  });
  revalidateSearch();
  revalidateTestimonialPaths();
  return testimonial;
}

export async function deleteTestimonial(id: string) {
  await requireAdmin();
  await prisma.testimonial.delete({ where: { id } });
  await searchIndexer.remove("TESTIMONIAL", id);
  revalidateSearch();
  revalidateTestimonialPaths();
}

export async function reorderTestimonials(ids: string[]) {
  await requireAdmin();
  await prisma.$transaction(
    ids.map((id, index) => prisma.testimonial.update({ where: { id }, data: { sortOrder: index } }))
  );
  revalidateTestimonialPaths();
}

export async function toggleTestimonialPublished(id: string, isPublished: boolean) {
  await requireAdmin();
  const testimonial = await prisma.testimonial.update({
    where: { id },
    data: { isPublished },
  });
  await searchIndexer.indexTestimonial({
    id: testimonial.id,
    name: testimonial.name,
    isPublished: testimonial.isPublished,
  });
  revalidateSearch();
  revalidateTestimonialPaths();
}

export async function fetchTestimonialCollectionWithItems(collectionId: string) {
  await requireAdmin();
  return prisma.testimonialCollection.findUnique({
    where: { id: collectionId },
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
        include: { testimonial: true },
      },
    },
  });
}

export async function fetchTestimonialCollectionsForBuilder() {
  await requireAdmin();
  const collection = prisma.testimonialCollection;
  if (!collection?.findMany) return [];

  try {
    const rows = await collection.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        slug: true,
        isPublished: true,
        _count: { select: { items: true } },
      },
    });
    const translations = await loadTranslationsMap(
      "TestimonialCollection",
      rows.map((row) => row.id)
    );
    return rows.map((row) => {
      const rowTranslations = translations.get(row.id) ?? [];
      const ctx = { translations: rowTranslations };
      return {
        slug: row.slug,
        isPublished: row.isPublished,
        itemCount: row._count.items,
        titleEn: localizedFieldValue(rowTranslations, "title"),
        titleAr: resolveTranslation("title", "ar", ctx),
      };
    });
  } catch {
    return [];
  }
}

export async function fetchTestimonialsForBuilder() {
  await requireAdmin();
  try {
    const rows = await prisma.testimonial.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        location: true,
        rating: true,
        isPublished: true,
      },
    });
    return rows;
  } catch {
    return [];
  }
}
