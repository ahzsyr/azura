import type { Product, ProductMediaFile } from "@/features/products/types";
import { normalizeDetailedDescriptionInput } from "./product-detailed-description";
import { syncConditionOptionsFromVariations } from "./product-variation-admin";

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeDiscount(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeOldPrice(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export type ManagedProduct = Product & { slug: string };

export function getEmptyManagedProduct(slug = "new-product"): ManagedProduct {
  const normalized = slugify(slug) || "new-product";
  return {
    slug: normalized,
    id: normalized,
    productTitle: "New Product",
    name: "New Product",
    title: "New Product",
    title_extended: null,
    short_description: "",
    description: "",
    detailed_description: [{ heading: "", text: "" }],
    price: { value: 0, currency: "USD", discount: null },
    old_price: null,
    availability: "InStock",
    stock_status: "in_stock",
    mpn: "",
    manufacturer_part_number: "",
    ean: "",
    brand: "",
    warranty: "",
    category: "Electronics",
    categories: ["Electronics"],
    condition_options: ["new"],
    plug_options: ["EU"],
    specifications: [],
    variations: [],
    media: {
      images: [],
      thumbnails: [],
      videos: [],
      files: [],
      "3d_model": false,
    },
    documents: [],
    reviews: {
      rating: 0,
      count: 0,
      source: "",
      distribution: { excellent: 0, great: 0, average: 0, poor: 0, bad: 0 },
      breakdown: { "5_star": 0, "4_star": 0, "3_star": 0, "2_star": 0, "1_star": 0 },
      comments: [],
    },
    shipping: { options: [] },
    delivery_options: [],
    bought_together: [],
    certifications: [],
  };
}

/** Canonical shape before save or JSON export (admin + API). */
export function normalizeProductForSave(product: Product & { slug?: string }): ManagedProduct {
  const slug = slugify(product.slug || product.productTitle || product.id) || "new-product";
  const title = product.productTitle?.trim() || product.name?.trim() || product.title?.trim() || "Untitled Product";
  const synced = syncConditionOptionsFromVariations(product);
  return {
    ...synced,
    slug,
    id: (product.id != null ? String(product.id).trim() : "") || slug,
    productTitle: title,
    name: title,
    title: title,
    detailed_description: normalizeDetailedDescriptionInput(product.detailed_description),
    price: {
      value: Number(product.price?.value ?? 0),
      currency: product.price?.currency ?? "USD",
      discount: normalizeDiscount(product.price?.discount),
    },
    old_price: normalizeOldPrice(product.old_price),
    media: {
      images: product.media?.images ?? [],
      thumbnails: product.media?.thumbnails ?? [],
      videos: product.media?.videos ?? [],
      files: (product.media?.files ?? []).map((f) => ({ ...(f as ProductMediaFile) })),
      "3d_model":
        Boolean(product.media?.["3d_model"]) ||
        Boolean(
          (product.media?.files ?? []).some(
            (f) =>
              f &&
              typeof f === "object" &&
              (f as ProductMediaFile).type === "3d_model" &&
              String((f as ProductMediaFile).url || "").trim(),
          ),
        ),
    },
    reviews: {
      rating: Number(product.reviews?.rating ?? 0),
      count: Number(product.reviews?.count ?? 0),
      source: product.reviews?.source ?? "",
      distribution: {
        excellent: Number(product.reviews?.distribution?.excellent ?? 0),
        great: Number(product.reviews?.distribution?.great ?? 0),
        average: Number(product.reviews?.distribution?.average ?? 0),
        poor: Number(product.reviews?.distribution?.poor ?? 0),
        bad: Number(product.reviews?.distribution?.bad ?? 0),
      },
      breakdown: {
        "5_star": Number(product.reviews?.breakdown?.["5_star"] ?? 0),
        "4_star": Number(product.reviews?.breakdown?.["4_star"] ?? 0),
        "3_star": Number(product.reviews?.breakdown?.["3_star"] ?? 0),
        "2_star": Number(product.reviews?.breakdown?.["2_star"] ?? 0),
        "1_star": Number(product.reviews?.breakdown?.["1_star"] ?? 0),
      },
      comments: product.reviews?.comments ?? [],
    },
  };
}
