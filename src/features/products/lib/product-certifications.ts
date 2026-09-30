import type { Product, ProductCertification } from "@/features/products/types";

export interface NormalizedCertification {
  name: string;
  image?: string;
  link?: string;
}

export function normalizeProductCertifications(
  certifications: (ProductCertification | string)[] | undefined,
): NormalizedCertification[] {
  if (!certifications?.length) return [];
  return certifications
    .map((entry): NormalizedCertification | null => {
      if (typeof entry === "string") {
        const name = entry.trim();
        return name ? { name } : null;
      }
      const obj = entry as ProductCertification;
      const name = (obj.name ?? "").trim();
      if (!name) return null;
      return {
        name,
        image: obj.image?.trim() || undefined,
        link: obj.link?.trim() || undefined,
      };
    })
    .filter((c): c is NormalizedCertification => c !== null);
}

/** Primary badge for gallery (first cert with image, else first cert). */
export function primaryCertificationBadge(
  certifications: (ProductCertification | string)[] | undefined,
): NormalizedCertification | undefined {
  const list = normalizeProductCertifications(certifications);
  if (!list.length) return undefined;
  return list.find((c) => c.image) ?? list[0];
}
