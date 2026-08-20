/**
 * Idempotent PRODUCT Category migration:
 * 1) CatalogCollection → Category(scope=PRODUCT)
 * 2) Product.category / categories strings → Category + MANUAL membership + categoryIds
 *
 * Safe to re-run. Records metadata.legacy for Stage 3 gates.
 */
import "server-only";

import { prisma } from "@/lib/prisma";
import { normalizeSlug } from "@/features/collections/normalization";
import { upgradeLegacyRuleSet, isEmptyRuleTree } from "@/features/categories/matching";
import { categoryRepository } from "@/repositories/category.repository";
import type { CategoryMetadata, CategoryWriteInput } from "@/features/categories/types";
import { rowToCollection } from "@/features/collections/db/catalog-collection-db-mapper";

export type ProductCategoryMigrationReport = {
  collectionsMigrated: number;
  stringCategoriesCreated: number;
  manualMembershipsCreated: number;
  productsUpdated: number;
  parentLinksResolved: number;
  ruleSync?: import("@/features/categories/sync-rule-memberships").CategoryRuleSyncReport;
  errors: string[];
};

function hasRules(conditions: unknown): boolean {
  const root = upgradeLegacyRuleSet(conditions);
  return !isEmptyRuleTree(root);
}

export async function migrateProductCategories(): Promise<ProductCategoryMigrationReport> {
  const report: ProductCategoryMigrationReport = {
    collectionsMigrated: 0,
    stringCategoriesCreated: 0,
    manualMembershipsCreated: 0,
    productsUpdated: 0,
    parentLinksResolved: 0,
    errors: [],
  };

  const catalogRows = await prisma.catalogCollection.findMany({
    orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
  });

  /** slug → category id after upsert */
  const slugToId = new Map<string, string>();

  // Pass 1: create/update Category rows without parents
  for (const row of catalogRows) {
    try {
      const col = rowToCollection(row);
      const meta: CategoryMetadata = {
        name: col.name || col.slug,
        description: col.description,
        badge: col.badge,
        coverImage: col.coverImage,
        iconImage: col.iconImage,
        cardTemplate: col.cardTemplate,
        sortBy: col.sortBy as CategoryMetadata["sortBy"],
        seo: col.seo,
        tags: col.tags,
        legacy: { table: "CatalogCollection", id: row.id },
      };

      const membershipMode = hasRules(row.conditions) ? "HYBRID" : "MANUAL";
      const cat: CategoryWriteInput = {
        id: row.id,
        slug: row.slug,
        scope: "PRODUCT",
        scopeOwnerId: null,
        parentId: null,
        sortOrder: row.sortOrder,
        visible: row.visible,
        showInNav: col.showInNav !== false,
        featured: col.featured === true,
        membershipMode,
        conditions: upgradeLegacyRuleSet(row.conditions),
        metadata: meta,
      };

      const saved = await categoryRepository.upsert(cat);
      slugToId.set(saved.slug, saved.id);
      report.collectionsMigrated += 1;
    } catch (e) {
      report.errors.push(
        `CatalogCollection ${row.slug}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  // Pass 2: resolve parents
  for (const row of catalogRows) {
    const parentSlug = row.parentSlug?.trim();
    if (!parentSlug) continue;
    const id = slugToId.get(row.slug);
    const parentId = slugToId.get(parentSlug);
    if (!id || !parentId) continue;
    try {
      await prisma.category.update({
        where: { id },
        data: { parentId },
      });
      report.parentLinksResolved += 1;
    } catch (e) {
      report.errors.push(
        `parent ${row.slug}→${parentSlug}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  // Pass 3: product string categories → Category + MANUAL membership
  const products = await prisma.product.findMany({
    select: {
      id: true,
      canonicalSlug: true,
      category: true,
      categories: true,
      payload: true,
    },
  });

  for (const product of products) {
    try {
      const strings = new Set<string>();
      if (product.category?.trim()) strings.add(product.category.trim());
      const catsJson = product.categories;
      if (Array.isArray(catsJson)) {
        for (const c of catsJson) {
          if (typeof c === "string" && c.trim()) strings.add(c.trim());
        }
      }

      const categoryIds: string[] = [];

      for (const label of strings) {
        const slug = normalizeSlug(label) || normalizeSlug(`cat-${label}`) || `cat-${label}`;
        let existing = await categoryRepository.findBySlug("PRODUCT", slug, null);
        if (!existing) {
          // Prefer matching an already-migrated collection with same slug
          existing = slugToId.has(slug)
            ? await categoryRepository.findById(slugToId.get(slug)!)
            : null;
        }

        if (!existing) {
          const created = await categoryRepository.upsert({
            slug,
            scope: "PRODUCT",
            scopeOwnerId: null,
            parentId: null,
            sortOrder: 0,
            visible: true,
            showInNav: true,
            featured: false,
            membershipMode: "MANUAL",
            conditions: { match: "any", children: [] },
            metadata: {
              name: label,
              description: "",
              legacy: { table: "Product.category", id: label },
            },
          });
          existing = created;
          slugToId.set(slug, created.id);
          report.stringCategoriesCreated += 1;
        }

        if (!existing) continue;
        categoryIds.push(existing.id);

        await categoryRepository.assignMembership({
          categoryId: existing.id,
          entityId: product.id,
          entityKind: "product",
          source: "MANUAL",
        });
        report.manualMembershipsCreated += 1;
      }

      // Persist categoryIds on payload; keep category/categories as derived labels
      const payload =
        product.payload && typeof product.payload === "object"
          ? { ...(product.payload as Record<string, unknown>) }
          : {};
      const derivedLabels = [...strings];
      payload.categoryIds = categoryIds;
      if (derivedLabels[0]) payload.category = derivedLabels[0];
      payload.categories = derivedLabels;

      await prisma.product.update({
        where: { id: product.id },
        data: {
          payload: payload as object,
          category: derivedLabels[0] ?? product.category,
          categories: derivedLabels,
        },
      });
      report.productsUpdated += 1;
    } catch (e) {
      report.errors.push(
        `Product ${product.canonicalSlug}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  const { syncProductCategoryRuleMemberships } = await import(
    "@/features/categories/sync-rule-memberships"
  );
  report.ruleSync = await syncProductCategoryRuleMemberships("en-us");
  if (report.ruleSync.errors.length) {
    report.errors.push(...report.ruleSync.errors.map((e) => `ruleSync: ${e}`));
  }

  return report;
}
