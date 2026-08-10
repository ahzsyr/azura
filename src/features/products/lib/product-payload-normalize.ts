import type { Product } from "@/features/products/types";
import { normalizeMatchingRulesList } from "@/features/categories/matching/fields-product";
import { normalizeDetailedDescriptionInput } from "./product-detailed-description";

/**
 * Canonical product shape for API save / import (matches `POST /api/products` behavior).
 */
export function normalizeProductPayload(raw: Product, slug: string): Product {
  const title =
    raw.productTitle || raw.name || raw.title || slug;
  const id =
    raw.id != null && String(raw.id).trim() !== ""
      ? String(raw.id).trim()
      : slug;

  const matchingFromCamel = normalizeMatchingRulesList(raw.matchingRules);
  const matchingFromSnake = normalizeMatchingRulesList(
    (raw as { matching_rules?: unknown }).matching_rules,
  );
  const matchingRules =
    matchingFromCamel.length > 0 ? matchingFromCamel : matchingFromSnake;

  return {
    ...raw,
    id,
    productTitle: title,
    name: title,
    title: title,
    categories: Array.isArray(raw.categories) ? raw.categories : [],
    categoryIds: Array.isArray((raw as { categoryIds?: string[] }).categoryIds)
      ? (raw as { categoryIds: string[] }).categoryIds.filter((id) => typeof id === "string" && id.trim())
      : [],
    matchingRules: matchingRules.length > 0 ? matchingRules : undefined,
    detailed_description: normalizeDetailedDescriptionInput(raw.detailed_description),
    price: {
      value: Number(raw.price?.value ?? 0),
      currency: raw.price?.currency ?? "USD",
      discount: raw.price?.discount ?? null,
    },
    media: {
      images: raw.media?.images ?? [],
      thumbnails: raw.media?.thumbnails ?? [],
      videos: raw.media?.videos ?? [],
      files: raw.media?.files ?? [],
      "3d_model": Boolean(raw.media?.["3d_model"]),
    },
    reviews: {
      rating: Number(raw.reviews?.rating ?? 0),
      count: Number(raw.reviews?.count ?? 0),
      source: raw.reviews?.source ?? "",
      distribution: raw.reviews?.distribution ?? {
        excellent: 0,
        great: 0,
        average: 0,
        poor: 0,
        bad: 0,
      },
      breakdown: raw.reviews?.breakdown ?? {
        "5_star": 0,
        "4_star": 0,
        "3_star": 0,
        "2_star": 0,
        "1_star": 0,
      },
      comments: raw.reviews?.comments ?? [],
    },
  };
}
