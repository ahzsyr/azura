import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TestimonialCollectionEditPage } from "@/features/testimonials/admin/testimonial-collection-edit-page";
import type { TestimonialAdmin } from "@/features/testimonials/types";

type Props = { params: Promise<{ id: string }> };

export default async function EditTestimonialCollectionPage({ params }: Props) {
  const { id } = await params;

  let collection = null;
  let allTestimonials: TestimonialAdmin[] = [];

  try {
    const [coll, rows] = await Promise.all([
      prisma.testimonialCollection.findUnique({
        where: { id },
        include: {
          items: {
            orderBy: { sortOrder: "asc" },
            include: { testimonial: true },
          },
        },
      }),
      prisma.testimonial.findMany({ orderBy: { sortOrder: "asc" } }),
    ]);

    collection = coll;
    allTestimonials = rows.map((row) => ({
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

  if (!collection) notFound();

  return <TestimonialCollectionEditPage collection={collection} allTestimonials={allTestimonials} />;
}
