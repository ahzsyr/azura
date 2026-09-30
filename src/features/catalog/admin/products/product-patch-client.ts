import type { Product } from "@/features/products/types";
import { computePatch, isEmptyPatch } from "@/lib/patch";
import type { ManagedProduct } from "@/features/products/lib/product-manager-normalize";

const API = { credentials: "include" as const };

export type ProductPatchSaveResult = {
  product: Product;
  slug: string;
  noop?: boolean;
  appliedPaths?: string[];
  sync?: unknown;
};

export type ProductSaveSyncPayload = {
  ok?: boolean;
  indexSync?: unknown;
  searchSync?: unknown;
  collectionSync?: unknown;
  errors?: string[];
  warnings?: string[];
};

export async function patchProductSave(
  locale: string,
  slug: string,
  changes: Record<string, unknown>,
  options?: { originalSlug?: string },
): Promise<ProductPatchSaveResult> {
  const res = await fetch(
    `/api/products?locale=${encodeURIComponent(locale)}&slug=${encodeURIComponent(slug)}`,
    {
      ...API,
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        changes,
        ...(options?.originalSlug ? { originalSlug: options.originalSlug } : {}),
      }),
    },
  );
  const json = (await res.json()) as ProductPatchSaveResult & { error?: string };
  if (!res.ok) throw new Error(json.error || "Patch save failed");
  return json;
}

export async function fullProductSave(
  locale: string,
  product: Product,
  slug: string,
  options?: { originalSlug?: string },
): Promise<ProductPatchSaveResult> {
  const res = await fetch("/api/products", {
    ...API,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      locale,
      slug,
      product,
      ...(options?.originalSlug ? { originalSlug: options.originalSlug } : {}),
    }),
  });
  const json = (await res.json()) as ProductPatchSaveResult & { error?: string };
  if (!res.ok) throw new Error(json.error || "Save failed");
  return json;
}

/** Save product using patch when persisted; full POST for new products or PATCH 501 fallback. */
export async function saveProductWithPatch(
  locale: string,
  baseline: ManagedProduct,
  current: ManagedProduct,
  options: { isPersisted: boolean; originalSlug?: string },
): Promise<ProductPatchSaveResult> {
  const slug = current.slug;

  if (options.isPersisted) {
    const changes = computePatch(
      baseline as unknown as Record<string, unknown>,
      current as unknown as Record<string, unknown>,
    ) as Record<string, unknown>;

    if (isEmptyPatch(changes)) {
      return { product: current, slug, noop: true, appliedPaths: [] };
    }

    try {
      return await patchProductSave(locale, slug, changes, {
        originalSlug: options.originalSlug,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (!message.includes("501")) throw e;
    }
  }

  return fullProductSave(locale, current, slug, { originalSlug: options.originalSlug });
}

export async function patchProductFields(
  locale: string,
  slug: string,
  changes: Record<string, unknown>,
): Promise<ProductPatchSaveResult> {
  if (isEmptyPatch(changes)) {
    return { product: {} as Product, slug, noop: true, appliedPaths: [] };
  }
  try {
    return await patchProductSave(locale, slug, changes);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (message.includes("501")) {
      throw e;
    }
    throw e;
  }
}
