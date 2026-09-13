import { productSchema } from "@/features/products/lib/product-schema";
import type { Product } from "@/features/products/types";

export type ProductValidationResult =
  | { ok: true; product: Product }
  | { ok: false; message: string; fields?: string[] };

export function validateImportedProduct(product: Product): ProductValidationResult {
  const validated = productSchema.safeParse(product);
  if (!validated.success) {
    return {
      ok: false,
      message: validated.error.message,
      fields: validated.error.issues.map((i) => i.path.join(".")).filter(Boolean),
    };
  }
  return { ok: true, product: validated.data as unknown as Product };
}

/** Warn when import payload lacks rich converter JSON fields (likely CSV stub). */
export function warnThinProductStub(raw: Record<string, unknown>): string | null {
  const media = raw.media as { images?: unknown[] } | undefined;
  const hasImages = Array.isArray(media?.images) && media.images.length > 0;
  const hasDetail =
    Array.isArray(raw.detailed_description) && raw.detailed_description.length > 0;
  const hasSpecs = Array.isArray(raw.specifications) && raw.specifications.length > 0;
  if (!hasImages && !hasDetail && !hasSpecs) {
    return "Product looks like a thin stub — use the full companion .json document for all fields";
  }
  return null;
}

export function importItemWarnings(
  raw: Record<string, unknown>,
  pairedCsv?: string,
): string[] {
  const warnings: string[] = [];
  if (pairedCsv) {
    warnings.push(`Paired CSV ${pairedCsv} (metadata only; JSON is authoritative)`);
  }
  const thin = warnThinProductStub(raw);
  if (thin) warnings.push(thin);
  return warnings;
}
