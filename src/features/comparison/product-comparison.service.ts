import "server-only";

import { productsDataService } from "@/features/products/products-data.service";
import { getProductCatalogIndex } from "@/features/products/fs/product-catalog-index";
import type { CompareItemSnapshot } from "@/features/comparison/types";
import type { Product } from "@/features/products/types";
import { buildProductSpecCompareTable } from "@/features/comparison/product-comparison-engine";
import type { CompareRowEntry, CompareViewMode } from "@/features/comparison/types";
import { PRODUCT_COMPARE_SLUG } from "@/features/comparison/product-comparison.constants";

export { PRODUCT_COMPARE_SLUG, PRODUCT_COMPARE_MAX } from "@/features/comparison/product-comparison.constants";

export type ProductCompareBundle = {
  items: CompareItemSnapshot[];
  specEntries: CompareRowEntry[];
};

export async function fetchProductCompareBundle(
  productIds: string[],
  localePrefix: string,
  mode: CompareViewMode
): Promise<ProductCompareBundle> {
  if (productIds.length === 0) {
    return { items: [], specEntries: [] };
  }

  const index = await getProductCatalogIndex(localePrefix);
  const slugById = new Map<string, string>();
  for (const [slug, entry] of index) {
    if (entry.ruleMeta.id) slugById.set(entry.ruleMeta.id, slug);
  }

  const products: { product: Product; slug: string }[] = [];

  for (const id of productIds) {
    const slug = slugById.get(id);
    if (!slug) continue;
    const loaded = await productsDataService.getProduct(localePrefix, slug);
    if (!loaded?.product) continue;
    products.push({ product: loaded.product, slug });
  }

  const order = new Map(productIds.map((id, i) => [id, i]));
  products.sort(
    (a, b) =>
      (order.get(String(a.product.id)) ?? 0) - (order.get(String(b.product.id)) ?? 0)
  );

  const items: CompareItemSnapshot[] = products.map(({ product, slug }) => {
    const images = product.media?.images ?? [];
    const primary =
      images.find((img) => img.type === "main")?.url || images[0]?.url || null;
    const title = product.productTitle || product.name || product.title || slug;

    return {
      id: String(product.id ?? "").trim(),
      contentTypeSlug: PRODUCT_COMPARE_SLUG,
      slug,
      title,
      titleEn: title,
      titleAr: title,
      href: `/${localePrefix}/products/${slug}`,
      imageUrl: primary,
      attributes: {
        brand: product.brand,
        mpn: product.mpn,
        price: product.price?.value,
        currency: product.price?.currency,
      },
    };
  });

  const specEntries = buildProductSpecCompareTable(
    products.map((p) => p.product),
    mode
  );

  return { items, specEntries };
}

export async function searchProductCompareCandidates(
  localePrefix: string,
  query: string,
  limit = 12,
  filters?: { collection?: string; tags?: string[] }
): Promise<CompareItemSnapshot[]> {
  const q = query.trim().toLowerCase();
  const browseAll = !q || q === "*";
  if (!browseAll && q.length < 2 && !filters?.collection && !filters?.tags?.length) {
    return [];
  }

  const index = await getProductCatalogIndex(localePrefix);
  const out: CompareItemSnapshot[] = [];

  for (const [slug, entry] of index) {
    if (out.length >= limit) break;
    const id = entry.ruleMeta.id;
    if (!id) continue;

    if (filters?.collection) {
      const col = filters.collection;
      const tags = entry.ruleMeta.tags ?? [];
      const cats = entry.ruleMeta.categories ?? [];
      if (!tags.includes(col) && !cats.includes(col) && slug !== col) continue;
    }
    if (filters?.tags?.length) {
      const tags = entry.ruleMeta.tags ?? [];
      if (!filters.tags.some((t) => tags.includes(t))) continue;
    }

    if (!browseAll) {
      const title = entry.ruleMeta.name.toLowerCase();
      const brand = (entry.ruleMeta.brand ?? "").toLowerCase();
      if (!title.includes(q) && !brand.includes(q) && !slug.toLowerCase().includes(q)) continue;
    }

    const loaded = await productsDataService.getProduct(localePrefix, slug);
    if (!loaded?.product) continue;
    const product = loaded.product;

    const images = product.media?.images ?? [];
    const primary =
      images.find((img) => img.type === "main")?.url || images[0]?.url || null;

    const title = product.productTitle || product.name || product.title || slug;

    out.push({
      id,
      contentTypeSlug: PRODUCT_COMPARE_SLUG,
      slug,
      title,
      titleEn: title,
      titleAr: title,
      href: `/${localePrefix}/products/${slug}`,
      imageUrl: primary,
      attributes: { brand: product.brand, price: product.price?.value },
    });
  }

  return out;
}
