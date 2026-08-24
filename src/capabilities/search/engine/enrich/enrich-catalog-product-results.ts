import "server-only";

import { excerpt } from "@/capabilities/search/core/text";
import type { SearchCardPayload } from "@/capabilities/search/types/search-card";
import type { SearchResult } from "@/capabilities/search/engine/types";
import { readSiteSettings } from "@/features/catalog/site-settings.service";
import { productsDataService } from "@/features/products/products-data.service";
import { priceBoundsFromProduct } from "@/features/products/listing/record-from-product";
import {
  resolveProductSearchDisplay,
  type ProductSearchCardDisplay,
} from "@/features/products/lib/product-search-display";
import type { Product } from "@/features/products/types";
import { normalizeRemoteImageUrl } from "@/lib/config/next-image";
import { resolveProductPrimaryImageUrl } from "@/features/products/lib/product-primary-image";

function slugFromUrlPath(urlPath: string): string | null {
  const match = urlPath.match(/\/products\/([^/?#]+)/i);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function resolveSlug(result: SearchResult): string | null {
  const fromCard = result.card?.slug?.trim();
  if (fromCard) return fromCard;
  return slugFromUrlPath(result.urlPath);
}

function buildProductSearchCard(
  product: Product,
  slug: string,
  cardDisplay: ProductSearchCardDisplay,
): SearchCardPayload {
  const { min: priceMin, max: priceMax } = priceBoundsFromProduct(product);
  const ratingRaw = Number(product.reviews?.rating ?? 0);
  const rating = Number.isFinite(ratingRaw) ? ratingRaw : 0;
  const countRaw = Number(product.reviews?.count ?? 0);
  const reviewsCount = Number.isFinite(countRaw) ? Math.max(0, Math.floor(countRaw)) : 0;
  const primaryImage = normalizeRemoteImageUrl(resolveProductPrimaryImageUrl(product));

  return {
    slug,
    ...(cardDisplay.showImage && primaryImage ? { imageUrl: primaryImage } : {}),
    ...(cardDisplay.showBrand && product.brand ? { brand: product.brand } : {}),
    inStock:
      product.stock_status !== "out_of_stock" && product.availability !== "OutOfStock",
    ...(cardDisplay.showPrice
      ? {
          price: {
            min: priceMin,
            max: priceMax !== priceMin ? priceMax : undefined,
            currency: product.price?.currency,
          },
        }
      : {}),
    ...(cardDisplay.showRating && rating > 0
      ? { rating: { value: rating, count: reviewsCount } }
      : {}),
  };
}

function applyDisplayToResult(
  result: SearchResult,
  cardDisplay: ProductSearchCardDisplay,
  displaySnippet: string,
  card: SearchCardPayload,
  query: string,
): SearchResult {
  const snippet =
    cardDisplay.showSnippet && displaySnippet.trim()
      ? excerpt(displaySnippet, query)
      : "";

  return {
    ...result,
    snippet,
    card,
    cardDisplay,
  };
}

/** Apply live product page visibility to catalog product search hits. */
export async function enrichCatalogProductSearchResults(
  results: SearchResult[],
  localePrefix: string,
  query: string,
): Promise<SearchResult[]> {
  const hasProducts = results.some((r) => r.entityType === "CATALOG_PRODUCT");
  if (!hasProducts) return results;

  const site = await readSiteSettings(localePrefix);

  return Promise.all(
    results.map(async (result) => {
      if (result.entityType !== "CATALOG_PRODUCT") return result;

      const slug = resolveSlug(result);
      if (!slug) return result;

      const loaded = await productsDataService.getProduct(localePrefix, slug);
      if (!loaded?.product) {
        const { searchCardDisplay, displaySnippet } = resolveProductSearchDisplay(site, {
          id: slug,
          productTitle: result.title,
          price: { value: 0, currency: "USD" },
          media: { images: [] },
          reviews: { rating: 0, count: 0 },
        });
        const card = result.card
          ? {
              ...result.card,
              ...(searchCardDisplay.showBrand ? {} : { brand: undefined }),
              ...(searchCardDisplay.showPrice ? {} : { price: undefined }),
              ...(searchCardDisplay.showRating ? {} : { rating: undefined }),
              ...(searchCardDisplay.showImage ? {} : { imageUrl: undefined }),
            }
          : { slug };
        return applyDisplayToResult(result, searchCardDisplay, displaySnippet, card, query);
      }

      const { displaySnippet, searchCardDisplay } = resolveProductSearchDisplay(
        site,
        loaded.product,
      );
      const card = buildProductSearchCard(loaded.product, slug, searchCardDisplay);
      return applyDisplayToResult(
        result,
        searchCardDisplay,
        displaySnippet,
        card,
        query,
      );
    }),
  );
}
