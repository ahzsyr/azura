import type {
  Product,
  ProductFeatureCard,
  ProductMediaImage,
  ProductMediaVideo,
  ProductSectionMedia,
  ProductSectionVideo,
} from "@/features/products/types";
import { sectionMedia, sectionVideos, sectionsForTab } from "./unifi-product-sections";

const MEDIA_META_KEYS = new Set([
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
  "attributes",
  "id",
  "source",
  "kind",
  "sku",
  "price",
  "old_price",
  "price_adjustment",
  "images",
  "videos",
  "files",
  "3d_model",
]);

export type VariationSelection = Record<string, string>;
export type VariationTagged = {
  color?: string;
  attributes?: Record<string, string>;
};

export function normalizeVariationKey(key: string): string {
  const k = key.trim().toLowerCase();
  if (k === "colour") return "color";
  return k;
}

export function normalizeVariationValue(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

export function normalizeColorLabel(value: unknown): string {
  return normalizeVariationValue(value);
}

export function isColorDimension(type: string): boolean {
  const key = normalizeVariationKey(type);
  return key === "color" || key.includes("color");
}

export function selectedFromColor(color?: string): VariationSelection {
  const value = String(color ?? "").trim();
  return value ? { Color: value } : {};
}

export function colorFromSelected(selected?: VariationSelection): string | undefined {
  if (!selected) return undefined;
  for (const [key, value] of Object.entries(selected)) {
    if (isColorDimension(key) && value.trim()) return value;
  }
  return Object.values(selected).find((value) => value.trim()) || undefined;
}

export function normalizeSelected(selected?: VariationSelection): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(selected ?? {})) {
    const normKey = normalizeVariationKey(key);
    const normValue = normalizeVariationValue(value);
    if (normKey && normValue) out[normKey] = normValue;
  }
  return out;
}

export function itemVariationTags(item: VariationTagged | Record<string, unknown>): Record<string, string> {
  const row = item as Record<string, unknown>;
  const tags: Record<string, string> = {};
  const attrs = row.attributes;
  if (attrs && typeof attrs === "object" && !Array.isArray(attrs)) {
    for (const [key, value] of Object.entries(attrs as Record<string, unknown>)) {
      const normKey = normalizeVariationKey(key);
      const normValue = normalizeVariationValue(value);
      if (normKey && normValue) tags[normKey] = normValue;
    }
  }
  if (typeof row.color === "string" && row.color.trim()) {
    tags.color = normalizeVariationValue(row.color);
  }
  for (const [key, value] of Object.entries(row)) {
    if (MEDIA_META_KEYS.has(key) || MEDIA_META_KEYS.has(key.toLowerCase())) continue;
    if (typeof value !== "string" || !value.trim()) continue;
    const normKey = normalizeVariationKey(key);
    if (normKey) tags[normKey] = normalizeVariationValue(value);
  }
  return tags;
}

export function comboAttributes(combo: Record<string, unknown>): Record<string, string> {
  const nested = combo.attributes;
  const source =
    nested && typeof nested === "object" && !Array.isArray(nested)
      ? { ...(nested as Record<string, unknown>), ...combo }
      : combo;
  return itemVariationTags(source as VariationTagged);
}

function asImage(raw: unknown): ProductMediaImage | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const url = typeof row.url === "string" ? row.url.trim() : "";
  if (!url) return null;
  const image: ProductMediaImage = { url };
  if (typeof row.alt === "string") image.alt = row.alt;
  if (row.type === "main" || row.type === "gallery" || row.type === "thumbnail") {
    image.type = row.type;
  }
  applyVariationTags(image, row);
  return image;
}

function asVideo(raw: unknown): ProductMediaVideo | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const url = typeof row.url === "string" ? row.url.trim() : "";
  if (!url) return null;
  const video: ProductMediaVideo = { url };
  if (row.type === "youtube" || row.type === "vimeo" || row.type === "upload") {
    video.type = row.type;
  }
  if (typeof row.poster === "string") video.poster = row.poster;
  applyVariationTags(video, row);
  return video;
}

function applyVariationTags<T extends VariationTagged>(target: T, row: Record<string, unknown>): T {
  if (typeof row.color === "string" && row.color.trim()) target.color = row.color.trim();
  const tags = itemVariationTags(row);
  if (Object.keys(tags).length) {
    const attributes: Record<string, string> = {};
    for (const [key, value] of Object.entries(row.attributes && typeof row.attributes === "object" ? (row.attributes as Record<string, unknown>) : {})) {
      if (typeof value === "string" && value.trim()) attributes[key] = value.trim();
    }
    for (const [key, value] of Object.entries(row)) {
      if (MEDIA_META_KEYS.has(key) || MEDIA_META_KEYS.has(key.toLowerCase())) continue;
      if (typeof value === "string" && value.trim()) attributes[key] = value.trim();
    }
    if (Object.keys(attributes).length) target.attributes = attributes;
  }
  return target;
}

