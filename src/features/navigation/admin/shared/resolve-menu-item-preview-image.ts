import type { HeaderBuilderCatalog, MenuItem } from "@/features/navigation/types";

/** Preview image for menu builder rows — brand logo from catalog when linked. */
export function resolveMenuItemPreviewImage(
  item: Pick<MenuItem, "type" | "imageUrl" | "brandSlug">,
  catalog: HeaderBuilderCatalog,
): string | undefined {
  const stored = item.imageUrl?.trim();
  if (stored) return stored;
  if (item.type !== "brand") return undefined;
  const slug = item.brandSlug?.trim().toLowerCase();
  if (!slug) return undefined;
  return catalog.brands.find((b) => b.slug.trim().toLowerCase() === slug)?.logoUrl?.trim() || undefined;
}
