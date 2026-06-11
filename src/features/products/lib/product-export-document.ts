import type { Product } from "@/features/products/types";
import { normalizeDetailedDescriptionInput } from "./product-detailed-description";
import { normalizeProductForSave, type ManagedProduct } from "./product-manager-normalize";

const EXPORT_CORE_KEYS = new Set([
  "slug",
  "id",
  "productTitle",
  "name",
  "title",
  "title_extended",
  "short_description",
  "description",
  "detailed_description",
  "brand",
  "category",
  "categories",
  "mpn",
  "manufacturer_part_number",
  "ean",
  "warranty",
  "condition_options",
  "plug_options",
  "media",
  "price",
  "old_price",
  "availability",
  "stock_status",
  "variations",
  "specifications",
  "documents",
  "shipping",
  "delivery_options",
  "reviews",
  "bought_together",
  "certifications",
  "product_cta",
]);

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Full product document for admin JSON export: every manager section is represented
 * with explicit arrays/objects (no `undefined` omissions), plus `slug` for round-trip.
 * Unknown keys from the stored product (e.g. `variation_combinations`) are preserved after the core block.
 */
export function buildFullProductExportDocument(raw: Product & { slug?: string }): Record<string, unknown> {
  const n: ManagedProduct = normalizeProductForSave(raw);
  const detailed = normalizeDetailedDescriptionInput(n.detailed_description);
  const detailed_description = detailed.length ? detailed : [{ heading: "", text: "" }];

  const media = {
    images: cloneJson(n.media?.images ?? []),
    thumbnails: cloneJson(n.media?.thumbnails ?? []),
    videos: cloneJson(n.media?.videos ?? []),
    files: cloneJson(n.media?.files ?? []),
    "3d_model": Boolean(n.media?.["3d_model"]),
  };

  const reviews = {
    rating: Number(n.reviews?.rating ?? 0),
    count: Number(n.reviews?.count ?? 0),
    source: n.reviews?.source ?? "",
    distribution: {
      excellent: Number(n.reviews?.distribution?.excellent ?? 0),
      great: Number(n.reviews?.distribution?.great ?? 0),
      average: Number(n.reviews?.distribution?.average ?? 0),
      poor: Number(n.reviews?.distribution?.poor ?? 0),
      bad: Number(n.reviews?.distribution?.bad ?? 0),
    },
    breakdown: {
      "5_star": Number(n.reviews?.breakdown?.["5_star"] ?? 0),
      "4_star": Number(n.reviews?.breakdown?.["4_star"] ?? 0),
      "3_star": Number(n.reviews?.breakdown?.["3_star"] ?? 0),
      "2_star": Number(n.reviews?.breakdown?.["2_star"] ?? 0),
      "1_star": Number(n.reviews?.breakdown?.["1_star"] ?? 0),
    },
    comments: cloneJson(n.reviews?.comments ?? []),
  };

  const doc: Record<string, unknown> = {};

  doc.slug = n.slug;
  doc.id = n.id;
  doc.productTitle = n.productTitle;
  doc.name = n.name ?? n.productTitle;
  doc.title = n.title ?? n.productTitle;
  doc.title_extended = n.title_extended ?? null;
  doc.short_description = n.short_description ?? "";
  doc.description = n.description ?? "";
  doc.detailed_description = detailed_description;
  doc.brand = n.brand ?? "";
  doc.category = n.category ?? "";
  doc.categories = [...(n.categories ?? [])];
  doc.mpn = n.mpn ?? "";
  doc.manufacturer_part_number = n.manufacturer_part_number ?? n.mpn ?? "";
  doc.ean = n.ean ?? "";
  doc.warranty = n.warranty ?? "";
  doc.condition_options = [...(n.condition_options ?? [])];
  doc.plug_options = [...(n.plug_options ?? [])];

  doc.media = media;

  doc.price = {
    value: Number(n.price?.value ?? 0),
    currency: n.price?.currency ?? "USD",
    discount: n.price?.discount ?? null,
  };
  doc.old_price = n.old_price ?? null;
  doc.availability = n.availability ?? "InStock";
  doc.stock_status = n.stock_status ?? "in_stock";

  doc.variations = cloneJson(n.variations ?? []);

  doc.specifications = cloneJson(n.specifications ?? []);

  doc.documents = cloneJson(n.documents ?? []);

  doc.shipping = {
    options: cloneJson(n.shipping?.options ?? []),
  };
  doc.delivery_options = cloneJson(n.delivery_options ?? []);

  doc.reviews = reviews;

  doc.bought_together = cloneJson(n.bought_together ?? []);
  doc.certifications = cloneJson(n.certifications ?? []);
  doc.product_cta = cloneJson(n.product_cta ?? {});

  for (const [key, value] of Object.entries(n)) {
    if (EXPORT_CORE_KEYS.has(key)) continue;
    if (value === undefined) continue;
    doc[key] = cloneJson(value);
  }

  return doc;
}