export function comboColor(combo: Record<string, unknown>): string {
  const attrs = comboAttributes(combo);
  return String(combo.Color ?? combo.color ?? combo.Colour ?? combo.colour ?? attrs.color ?? "").trim();
}

export function findMatchingCombination(
  product: Product,
  selected?: VariationSelection,
): Record<string, unknown> | undefined {
  const want = normalizeSelected(selected);
  if (!Object.keys(want).length) return undefined;
  const combos = (product.variation_combinations ?? []) as Record<string, unknown>[];
  const hits = combos.filter((combo) => {
    const attrs = comboAttributes(combo);
    if (!Object.keys(attrs).length) return false;
    for (const [key, value] of Object.entries(want)) {
      if (key in attrs && attrs[key] !== value) return false;
    }
    return Object.keys(attrs).some((key) => want[key] === attrs[key]);
  });
  hits.sort((a, b) => {
    const aMatch = Object.keys(want).filter((key) => comboAttributes(a)[key] === want[key]).length;
    const bMatch = Object.keys(want).filter((key) => comboAttributes(b)[key] === want[key]).length;
    return bMatch - aMatch;
  });
  return hits[0];
}

export function findColorCombination(
  product: Product,
  color?: string,
): Record<string, unknown> | undefined {
  return findMatchingCombination(product, selectedFromColor(color));
}

/** Map media URLs to color labels from variation combinations + tagged product media. */
export function buildUrlColorIndex(product: Product): Map<string, string> {
  const map = new Map<string, string>();
  for (const combo of (product.variation_combinations ?? []) as Record<string, unknown>[]) {
    const color = comboColor(combo);
    if (!color) continue;
    for (const raw of [...(Array.isArray(combo.images) ? combo.images : []), ...(Array.isArray(combo.videos) ? combo.videos : [])]) {
      if (!raw || typeof raw !== "object") continue;
      const url = typeof (raw as { url?: unknown }).url === "string" ? (raw as { url: string }).url.trim() : "";
      if (url) map.set(url, color);
      const poster =
        typeof (raw as { poster?: unknown }).poster === "string"
          ? (raw as { poster: string }).poster.trim()
          : "";
      if (poster) map.set(poster, color);
    }
  }
  for (const img of product.media?.images ?? []) {
    if (img.url?.trim() && img.color?.trim()) map.set(img.url.trim(), img.color.trim());
  }
  for (const vid of product.media?.videos ?? []) {
    if (vid.url?.trim() && vid.color?.trim()) map.set(vid.url.trim(), vid.color.trim());
    if (vid.poster?.trim() && vid.color?.trim()) map.set(vid.poster.trim(), vid.color.trim());
  }
  for (const section of product.detailed_description ?? []) {
    for (const media of section.media ?? []) {
      if (media.url?.trim() && media.color?.trim()) map.set(media.url.trim(), media.color.trim());
    }
    for (const feature of section.features ?? []) {
      if (feature.image?.trim() && feature.color?.trim()) map.set(feature.image.trim(), feature.color.trim());
    }
    for (const video of section.videos ?? []) {
      if (video.url?.trim() && video.color?.trim()) map.set(video.url.trim(), video.color.trim());
      if (video.poster?.trim() && video.color?.trim()) map.set(video.poster.trim(), video.color.trim());
    }
  }
  return map;
}

export function withInferredVariationTags<T extends VariationTagged & { url?: string; image?: string; poster?: string }>(
  items: T[],
  product?: Product,
): T[] {
  if (!product) return items;
  const index = buildUrlColorIndex(product);
  if (!index.size) return items;
  return items.map((item) => {
    if (Object.keys(itemVariationTags(item)).length) return item;
    const url = item.url?.trim() || item.image?.trim() || item.poster?.trim() || "";
    const color = url ? index.get(url) : undefined;
    if (!color) return item;
    return { ...item, color };
  });
}

/**
 * Drop alternate video encodings that appear as a second untagged URL without a poster
 * when a primary clip (with poster) is already present — common in UniFi gallery childAssets.
 */
export function preferPrimaryVideos<T extends VariationTagged & { url?: string; poster?: string }>(items: T[]): T[] {
  if (items.length < 2) return items;
  const withPoster = items.filter((item) => Boolean(item.poster?.trim()));
  const withoutPoster = items.filter((item) => !item.poster?.trim());
  if (withPoster.length > 0 && withoutPoster.length > 0) {
    return withPoster;
  }
  return items;
}

