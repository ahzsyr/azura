import type {
  Product,
  ProductCurrency,
  ProductDetailedSection,
  ProductFeatureCard,
  ProductFeatureHotspot,
  ProductMedia,
  ProductMediaImage,
  ProductMediaVideo,
  ProductModel3d,
  ProductModel3dObject,
  ProductModel3dVariant,
  ProductPrice,
  ProductReviewComment,
  ProductReviews,
  ProductSectionMedia,
  ProductSectionVideo,
} from "@/features/products/types";

const PRODUCT_CURRENCIES = new Set<ProductCurrency>(["USD", "EUR", "AED", "GBP", "JPY"]);

function asFiniteNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return value;
}

const VARIATION_META_KEYS = new Set([
  "url",
  "alt",
  "type",
  "poster",
  "width",
  "height",
  "image",
  "title",
  "body",
  "hotspot",
  "color",
  "attributes",
  "sku",
  "thumbnail",
  "camera",
  "ar",
  "enabled",
]);

function copyVariationAttributes<T extends { color?: string; attributes?: Record<string, string> }>(
  target: T,
  raw: Record<string, unknown>,
): T {
  if (typeof raw.color === "string" && raw.color.trim()) target.color = raw.color.trim();
  const attributes: Record<string, string> = {};
  if (raw.attributes && typeof raw.attributes === "object" && !Array.isArray(raw.attributes)) {
    for (const [key, value] of Object.entries(raw.attributes as Record<string, unknown>)) {
      if (typeof value === "string" && value.trim()) attributes[key] = value.trim();
    }
  }
  for (const [key, value] of Object.entries(raw)) {
    if (VARIATION_META_KEYS.has(key) || VARIATION_META_KEYS.has(key.toLowerCase())) continue;
    if (typeof value === "string" && value.trim()) attributes[key] = value.trim();
  }
  if (Object.keys(attributes).length) target.attributes = attributes;
  return target;
}

function normalizeHotspot(raw: unknown): ProductFeatureHotspot | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const hotspot: ProductFeatureHotspot = {};
  const dotX = asFiniteNumber(o.dotX);
  const dotY = asFiniteNumber(o.dotY);
  const tooltipX = asFiniteNumber(o.tooltipX);
  const tooltipY = asFiniteNumber(o.tooltipY);
  const scale = asFiniteNumber(o.scale);
  const canvasWidth = asFiniteNumber(o.canvasWidth);
  const canvasHeight = asFiniteNumber(o.canvasHeight);
  if (dotX != null) hotspot.dotX = dotX;
  if (dotY != null) hotspot.dotY = dotY;
  if (tooltipX != null) hotspot.tooltipX = tooltipX;
  if (tooltipY != null) hotspot.tooltipY = tooltipY;
  if (typeof o.lineRenderType === "string") hotspot.lineRenderType = o.lineRenderType;
  if (scale != null) hotspot.scale = scale;
  if (canvasWidth != null) hotspot.canvasWidth = canvasWidth;
  if (canvasHeight != null) hotspot.canvasHeight = canvasHeight;
  return Object.keys(hotspot).length ? hotspot : undefined;
}

function normalizeFeatureCards(raw: unknown): ProductFeatureCard[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const features = raw
    .filter((item) => item && typeof item === "object" && !Array.isArray(item))
    .map((item) => {
      const o = item as Record<string, unknown>;
      const card: ProductFeatureCard = {};
      if (typeof o.title === "string") card.title = o.title;
      if (typeof o.body === "string") card.body = o.body;
      if (typeof o.image === "string") card.image = o.image;
      copyVariationAttributes(card, o);
      const hotspot = normalizeHotspot(o.hotspot);
      if (hotspot) card.hotspot = hotspot;
      return card;
    })
    .filter((card) => Boolean(card.title || card.body || card.image));
  return features.length ? features : undefined;
}

function normalizeSectionMedia(raw: unknown): ProductSectionMedia[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const media = raw
    .filter((item) => item && typeof item === "object" && !Array.isArray(item))
    .map((item) => {
      const o = item as Record<string, unknown>;
      const entry: ProductSectionMedia = {};
      if (typeof o.url === "string") entry.url = o.url;
      if (typeof o.alt === "string") entry.alt = o.alt;
      copyVariationAttributes(entry, o);
      const width = asFiniteNumber(o.width);
      const height = asFiniteNumber(o.height);
      if (width != null) entry.width = width;
      if (height != null) entry.height = height;
      return entry;
    })
    .filter((item) => Boolean(item.url?.trim()));
  return media.length ? media : undefined;
}

function normalizeSectionVideos(raw: unknown): ProductSectionVideo[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const videos = raw
    .filter((item) => item && typeof item === "object" && !Array.isArray(item))
    .map((item) => {
      const o = item as Record<string, unknown>;
      const entry: ProductSectionVideo = {};
      if (typeof o.url === "string") entry.url = o.url;
      if (typeof o.type === "string") entry.type = o.type;
      if (typeof o.poster === "string") entry.poster = o.poster;
      copyVariationAttributes(entry, o);
      return entry;
    })
    .filter((item) => Boolean(item.url?.trim()));
  return videos.length ? videos : undefined;
}

