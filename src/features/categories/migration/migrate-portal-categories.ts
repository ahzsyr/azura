/**
 * Idempotent portal migrations:
 * KnowledgeCategory → Category(KNOWLEDGE, scopeOwnerId=knowledgeBaseId)
 * PartnerCategory → Category(PARTNER, scopeOwnerId=partnerProgramId)
 */
import "server-only";

import { prisma } from "@/lib/prisma";
import { categoryRepository } from "@/repositories/category.repository";
import type { CategoryWriteInput } from "@/features/categories/types";

export type PortalCategoryMigrationReport = {
  knowledgeCategories: number;
  knowledgeMemberships: number;
  partnerCategories: number;
  partnerMemberships: number;
  errors: string[];
};

export async function migratePortalCategories(): Promise<PortalCategoryMigrationReport> {
  const report: PortalCategoryMigrationReport = {
    knowledgeCategories: 0,
    knowledgeMemberships: 0,
    partnerCategories: 0,
    partnerMemberships: 0,
    errors: [],
  };

  const knowledgeCats = await prisma.knowledgeCategory.findMany({
    orderBy: [{ sortOrder: "asc" }],
  });
  const knowledgeIdMap = new Map<string, string>();

  // Pass 1 without parents
  for (const cat of knowledgeCats) {
    try {
      const input: CategoryWriteInput = {
        id: cat.id,
        slug: cat.slug,
        scope: "KNOWLEDGE",
        scopeOwnerId: cat.knowledgeBaseId,
        parentId: null,
        sortOrder: cat.sortOrder,
        visible: cat.isPublished,
        showInNav: true,
        featured: false,
        membershipMode: "MANUAL",
        conditions: { match: "any", children: [] },
        metadata: { name: cat.slug, legacy: { table: "KnowledgeCategory", id: cat.id } },
      };
      const saved = await categoryRepository.upsert(input);
      knowledgeIdMap.set(cat.id, saved.id);
      report.knowledgeCategories += 1;
    } catch (e) {
      report.errors.push(`KnowledgeCategory ${cat.slug}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Pass 2 parents
  for (const cat of knowledgeCats) {
    if (!cat.parentId) continue;
    const id = knowledgeIdMap.get(cat.id);
    const parentId = knowledgeIdMap.get(cat.parentId);
    if (!id || !parentId) continue;
    try {
      await prisma.category.update({ where: { id }, data: { parentId } });
    } catch (e) {
      report.errors.push(`KB parent ${cat.slug}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const articles = await prisma.knowledgeArticle.findMany({
    where: { categoryId: { not: null } },
    select: { id: true, categoryId: true },
  });
  for (const a of articles) {
    if (!a.categoryId) continue;
    const categoryId = knowledgeIdMap.get(a.categoryId) ?? a.categoryId;
    try {
      await categoryRepository.assignMembership({
        categoryId,
        entityId: a.id,
        entityKind: "knowledgeArticle",
        source: "MANUAL",
      });
      report.knowledgeMemberships += 1;
    } catch (e) {
      report.errors.push(`KB article ${a.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const partnerCats = await prisma.partnerCategory.findMany({ orderBy: [{ sortOrder: "asc" }] });
  const partnerIdMap = new Map<string, string>();

  for (const cat of partnerCats) {
    try {
      const input: CategoryWriteInput = {
        id: cat.id,
        slug: cat.slug,
        scope: "PARTNER",
        scopeOwnerId: cat.programId,
        parentId: null,
        sortOrder: cat.sortOrder,
        visible: true,
        showInNav: true,
        featured: false,
        membershipMode: "MANUAL",
        conditions: { match: "any", children: [] },
        metadata: { name: cat.slug, legacy: { table: "PartnerCategory", id: cat.id } },
      };
      const saved = await categoryRepository.upsert(input);
      partnerIdMap.set(cat.id, saved.id);
      report.partnerCategories += 1;
    } catch (e) {
      report.errors.push(`PartnerCategory ${cat.slug}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const partners = await prisma.partner.findMany({
    where: { categoryId: { not: null } },
    select: { id: true, categoryId: true },
  });
  for (const p of partners) {
    if (!p.categoryId) continue;
    const categoryId = partnerIdMap.get(p.categoryId) ?? p.categoryId;
    try {
      await categoryRepository.assignMembership({
        categoryId,
        entityId: p.id,
        entityKind: "partner",
        source: "MANUAL",
      });
      report.partnerMemberships += 1;
    } catch (e) {
      report.errors.push(`Partner ${p.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return report;
}
