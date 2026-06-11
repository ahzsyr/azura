import type { TestimonialPublic } from "./types";
import {
  getTestimonialsCached,
  getTestimonialCollectionBySlugCached,
  getTestimonialsByIdsCached,
} from "@/services/data-loaders";

export type TestimonialsBlockResolveInput = {
  source?: string;
  testimonialCollectionSlug?: string;
  testimonialIds?: string[];
  limit?: number;
};

const testimonialSelect = {
  id: true,
  name: true,
  location: true,
  rating: true,
  contentEn: true,
  contentAr: true,
  imageUrl: true,
  videoUrl: true,
} as const;

function applyLimit(items: TestimonialPublic[], limit?: number): TestimonialPublic[] {
  const n = Number(limit ?? 0);
  if (n > 0) return items.slice(0, n);
  return items;
}

export async function resolveTestimonialsForBlock(
  props: TestimonialsBlockResolveInput
): Promise<TestimonialPublic[]> {
  const source = props.source ?? "all";
  const limit = props.limit;

  if (source === "manual") {
    const ids = props.testimonialIds ?? [];
    if (ids.length === 0) return [];
    const items = await getTestimonialsByIdsCached(ids);
    return applyLimit(items, limit);
  }

  if (source === "collection") {
    const slug = (props.testimonialCollectionSlug ?? "").trim();
    if (!slug) return [];
    const collection = await getTestimonialCollectionBySlugCached(slug);
    if (!collection) return [];
    return applyLimit(collection.testimonials, limit);
  }

  return getTestimonialsCached(limit && limit > 0 ? limit : undefined);
}
