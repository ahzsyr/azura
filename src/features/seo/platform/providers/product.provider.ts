import "server-only";

import { productsDataService } from "@/features/products/products-data.service";
import { detailedDescriptionPlainText } from "@/features/products/lib/product-detailed-description";
import { resolveProductPrimaryImageUrl } from "@/features/products/lib/product-primary-image";
import { normalizeRemoteImageUrl } from "@/lib/config/next-image";
import type { SeoEntityProvider } from "../types/entity-provider";
import type { SeoEntityDescriptor } from "../types/entity-descriptor";
import type { BulkEntityFilter } from "../types/autofill";
import { emptyDraft } from "../layers/content/snapshot-builder";

const BILINGUAL_DESCRIPTOR_COUNT = 2;

function normalizeProductImageUrl(url: string | undefined): string {
  if (!url?.trim()) return "";
  return normalizeRemoteImageUrl(url.trim()) ?? url.trim();
}

function localePrefix(descriptor: SeoEntityDescriptor): string {
  return descriptor.locale === "ar" ? "ar" : "en";
}

export const productEntityProvider: SeoEntityProvider = {
  kind: "product",
  async buildSnapshot(descriptor) {
    const prefix = localePrefix(descriptor);
    const loaded = await productsDataService.getProduct(prefix, descriptor.id);
    if (!loaded) return emptyDraft(descriptor.id);

    const p = loaded.product;
    const title = p.title_extended || p.productTitle || p.name || descriptor.id;
    const description =
      p.description || p.short_description || detailedDescriptionPlainText(p.detailed_description ?? []);

    const primaryImage = resolveProductPrimaryImageUrl(p);

    const images =
      p.media?.images
        ?.map((img) => ({
          src: normalizeProductImageUrl(img.url),
          alt: img.alt ?? title,
        }))
        .filter((img) => img.src.length > 0) ?? [];

    const orderedImages =
      primaryImage && !images.some((img) => img.src === primaryImage)
        ? [{ src: primaryImage, alt: title }, ...images]
        : primaryImage
          ? [
              { src: primaryImage, alt: title },
              ...images.filter((img) => img.src !== primaryImage),
            ]
          : images;

    const faq =
      p.faq?.map((item) => ({
        question: item.questionEn ?? item.question ?? "",
        answer: item.answerEn ?? item.answer ?? "",
      })) ?? [];

    return {
      title,
      headings: title ? [{ level: 1, text: title }] : [],
      paragraphs: description ? [description] : [],
      tables: [],
      images: orderedImages,
      links: { internal: [], external: [] },
      faq: faq.filter((f) => f.question.trim()),
      products: [],
      language: descriptor.locale,
      metadata: Object.freeze({
        brand: p.brand,
        category: p.category,
        categories: p.categories,
        price: p.price,
        sku: p.mpn ?? p.ean,
        featuredImage: primaryImage,
        representativeImage: primaryImage,
      }),
    };
  },
  async *listEntities(filter: BulkEntityFilter = {}) {
    const prefix = filter.localeCodes?.[0] === "ar" ? "ar" : "en";
    if (filter.selectedIds?.length) {
      for (const id of filter.selectedIds) {
        yield Object.freeze({ kind: "product" as const, id, locale: "en", routingKey: `product:${id}` });
        yield Object.freeze({ kind: "product" as const, id, locale: "ar", routingKey: `product:${id}` });
      }
      return;
    }
    const slugs = await productsDataService.getProductSlugs(prefix);
    for (const slug of slugs) {
      if (filter.search && !slug.toLowerCase().includes(filter.search.toLowerCase())) continue;
      yield Object.freeze({ kind: "product" as const, id: slug, locale: "en", routingKey: `product:${slug}` });
      yield Object.freeze({ kind: "product" as const, id: slug, locale: "ar", routingKey: `product:${slug}` });
    }
  },
  async countEntities(filter = {}) {
    const prefix = filter.localeCodes?.[0] === "ar" ? "ar" : "en";
    if (filter.selectedIds?.length) return filter.selectedIds.length * BILINGUAL_DESCRIPTOR_COUNT;
    const slugs = await productsDataService.getProductSlugs(prefix);
    if (!filter.search) return slugs.length * BILINGUAL_DESCRIPTOR_COUNT;
    const q = filter.search.toLowerCase();
    return slugs.filter((s) => s.toLowerCase().includes(q)).length * BILINGUAL_DESCRIPTOR_COUNT;
  },
  displayName(descriptor) {
    return `Product ${descriptor.id}`;
  },
  routing(descriptor) {
    return { publicPath: `/products/${descriptor.id}` };
  },
};
