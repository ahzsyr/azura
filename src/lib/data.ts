import type { CompanyInfoView } from "@/features/translation/admin-entity-helpers";
import { prisma } from "@/lib/prisma";
import {
  getCompanyInfoCached,
  getFaqSetsCached,
  getFaqSetBySlugCached,
  getGalleriesCached,
  getGalleryBySlugCached,
  getGalleryHomePreviewCached,
  getHotelsCached,
  getPackageBySlugCached,
  getPublishedPackagesCached,
  getCategoriesCached,
  getServicesCached,
  getTestimonialsCached,
  getTestimonialCollectionBySlugCached,
  getTestimonialsByIdsCached,
} from "@/services/data-loaders";
import { storageLoaders } from "@/features/storage/loaders";
import type { MarketingHomeBatch } from "@/features/storage/loaders";

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export async function getCompanyInfo(): Promise<CompanyInfoView | null> {
  return safe(() => getCompanyInfoCached(), null);
}

export async function getFeaturedPackages(limit = 3) {
  return safe(
    async () => {
      const all = await getPublishedPackagesCached();
      return all.filter((p) => p.isFeatured).slice(0, limit);
    },
    []
  );
}

export async function getPublishedPackages(categorySlug?: string) {
  return safe(() => getPublishedPackagesCached(categorySlug), []);
}

export async function getPackageBySlug(slug: string) {
  return safe(() => getPackageBySlugCached(slug), null);
}

export async function getCategories() {
  return safe(() => getCategoriesCached(), []);
}

export async function getServices() {
  return safe(() => getServicesCached(), []);
}

export async function getHotels() {
  return safe(() => getHotelsCached(), []);
}

export async function getGalleries() {
  return safe(() => getGalleriesCached(), []);
}

export async function getGalleryBySlug(slug: string) {
  return safe(() => getGalleryBySlugCached(slug), null);
}

export async function getGalleryHomePreview(limit = 8) {
  return safe(() => getGalleryHomePreviewCached(limit), []);
}

export async function getTestimonials(limit?: number) {
  return safe(() => getTestimonialsCached(limit), []);
}

export async function getTestimonialCollectionBySlug(slug: string) {
  return safe(() => getTestimonialCollectionBySlugCached(slug), null);
}

export async function getTestimonialsByIds(ids: string[]) {
  return safe(() => getTestimonialsByIdsCached(ids), []);
}

export { resolveTestimonialsForBlock } from "@/features/testimonials/resolve-testimonials-for-block";

export async function getFaqSets() {
  return safe(() => getFaqSetsCached(), []);
}

export async function getFaqSetBySlug(slug: string) {
  return safe(() => getFaqSetBySlugCached(slug), null);
}

/** Batched homepage loader — one parallel fetch instead of five separate calls. */
export async function getMarketingHomeBatch(): Promise<MarketingHomeBatch> {
  return safe(() => storageLoaders.marketingHome(), {
    company: null,
    packages: [],
    services: [],
    testimonials: [],
    gallery: [],
  });
}

export async function getDashboardStats() {
  return safe(
    async () => {
      const [packages, inquiries, testimonials, gallery] = await Promise.all([
        prisma.contentItem.count({
          where: { contentType: { slug: "catalog-items" }, deletedAt: null },
        }),
        prisma.inquiry.count({ where: { status: "NEW" } }),
        prisma.testimonial.count(),
        prisma.gallery.count(),
      ]);
      return { packages, newInquiries: inquiries, testimonials, gallery };
    },
    { packages: 0, newInquiries: 0, testimonials: 0, gallery: 0 }
  );
}
