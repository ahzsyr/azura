import type { Product } from "@/features/products/types";

export interface NormalizedDeliveryOption {
  id: string;
  label: string;
  time?: string;
  price?: string;
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

function normalizeOne(raw: Record<string, unknown>, index: number): NormalizedDeliveryOption {
  const label =
    pickString(raw, ["name", "class", "type", "label", "title"]) ??
    `Option ${index + 1}`;
  const time = pickString(raw, ["time", "eta", "duration", "delivery_time"]);
  const price = pickString(raw, ["price", "cost", "amount"]);
  const id = pickString(raw, ["id", "code"]) ?? `delivery-${index}`;
  return { id, label, time, price };
}

/** Normalize `delivery_options` or `shipping.options` for storefront UI. */
export function normalizeProductDeliveryOptions(product: Product): NormalizedDeliveryOption[] {
  const delivery = product.delivery_options ?? [];
  if (delivery.length > 0) {
    return delivery.map((item, i) => normalizeOne(item as Record<string, unknown>, i));
  }
  const shipping = product.shipping?.options ?? [];
  if (shipping.length > 0) {
    return shipping.map((item, i) => normalizeOne(item as Record<string, unknown>, i));
  }
  return [];
}

export const DEFAULT_DELIVERY_OPTIONS: NormalizedDeliveryOption[] = [
  {
    id: "standard",
    label: "Standard",
    time: "3–7 business days",
    price: "Calculated at checkout",
  },
  {
    id: "express",
    label: "Express",
    time: "1–2 business days",
    price: "Calculated at checkout",
  },
];

export function resolveDeliveryOptionsForProduct(product: Product): NormalizedDeliveryOption[] {
  const normalized = normalizeProductDeliveryOptions(product);
  return normalized.length > 0 ? normalized : DEFAULT_DELIVERY_OPTIONS;
}
