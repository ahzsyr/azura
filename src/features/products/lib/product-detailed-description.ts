import type {
  Product,
  ProductCurrency,
  ProductDetailedSection,
  ProductMedia,
  ProductMediaImage,
  ProductPrice,
  ProductReviewComment,
  ProductReviews,
} from "@/features/products/types";

const PRODUCT_CURRENCIES = new Set<ProductCurrency>(["USD", "EUR", "AED", "GBP", "JPY"]);

/**
 * Coerce `detailed_description` from legacy string or mixed JSON into `{ heading, text }[]`.
 */
export function normalizeDetailedDescriptionInput(input: unknown): ProductDetailedSection[] {
  if (Array.isArray(input)) {
    return input
      .filter((item) => item !== null && item !== undefined)
      .map((item) => {
        if (typeof item !== "object") return { heading: "", text: "" };
        const o = item as Record<string, unknown>;
        return {
          heading: typeof o.heading === "string" ? o.heading : String(o.heading ?? ""),
          text: typeof o.text === "string" ? o.text : String(o.text ?? ""),
        };
      });
  }
  if (typeof input === "string" && input.trim()) {
    return [{ heading: "", text: input.trim() }];
  }
  return [];
}

export function detailedDescriptionPlainText(sections: ProductDetailedSection[]): string {
  return sections
    .map((s) => {
      const h = (s.heading || "").trim();
      const t = (s.text || "").trim();
      if (h && t) return `${h}\n${t}`;
      return h || t;
    })
    .filter(Boolean)
    .join("\n\n");
}

const defaultReviewDistribution = {
  excellent: 0,
  great: 0,
  average: 0,
  poor: 0,
  bad: 0,
} as const;

const defaultReviewBreakdown = {
  "5_star": 0,
  "4_star": 0,
  "3_star": 0,
  "2_star": 0,
  "1_star": 0,
} as const;

/**
 * Coerce `reviews` after JSON parse so null/missing `rating` or `count` never breaks `.toFixed` / schema.
 */
export function normalizeProductReviewsInput(raw: unknown): ProductReviews {
  if (!raw || typeof raw !== "object") {
    return {
      rating: 0,
      count: 0,
      source: "",
      distribution: { ...defaultReviewDistribution },
      breakdown: { ...defaultReviewBreakdown },
      comments: [],
    };
  }

  const r = raw as Record<string, unknown>;
  const ratingNum = Number(r.rating);
  const countNum = Number(r.count);
  const distObj =
    r.distribution && typeof r.distribution === "object"
      ? (r.distribution as Record<string, unknown>)
      : {};
  const breakdownObj =
    r.breakdown && typeof r.breakdown === "object" ? (r.breakdown as Record<string, unknown>) : {};

  const commentsRaw = r.comments;
  const comments = Array.isArray(commentsRaw)
    ? (commentsRaw.filter((c) => c !== null && c !== undefined) as ProductReviewComment[])
    : [];

  return {
    rating: Number.isFinite(ratingNum) ? ratingNum : 0,
    count: Number.isFinite(countNum) ? Math.max(0, Math.floor(countNum)) : 0,
    source: typeof r.source === "string" ? r.source : String(r.source ?? ""),
    distribution: {
      excellent: Number(distObj.excellent ?? 0) || 0,
      great: Number(distObj.great ?? 0) || 0,
      average: Number(distObj.average ?? 0) || 0,
      poor: Number(distObj.poor ?? 0) || 0,
      bad: Number(distObj.bad ?? 0) || 0,
    },
    breakdown: {
      "5_star": Number(breakdownObj["5_star"] ?? 0) || 0,
      "4_star": Number(breakdownObj["4_star"] ?? 0) || 0,
      "3_star": Number(breakdownObj["3_star"] ?? 0) || 0,
      "2_star": Number(breakdownObj["2_star"] ?? 0) || 0,
      "1_star": Number(breakdownObj["1_star"] ?? 0) || 0,
    },
    comments,
  };
}

function normalizeProductPrice(product: Product): ProductPrice {
  const p = product.price as unknown;
  if (!p || typeof p !== "object") {
    return { value: 0, currency: "USD", discount: null };
  }
  const o = p as Record<string, unknown>;
  const v = Number(o.value);
  const c = o.currency;
  const currency: ProductCurrency =
    typeof c === "string" && PRODUCT_CURRENCIES.has(c as ProductCurrency) ? (c as ProductCurrency) : "USD";
  const discount = o.discount;
  return {
    value: Number.isFinite(v) ? v : 0,
    currency,
    discount: typeof discount === "number" || discount === null ? (discount as number | null) : null,
  };
}

function normalizeProductMedia(product: Product): ProductMedia {
  const m = product.media as unknown;
  if (!m || typeof m !== "object") {
    return { images: [] };
  }
  const mo = m as Record<string, unknown>;
  const imagesRaw = mo.images;
  const images: ProductMediaImage[] = Array.isArray(imagesRaw)
    ? imagesRaw
        .filter((i) => i !== null && i !== undefined && typeof i === "object")
        .map((i) => {
          const im = i as Record<string, unknown>;
          const type = im.type;
          const t =
            type === "main" || type === "gallery" || type === "thumbnail"
              ? type
              : undefined;
          return {
            url: typeof im.url === "string" ? im.url : undefined,
            alt: typeof im.alt === "string" ? im.alt : undefined,
            type: t,
          };
        })
    : [];
  return {
    images,
    thumbnails: Array.isArray(mo.thumbnails)
      ? (mo.thumbnails as ProductMedia["thumbnails"])
      : product.media?.thumbnails ?? [],
    videos: Array.isArray(mo.videos) ? (mo.videos as ProductMedia["videos"]) : product.media?.videos ?? [],
    files: Array.isArray(mo.files) ? (mo.files as ProductMedia["files"]) : product.media?.files ?? [],
    "3d_model": typeof mo["3d_model"] === "boolean" ? mo["3d_model"] : product.media?.["3d_model"],
  };
}

/** Ensure id and display titles are non-empty when JSON omits them (slug comes from filename). */
export function ensureProductIdentity(product: Product, fallbackSlug: string): Product {
  const id = String(product.id ?? "").trim() || fallbackSlug;
  const title =
    String(product.productTitle || product.name || product.title || "").trim() || fallbackSlug;
  return {
    ...product,
    id,
    productTitle: title,
    name: product.name || title,
    title: product.title || title,
  };
}

/** Normalize after reading product JSON (supports legacy string). */
export function asProductWithNormalizedDetail(product: Product): Product {
  const withDescReviews: Product = {
    ...product,
    detailed_description: normalizeDetailedDescriptionInput(
      product.detailed_description as unknown,
    ),
    reviews: normalizeProductReviewsInput(product.reviews as unknown),
  };
  return {
    ...withDescReviews,
    price: normalizeProductPrice(withDescReviews),
    media: normalizeProductMedia(withDescReviews),
  };
}
