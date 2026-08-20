import "server-only";

import { categoryRepository } from "@/repositories/category.repository";
import { upgradeLegacyRuleSet, isEmptyRuleTree } from "@/features/categories/matching";
import type { CategoryWriteInput } from "@/features/categories/types";
import type { Collection } from "@/features/collections/types";

/**
 * Dual-write CatalogCollection → Category(PRODUCT) during Stage 7 cutover.
 * Failures are logged; legacy CatalogCollection remains writable.
 */
export async function dualWriteCategoryFromCollection(col: Collection): Promise<void> {
  try {
    const root = upgradeLegacyRuleSet(col.conditions);
    let parentId: string | null = null;
    if (col.parentSlug?.trim()) {
      const parent = await categoryRepository.findBySlug("PRODUCT", col.parentSlug.trim(), null);
      parentId = parent?.id ?? null;
    }

    const input: CategoryWriteInput = {
      id: col.id,
      slug: col.slug,
      scope: "PRODUCT",
      scopeOwnerId: null,
      parentId,
      sortOrder: 0,
      visible: col.visible !== false,
      showInNav: col.showInNav !== false,
      featured: col.featured === true,
      // Prefer explicit Collection.membershipMode; else empty rules → MANUAL, non-empty → HYBRID.
      membershipMode:
        col.membershipMode ??
        (isEmptyRuleTree(root) ? "MANUAL" : "HYBRID"),
      conditions: root,
      metadata: {
        name: col.name,
        description: col.description,
        badge: col.badge,
        coverImage: col.coverImage,
        iconImage: col.iconImage,
        cardTemplate: col.cardTemplate,
        sortBy: col.sortBy as import("@/features/categories/types").CategoryMetadata["sortBy"],
        seo: col.seo,
        tags: col.tags,
        legacy: { table: "CatalogCollection", id: col.id },
      },
    };
    await categoryRepository.upsert(input);
  } catch (e) {
    console.warn(
      "[categories] dual-write failed for",
      col.slug,
      e instanceof Error ? e.message : e
    );
  }
}

export async function dualWriteDeleteCategoryBySlug(slug: string): Promise<void> {
  try {
    const existing = await categoryRepository.findBySlug("PRODUCT", slug.trim(), null);
    if (!existing) return;
    const { prisma } = await import("@/lib/prisma");
    await prisma.category.delete({ where: { id: existing.id } });
  } catch (e) {
    console.warn(
      "[categories] dual-write delete failed for",
      slug,
      e instanceof Error ? e.message : e
    );
  }
}
