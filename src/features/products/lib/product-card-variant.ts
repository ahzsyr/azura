export type ProductCardVariant = "default" | "compact" | "featured";

export function isProductCardVariant(v: unknown): v is ProductCardVariant {
  return v === "default" || v === "compact" || v === "featured";
}