function normalizeModel3dVariant(raw: unknown): ProductModel3dVariant | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const variant: ProductModel3dVariant = {};
  if (typeof o.color === "string") variant.color = o.color;
  if (typeof o.sku === "string") variant.sku = o.sku;
  if (typeof o.thumbnail === "string") variant.thumbnail = o.thumbnail;
  copyVariationAttributes(variant, o);
  if (o.camera && typeof o.camera === "object" && !Array.isArray(o.camera)) {
    const cam = o.camera as Record<string, unknown>;
    variant.camera = {
      fov: asFiniteNumber(cam.fov),
      phi: asFiniteNumber(cam.phi),
      theta: asFiniteNumber(cam.theta),
      radius: asFiniteNumber(cam.radius),
      brightness: asFiniteNumber(cam.brightness),
    };
  }
  if (o.ar && typeof o.ar === "object" && !Array.isArray(o.ar)) {
    const ar = o.ar as Record<string, unknown>;
    variant.ar = {
      enabled: typeof ar.enabled === "boolean" ? ar.enabled : undefined,
      placement: typeof ar.placement === "string" ? ar.placement : undefined,
      roll: asFiniteNumber(ar.roll),
      pitch: asFiniteNumber(ar.pitch),
      yaw: asFiniteNumber(ar.yaw),
    };
  }
  return Object.keys(variant).length ? variant : null;
}

export function normalizeProductModel3dObject(raw: unknown): ProductModel3dObject | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const variants = Array.isArray(o.variants)
    ? o.variants.map(normalizeModel3dVariant).filter((v): v is ProductModel3dVariant => v != null)
    : undefined;
  const url = typeof o.url === "string" ? o.url.trim() : "";
  const enabled = typeof o.enabled === "boolean" ? o.enabled : Boolean(url || (variants && variants.length));
  if (!enabled && !url && !(variants && variants.length)) return undefined;
  const out: ProductModel3dObject = { enabled };
  if (url) out.url = url;
  if (variants?.length) out.variants = variants;
  return out;
}

/** Preserve UniFi GLB payload; keep legacy boolean / file-url shapes. */
export function normalizeProductModel3d(raw: unknown): ProductModel3d | undefined {
  if (raw == null) return undefined;
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "string") {
    const url = raw.trim();
    return url ? { enabled: true, url } : false;
  }
  return normalizeProductModel3dObject(raw);
}

/**
 * Coerce `detailed_description` from legacy string or mixed JSON into sections.
 * UniFi converter fields (`tab`, `media`, `videos`, `features`, `model_3d`) are preserved.
 */
export function normalizeDetailedDescriptionInput(input: unknown): ProductDetailedSection[] {
  if (Array.isArray(input)) {
    return input
      .filter((item) => item !== null && item !== undefined)
      .map((item) => {
        if (typeof item !== "object") return { heading: "", text: "" };
        const o = item as Record<string, unknown>;
        const section: ProductDetailedSection = {
          heading: typeof o.heading === "string" ? o.heading : String(o.heading ?? ""),
          text: typeof o.text === "string" ? o.text : String(o.text ?? ""),
        };
        if (typeof o.tab === "string" && o.tab.trim()) section.tab = o.tab.trim();
        if (typeof o.tab_label === "string" && o.tab_label.trim()) section.tab_label = o.tab_label.trim();
        const media = normalizeSectionMedia(o.media);
        if (media) section.media = media;
        const videos = normalizeSectionVideos(o.videos);
        if (videos) section.videos = videos;
        const features = normalizeFeatureCards(o.features);
        if (features) section.features = features;
        const model3d = normalizeProductModel3dObject(o.model_3d);
        if (model3d) section.model_3d = model3d;
        return section;
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
            ...copyVariationAttributes({}, im),
          };
        })
    : [];
  const videosRaw = mo.videos;
  const videos: ProductMediaVideo[] = Array.isArray(videosRaw)
    ? videosRaw
        .filter((v) => v && typeof v === "object")
        .map((v) => {
          const vo = v as Record<string, unknown>;
          const type = vo.type;
          const t =
            type === "youtube" || type === "vimeo" || type === "upload" ? type : undefined;
          return {
            url: typeof vo.url === "string" ? vo.url : undefined,
            type: t,
            poster: typeof vo.poster === "string" ? vo.poster : undefined,
            ...copyVariationAttributes({}, vo),
          };
        })
    : Array.isArray(product.media?.videos)
      ? product.media.videos
      : [];
  const model3d = normalizeProductModel3d(mo["3d_model"] ?? product.media?.["3d_model"]);
  return {
    images,
    thumbnails: Array.isArray(mo.thumbnails)
      ? (mo.thumbnails as ProductMedia["thumbnails"])
      : product.media?.thumbnails ?? [],
    videos,
    files: Array.isArray(mo.files) ? (mo.files as ProductMedia["files"]) : product.media?.files ?? [],
    ...(model3d !== undefined ? { "3d_model": model3d } : {}),
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
