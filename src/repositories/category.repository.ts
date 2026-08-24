import type { Category, CategoryMembership, CategoryScope, CategoryWriteInput, MembershipSource } from "@/features/categories/types";
import { isEntityKindAllowedForScope } from "@/features/categories/invariants";
import { toDbScopeOwnerId } from "@/features/categories/scope-owner";
import { categoryToCreateInput, rowToCategory, rowToMembership } from "@/features/categories/db/category-db-mapper";
import type { CategoryEntityKind } from "@/features/categories/types";
import { prisma } from "@/lib/prisma";

export const categoryRepository = {
  async findAll(scope?: CategoryScope, scopeOwnerId?: string | null): Promise<Category[]> {
    const where =
      scope == null
        ? undefined
        : {
            scope,
            scopeOwnerId: toDbScopeOwnerId(scope, scopeOwnerId ?? null),
          };
    const rows = await prisma.category.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
    });
    return rows.map(rowToCategory);
  },

  async findById(id: string): Promise<Category | null> {
    const row = await prisma.category.findUnique({ where: { id } });
    return row ? rowToCategory(row) : null;
  },

  async findBySlug(
    scope: CategoryScope,
    slug: string,
    scopeOwnerId?: string | null
  ): Promise<Category | null> {
    const row = await prisma.category.findUnique({
      where: {
        scope_scopeOwnerId_slug: {
          scope,
          scopeOwnerId: toDbScopeOwnerId(scope, scopeOwnerId ?? null),
          slug,
        },
      },
    });
    return row ? rowToCategory(row) : null;
  },

  async upsert(cat: CategoryWriteInput): Promise<Category> {
    const scopeOwnerIdDb = toDbScopeOwnerId(cat.scope, cat.scopeOwnerId);
    const data = categoryToCreateInput(cat, scopeOwnerIdDb);
    const row = await prisma.category.upsert({
      where: {
        scope_scopeOwnerId_slug: {
          scope: cat.scope,
          scopeOwnerId: scopeOwnerIdDb,
          slug: cat.slug,
        },
      },
      create: data,
      update: {
        parentId: data.parentId,
        sortOrder: data.sortOrder,
        visible: data.visible,
        showInNav: data.showInNav,
        featured: data.featured,
        membershipMode: data.membershipMode,
        conditions: data.conditions,
        metadata: data.metadata,
      },
    });
    return rowToCategory(row);
  },

  async listMemberships(categoryId: string): Promise<CategoryMembership[]> {
    const rows = await prisma.categoryMembership.findMany({
      where: { categoryId },
      orderBy: [{ sortOrder: "asc" }],
    });
    return rows.map(rowToMembership);
  },

  /**
   * Assign membership with scope safety + uniqueness.
   * HYBRID overlap: MANUAL wins (does not downgrade MANUAL to RULE).
   */
  async assignMembership(input: {
    categoryId: string;
    entityId: string;
    entityKind: CategoryEntityKind;
    source: MembershipSource;
    sortOrder?: number;
  }): Promise<CategoryMembership> {
    const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
    if (!category) throw new Error(`Category not found: ${input.categoryId}`);
    if (!isEntityKindAllowedForScope(category.scope, input.entityKind)) {
      throw new Error(
        `Entity kind ${input.entityKind} is not allowed for category scope ${category.scope}`
      );
    }

    const existing = await prisma.categoryMembership.findUnique({
      where: {
        categoryId_entityId_entityKind: {
          categoryId: input.categoryId,
          entityId: input.entityId,
          entityKind: input.entityKind,
        },
      },
    });

    if (existing) {
      // MANUAL wins on overlap — never replace MANUAL with RULE
      if (existing.source === "MANUAL" && input.source === "RULE") {
        return rowToMembership(existing);
      }
      const updated = await prisma.categoryMembership.update({
        where: { id: existing.id },
        data: {
          source: input.source === "MANUAL" ? "MANUAL" : existing.source,
          sortOrder: input.sortOrder ?? existing.sortOrder,
        },
      });
      return rowToMembership(updated);
    }

    const created = await prisma.categoryMembership.create({
      data: {
        categoryId: input.categoryId,
        entityId: input.entityId,
        entityKind: input.entityKind,
        source: input.source,
        sortOrder: input.sortOrder ?? 0,
      },
    });
    return rowToMembership(created);
  },

  /** Delete derived RULE memberships for a category (manual rows preserved). */
  async deleteRuleMemberships(categoryId: string): Promise<number> {
    const result = await prisma.categoryMembership.deleteMany({
      where: { categoryId, source: "RULE" },
    });
    return result.count;
  },
};
