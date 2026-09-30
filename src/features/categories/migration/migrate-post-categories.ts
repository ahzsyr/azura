/**
 * Idempotent POST scope migration: PostCategory → Category(scope=POST)
 * + PostCategoryOnPost → CategoryMembership(source=MANUAL)
 */
import "server-only";

import { prisma } from "@/lib/prisma";
import { categoryRepository } from "@/repositories/category.repository";
import type { CategoryWriteInput } from "@/features/categories/types";

export type PostCategoryMigrationReport = {
  categoriesMigrated: number;
  membershipsCreated: number;
  errors: string[];
};

export async function migratePostCategories(): Promise<PostCategoryMigrationReport> {
  const report: PostCategoryMigrationReport = {
    categoriesMigrated: 0,
    membershipsCreated: 0,
    errors: [],
  };

  const cats = await prisma.postCategory.findMany({ orderBy: { sortOrder: "asc" } });
  const idMap = new Map<string, string>();

  for (const cat of cats) {
    try {
      const input: CategoryWriteInput = {
        id: cat.id,
        slug: cat.slug,
        scope: "POST",
        scopeOwnerId: null,
        parentId: null,
        sortOrder: cat.sortOrder,
        visible: true,
        showInNav: true,
        featured: false,
        membershipMode: "MANUAL",
        conditions: { match: "any", children: [] },
        metadata: {
          name: cat.slug,
          legacy: { table: "PostCategory", id: cat.id },
        },
      };
      const saved = await categoryRepository.upsert(input);
      idMap.set(cat.id, saved.id);
      report.categoriesMigrated += 1;
    } catch (e) {
      report.errors.push(`PostCategory ${cat.slug}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const links = await prisma.postCategoryOnPost.findMany();
  for (const link of links) {
    const categoryId = idMap.get(link.categoryId) ?? link.categoryId;
    try {
      await categoryRepository.assignMembership({
        categoryId,
        entityId: link.postId,
        entityKind: "post",
        source: "MANUAL",
      });
      report.membershipsCreated += 1;
    } catch (e) {
      report.errors.push(
        `membership post=${link.postId} cat=${link.categoryId}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  return report;
}
