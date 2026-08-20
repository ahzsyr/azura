import "server-only";

import { prisma } from "@/lib/prisma";
import { categoryRepository } from "@/repositories/category.repository";
import type { Product } from "@/features/products/types";

/**
 * Sync MANUAL CategoryMembership for a product from product.categoryIds.
 * Derived category/categories label strings are refreshed from Category metadata.
 * RULE memberships are left untouched.
 */
export async function syncProductManualCategoryMemberships(
  productId: string,
  product: Product
): Promise<Product> {
  const categoryIds = Array.isArray(product.categoryIds)
    ? [...new Set(product.categoryIds.filter(Boolean))]
    : [];

  // Remove MANUAL memberships no longer selected
  const existing = await prisma.categoryMembership.findMany({
    where: { entityId: productId, entityKind: "product", source: "MANUAL" },
  });
  const keep = new Set(categoryIds);
  for (const row of existing) {
    if (!keep.has(row.categoryId)) {
      await prisma.categoryMembership.delete({ where: { id: row.id } });
    }
  }

  const labels: string[] = [];
  for (const categoryId of categoryIds) {
    const cat = await categoryRepository.findById(categoryId);
    if (!cat || cat.scope !== "PRODUCT") continue;
    await categoryRepository.assignMembership({
      categoryId,
      entityId: productId,
      entityKind: "product",
      source: "MANUAL",
    });
    labels.push(cat.metadata?.name || cat.slug);
  }

  return {
    ...product,
    categoryIds,
    category: (labels[0] as Product["category"]) ?? product.category ?? null,
    categories: labels.length ? labels : product.categories ?? [],
  };
}
