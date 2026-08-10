import type { Category as DbCategory, CategoryMembership as DbMembership, Prisma } from "@prisma/client";
import type { Category, CategoryMembership, CategoryMetadata, CategoryWriteInput, MembershipMode } from "@/features/categories/types";
import { fromDbScopeOwnerId } from "@/features/categories/scope-owner";
import { upgradeLegacyRuleSet } from "@/features/categories/matching";

export function rowToCategory(row: DbCategory): Category {
  const meta = (row.metadata && typeof row.metadata === "object" ? row.metadata : {}) as CategoryMetadata;
  return {
    id: row.id,
    slug: row.slug,
    scope: row.scope,
    scopeOwnerId: fromDbScopeOwnerId(row.scope, row.scopeOwnerId),
    parentId: row.parentId,
    sortOrder: row.sortOrder,
    visible: row.visible,
    showInNav: row.showInNav,
    featured: row.featured,
    membershipMode: row.membershipMode as MembershipMode,
    conditions: upgradeLegacyRuleSet(row.conditions),
    metadata: meta,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function rowToMembership(row: DbMembership): CategoryMembership {
  return {
    id: row.id,
    categoryId: row.categoryId,
    entityId: row.entityId,
    entityKind: row.entityKind as CategoryMembership["entityKind"],
    source: row.source,
    sortOrder: row.sortOrder,
  };
}

export function categoryToCreateInput(
  cat: CategoryWriteInput,
  scopeOwnerIdDb: string
): Prisma.CategoryUncheckedCreateInput {
  const data: Prisma.CategoryUncheckedCreateInput = {
    slug: cat.slug,
    scope: cat.scope,
    scopeOwnerId: scopeOwnerIdDb,
    parentId: cat.parentId ?? null,
    sortOrder: cat.sortOrder,
    visible: cat.visible,
    showInNav: cat.showInNav,
    featured: cat.featured,
    membershipMode: cat.membershipMode,
    conditions: cat.conditions as unknown as Prisma.InputJsonValue,
    metadata: (cat.metadata ?? {}) as Prisma.InputJsonValue,
  };
  if (cat.id) data.id = cat.id;
  return data;
}