/** When a selection is set and any item is tagged, keep only items whose tags match. Untagged items are used only if nothing in the list is tagged. */
export function filterBySelectedVariations<T extends VariationTagged>(
  items: T[],
  selected?: VariationSelection,
  product?: Product,
): T[] {
  const enriched = withInferredVariationTags(items as Array<T & { url?: string; image?: string; poster?: string }>, product) as T[];
  const want = normalizeSelected(selected);
  if (!Object.keys(want).length) {
    return preferPrimaryVideos(enriched as Array<T & { url?: string; poster?: string }>) as T[];
  }
  const tagged = enriched.map((item) => ({ item, tags: itemVariationTags(item) }));
  const hasTagged = tagged.some((row) => Object.keys(row.tags).length > 0);
  if (!hasTagged) {
    return preferPrimaryVideos(enriched as Array<T & { url?: string; poster?: string }>) as T[];
  }
  return preferPrimaryVideos(
    tagged
      .filter(({ tags }) => {
        const keys = Object.keys(tags);
        if (!keys.length) return false;
        return keys.every((key) => !(key in want) || want[key] === tags[key]);
      })
      .map((row) => row.item) as Array<T & { url?: string; poster?: string }>,
  ) as T[];
}

export function filterBySelectedColor<T extends VariationTagged>(items: T[], color?: string): T[] {
  return filterBySelectedVariations(items, selectedFromColor(color));
}

export function matchesSelectedColor(value: string | undefined, color?: string): boolean {
  const want = normalizeVariationValue(color);
  if (!want) return true;
  return normalizeVariationValue(value) === want;
}

export function imagesForSelectedVariations(product: Product, selected?: VariationSelection): ProductMediaImage[] {
  const all = (product.media?.images ?? [])
    .map((img) => asImage(img))
    .filter((img): img is ProductMediaImage => img != null);
  const want = normalizeSelected(selected);
  if (!Object.keys(want).length) return all;

  const combo = findMatchingCombination(product, selected);
  const comboImages = Array.isArray(combo?.images)
    ? (combo.images as unknown[]).map(asImage).filter((img): img is ProductMediaImage => img != null)
    : [];
  if (comboImages.length) return comboImages;

  const tagged = filterBySelectedVariations(all, selected);
  if (tagged.length) return tagged;

  const color = want.color;
  if (color) {
    const byAlt = all.filter((img) => normalizeVariationValue(img.alt) === color);
    if (byAlt.length) return byAlt;
  }

  return all.filter((img) => Object.keys(itemVariationTags(img)).length === 0);
}

export function imagesForSelectedColor(product: Product, color?: string): ProductMediaImage[] {
  return imagesForSelectedVariations(product, selectedFromColor(color));
}

export function mediaForSelectedColor(product: Product, color?: string): ProductMediaImage[] {
  return imagesForSelectedColor(product, color);
}

export function videosForSelectedVariations(product: Product, selected?: VariationSelection): ProductMediaVideo[] {
  const all = (product.media?.videos ?? [])
    .map((vid) => asVideo(vid))
    .filter((vid): vid is ProductMediaVideo => vid != null);
  const want = normalizeSelected(selected);
  if (!Object.keys(want).length) return all;

  const combo = findMatchingCombination(product, selected);
  const comboVideos = Array.isArray(combo?.videos)
    ? (combo.videos as unknown[]).map(asVideo).filter((vid): vid is ProductMediaVideo => vid != null)
    : [];
  if (comboVideos.length) return comboVideos;

  return filterBySelectedVariations(all, selected);
}

export function videosForSelectedColor(product: Product, color?: string): ProductMediaVideo[] {
  return videosForSelectedVariations(product, selectedFromColor(color));
}

export function sectionsMediaForSelection(
  product: Product,
  tab: string,
  selected?: VariationSelection,
): ProductSectionMedia[] {
  return filterBySelectedVariations(sectionMedia(sectionsForTab(product, tab)), selected, product);
}

export function sectionsMediaForColor(
  product: Product,
  tab: string,
  color?: string,
): ProductSectionMedia[] {
  return sectionsMediaForSelection(product, tab, selectedFromColor(color));
}

export function sectionsVideosForSelection(
  product: Product,
  tab: string,
  selected?: VariationSelection,
): ProductSectionVideo[] {
  return filterBySelectedVariations(sectionVideos(sectionsForTab(product, tab)), selected, product);
}

export function sectionsVideosForColor(
  product: Product,
  tab: string,
  color?: string,
): ProductSectionVideo[] {
  return sectionsVideosForSelection(product, tab, selectedFromColor(color));
}

export function sectionsFeaturesForSelection(
  product: Product,
  tab: string,
  selected?: VariationSelection,
): ProductFeatureCard[] {
  const features = sectionsForTab(product, tab).flatMap((section) => section.features ?? []);
  return filterBySelectedVariations(features, selected, product);
}

export function sectionsFeaturesForColor(
  product: Product,
  tab: string,
  color?: string,
): ProductFeatureCard[] {
  return sectionsFeaturesForSelection(product, tab, selectedFromColor(color));
}
