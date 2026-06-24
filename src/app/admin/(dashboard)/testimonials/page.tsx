import { prisma } from "@/lib/prisma";
import { TestimonialsHubPage } from "@/features/testimonials/admin/testimonials-hub-page";
import type { TestimonialCollectionAdmin, TestimonialAdmin } from "@/features/testimonials/types";
import { loadAdminRowsWithLocalizedFields } from "@/features/translation/admin-entity-helpers";
import { readAdminLocaleField } from "@/features/translation/admin-localized-view";

export default async function AdminTestimonialsPage() {
  let collections: TestimonialCollectionAdmin[] = [];
  let testimonials: TestimonialAdmin[] = [];

  try {
    const [collectionRows, testimonialRows] = await Promise.all([
      prisma.testimonialCollection.findMany({
        orderBy: { sortOrder: "asc" },
        include: { _count: { select: { items: true } } },
      }),
      prisma.testimonial.findMany({ orderBy: { sortOrder: "asc" } }),
    ]);

    const [collectionsWithTranslations, testimonialsWithTranslations] = await Promise.all([
      loadAdminRowsWithLocalizedFields("TestimonialCollection", collectionRows, [
        "title",
        "subtitle",
      ]),
      loadAdminRowsWithLocalizedFields("Testimonial", testimonialRows, ["quote"]),
    ]);

    collections = collectionsWithTranslations.map((row) => ({
      id: row.id,
      slug: row.slug,
      displayTitle: row.displayTitle,
      titleEn: row.displayTitle,
      titleAr: readAdminLocaleField(row, "title", "ar"),
      excerptEn: readAdminLocaleField(row, "subtitle", "en") || null,
      excerptAr: readAdminLocaleField(row, "subtitle", "ar") || null,
      sortOrder: row.sortOrder,
      isPublished: row.isPublished,
      itemCount: row._count.items,
    }));

    testimonials = testimonialsWithTranslations.map((row) => ({
      id: row.id,
      name: row.name,
      location: row.location,
      rating: row.rating,
      contentEn: row.displayTitle,
      contentAr: readAdminLocaleField(row, "quote", "ar"),
      videoUrl: row.videoUrl,
      imageUrl: row.imageUrl,
      isPublished: row.isPublished,
      sortOrder: row.sortOrder,
    }));
  } catch {
    // DB not connected
  }

  return <TestimonialsHubPage collections={collections} testimonials={testimonials} />;
}
