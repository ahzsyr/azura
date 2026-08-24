import { prisma } from "@/lib/prisma";
import type { Product as DbProduct, Prisma } from "@prisma/client";
import {
  toDbRow,
  toDbUpdateData,
  type ProductDbWriteInput,
} from "@/features/products/db/product-db-mapper";
import { PRODUCT_ENTITY_TYPE } from "@/features/products/db/product-translation";
import { isProductTableReadOnly } from "@/features/entities/entity-flags";

function assertProductTableWritable(operation: string): void {
  if (isProductTableReadOnly()) {
    throw new Error(
      `Product table is read-only (${operation}). Writes must go through entityService.`,
    );
  }
}

export type ProductListFilter = {
  brand?: string;
  category?: string;
  status?: string;
  stockStatus?: string;
  search?: string;
  skip?: number;
  take?: number;
  orderBy?: Prisma.ProductOrderByWithRelationInput;
};

export const productRepository = {
  async findByCanonicalSlug(canonicalSlug: string): Promise<DbProduct | null> {
    return prisma.product.findUnique({
      where: { canonicalSlug: canonicalSlug.trim() },
    });
  },

  async findBySku(sku: string): Promise<DbProduct | null> {
    const trimmed = sku.trim();
    if (!trimmed) return null;
    return prisma.product.findUnique({ where: { sku: trimmed } });
  },

  async findById(id: string): Promise<DbProduct | null> {
    return prisma.product.findUnique({ where: { id } });
  },

  async resolveByLocalizedSlug(
    localeCode: string,
    slug: string,
  ): Promise<DbProduct | null> {
    const trimmed = slug.trim();
    const loc = localeCode.toLowerCase();

    const localized = await prisma.localizedSlug.findFirst({
      where: {
        entityType: PRODUCT_ENTITY_TYPE,
        localeCode: loc,
        slug: trimmed,
      },
    });
    if (localized) {
      return this.findById(localized.entityId);
    }

    return this.findByCanonicalSlug(trimmed);
  },

  async exists(canonicalSlug: string): Promise<boolean> {
    const row = await prisma.product.findUnique({
      where: { canonicalSlug: canonicalSlug.trim() },
      select: { id: true },
    });
    return row !== null;
  },

  async existsLocalized(localeCode: string, slug: string): Promise<boolean> {
    const row = await this.resolveByLocalizedSlug(localeCode, slug);
    return row !== null;
  },

  async findMany(filter: ProductListFilter): Promise<DbProduct[]> {
    const where: Prisma.ProductWhereInput = {};

    if (filter.brand) where.brand = filter.brand;
    if (filter.category) where.category = filter.category;
    if (filter.status) where.status = filter.status;
    if (filter.stockStatus) where.stockStatus = filter.stockStatus;
    if (filter.search?.trim()) {
      const q = filter.search.trim();
      where.OR = [
        { canonicalSlug: { contains: q } },
        { brand: { contains: q } },
        { sku: { contains: q } },
      ];
    }

    return prisma.product.findMany({
      where,
      skip: filter.skip,
      take: filter.take,
      orderBy: filter.orderBy ?? { canonicalSlug: "asc" },
    });
  },

  async listLocalizedSlugs(localeCode: string): Promise<string[]> {
    const loc = localeCode.toLowerCase();
    const rows = await prisma.localizedSlug.findMany({
      where: { entityType: PRODUCT_ENTITY_TYPE, localeCode: loc },
      select: { slug: true },
      orderBy: { slug: "asc" },
    });
    if (rows.length > 0) {
      return rows.map((r) => r.slug);
    }

    const products = await prisma.product.findMany({
      select: { canonicalSlug: true },
      orderBy: { canonicalSlug: "asc" },
    });
    return products.map((r) => r.canonicalSlug);
  },

  async listPickerEntries(
    localeCode: string,
    limit = 400,
  ): Promise<Array<{ slug: string; canonicalSlug: string; id: string }>> {
    const loc = localeCode.toLowerCase();
    const rows = await prisma.product.findMany({
      select: { id: true, canonicalSlug: true },
      orderBy: { canonicalSlug: "asc" },
      take: limit,
    });

    const slugRows = await prisma.localizedSlug.findMany({
      where: {
        entityType: PRODUCT_ENTITY_TYPE,
        entityId: { in: rows.map((r) => r.id) },
        localeCode: loc,
      },
      select: { entityId: true, slug: true },
    });
    const slugById = new Map(slugRows.map((r) => [r.entityId, r.slug]));

    return rows.map((r) => ({
      id: r.id,
      canonicalSlug: r.canonicalSlug,
      slug: slugById.get(r.id) ?? r.canonicalSlug,
    }));
  },

  async count(): Promise<number> {
    return prisma.product.count();
  },

  async upsert(input: ProductDbWriteInput): Promise<DbProduct> {
    assertProductTableWritable("upsert");
    const canonicalSlug = input.canonicalSlug.trim();
    const create = toDbRow({ ...input, canonicalSlug });
    const update = toDbUpdateData({ ...input, canonicalSlug });

    return prisma.product.upsert({
      where: { canonicalSlug },
      create,
      update,
    });
  },

  async patch(canonicalSlug: string, data: Prisma.ProductUpdateInput): Promise<DbProduct> {
    assertProductTableWritable("patch");
    return prisma.product.update({
      where: { canonicalSlug: canonicalSlug.trim() },
      data,
    });
  },

  async upsertMany(inputs: ProductDbWriteInput[]): Promise<number> {
    let count = 0;
    for (const input of inputs) {
      await this.upsert(input);
      count += 1;
    }
    return count;
  },

  async delete(canonicalSlug: string): Promise<boolean> {
    assertProductTableWritable("delete");
    try {
      await prisma.product.delete({
        where: { canonicalSlug: canonicalSlug.trim() },
      });
      return true;
    } catch {
      return false;
    }
  },

  async updateCollectionSlugs(
    canonicalSlug: string,
    collectionSlugs: string[],
  ): Promise<void> {
    assertProductTableWritable("updateCollectionSlugs");
    await prisma.product.update({
      where: { canonicalSlug: canonicalSlug.trim() },
      data: {
        collectionSlugs: collectionSlugs as Prisma.InputJsonValue,
      },
    });
  },

  async findAll(): Promise<DbProduct[]> {
    return prisma.product.findMany({
      orderBy: { canonicalSlug: "asc" },
    });
  },
};
