import { prisma } from "@/lib/prisma";
import { TestimonialsHubPage } from "@/features/testimonials/admin/testimonials-hub-page";
import type { TestimonialCollectionAdmin, TestimonialAdmin } from "@/features/testimonials/types";

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

    collections = collectionRows.map((row) => ({
      id: row.id,
      slug: row.slug,
      titleEn: row.titleEn,
      titleAr: row.titleAr,
      excerptEn: row.excerptEn,
      excerptAr: row.excerptAr,
      sortOrder: row.sortOrder,
      isPublished: row.isPublished,
      itemCount: row._count.items,
    }));

    testimonials = testimonialRows.map((row) => ({
      id: row.id,
      name: row.name,
      location: row.location,
      rating: row.rating,
      contentEn: row.contentEn,
      contentAr: row.contentAr,
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
