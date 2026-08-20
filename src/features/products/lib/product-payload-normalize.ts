import type { Product } from "@/features/products/types";
import { normalizeMatchingRulesList } from "@/features/categories/matching/fields-product";
import {
  normalizeDetailedDescriptionInput,
  normalizeProductModel3d,
} from "./product-detailed-description";
import { applyUnifiImportLayout } from "./unifi-import-meta";

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

  const extra = raw as Product & Record<string, unknown>;

  const matchingFromCamel = normalizeMatchingRulesList(raw.matchingRules);
  const matchingFromSnake = normalizeMatchingRulesList(extra.matching_rules);
  const matchingRules =
    matchingFromCamel.length > 0 ? matchingFromCamel : matchingFromSnake;

  const mainCategorySnake = extra.main_category;
  const mainCategory =
    typeof raw.mainCategory === "string" && raw.mainCategory.trim()
      ? raw.mainCategory.trim()
      : typeof mainCategorySnake === "string" && mainCategorySnake.trim()
        ? mainCategorySnake.trim()
        : undefined;

  const brandPathsRaw = Array.isArray(raw.brandPaths)
    ? raw.brandPaths
    : Array.isArray(extra.brand_paths)
      ? extra.brand_paths
      : undefined;
  const brandPaths = Array.isArray(brandPathsRaw)
    ? brandPathsRaw.filter((p): p is string => typeof p === "string" && Boolean(p.trim()))
    : undefined;

  const categoryPathsRaw = Array.isArray(raw.categoryPaths)
    ? raw.categoryPaths
    : Array.isArray(extra.category_paths)
      ? extra.category_paths
      : undefined;
  const categoryPaths = Array.isArray(categoryPathsRaw)
    ? categoryPathsRaw.filter((p): p is string => typeof p === "string" && Boolean(p.trim()))
    : undefined;

  const brandCategories = Array.isArray(raw.brandCategories)
    ? raw.brandCategories.filter((p): p is string => typeof p === "string" && Boolean(p.trim()))
    : undefined;

  const storeCategories = Array.isArray(raw.storeCategories)
    ? raw.storeCategories.filter((p): p is string => typeof p === "string" && Boolean(p.trim()))
    : undefined;

  const model3d = normalizeProductModel3d(raw.media?.["3d_model"]);
  const withLayout = applyUnifiImportLayout({
    ...raw,
    id,
    productTitle: title,
    name: title,
    title: title,
    categories: Array.isArray(raw.categories) ? raw.categories : [],
    categoryIds: Array.isArray(extra.categoryIds)
      ? (extra.categoryIds as unknown[]).filter(
          (cid): cid is string => typeof cid === "string" && Boolean(cid.trim()),
        )
      : [],
    matchingRules: matchingRules.length > 0 ? matchingRules : undefined,
    ...(mainCategory ? { mainCategory } : {}),
    ...(brandPaths?.length ? { brandPaths } : {}),
    ...(categoryPaths?.length ? { categoryPaths } : {}),
    ...(brandCategories?.length ? { brandCategories } : {}),
    ...(storeCategories?.length ? { storeCategories } : {}),
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
      ...(model3d !== undefined ? { "3d_model": model3d } : {}),
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
  });

  return withLayout;
}
