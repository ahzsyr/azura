/**
 * Idempotent TESTIMONIAL scope migration:
 * TestimonialCollection → Category(TESTIMONIAL)
 * + items → MANUAL memberships
 */
import "server-only";

import { prisma } from "@/lib/prisma";
import { categoryRepository } from "@/repositories/category.repository";
import type { CategoryWriteInput } from "@/features/categories/types";

export type TestimonialCategoryMigrationReport = {
  categoriesMigrated: number;
  membershipsCreated: number;
  errors: string[];
};

export async function migrateTestimonialCategories(): Promise<TestimonialCategoryMigrationReport> {
  const report: TestimonialCategoryMigrationReport = {
    categoriesMigrated: 0,
    membershipsCreated: 0,
    errors: [],
  };

  const collections = await prisma.testimonialCollection.findMany({
    orderBy: [{ sortOrder: "asc" }],
  });
  const idMap = new Map<string, string>();

  for (const col of collections) {
    try {
      const input: CategoryWriteInput = {
        id: col.id,
        slug: col.slug,
        scope: "TESTIMONIAL",
        scopeOwnerId: null,
        parentId: null,
        sortOrder: col.sortOrder,
        visible: col.isPublished,
        showInNav: true,
        featured: false,
        membershipMode: "MANUAL",
        conditions: { match: "any", children: [] },
        metadata: {
          name: col.slug,
          legacy: { table: "TestimonialCollection", id: col.id },
        },
      };
      const saved = await categoryRepository.upsert(input);
      idMap.set(col.id, saved.id);
      report.categoriesMigrated += 1;
    } catch (e) {
      report.errors.push(
        `TestimonialCollection ${col.slug}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  const items = await prisma.testimonialCollectionItem.findMany();
  for (const item of items) {
    const categoryId = idMap.get(item.collectionId) ?? item.collectionId;
    try {
      await categoryRepository.assignMembership({
        categoryId,
        entityId: item.testimonialId,
        entityKind: "testimonial",
        source: "MANUAL",
        sortOrder: item.sortOrder,
      });
      report.membershipsCreated += 1;
    } catch (e) {
      report.errors.push(
        `item ${item.testimonialId}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  return report;
}
