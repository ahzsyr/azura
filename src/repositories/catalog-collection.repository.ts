import { prisma } from "@/lib/prisma";
import type { Collection } from "@/features/collections/types";
import {
  collectionToRow,
  rowToCollection,
} from "@/features/collections/db/catalog-collection-db-mapper";

export const catalogCollectionRepository = {
  async findAllGlobal(): Promise<Collection[]> {
    const rows = await prisma.catalogCollection.findMany({
      orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
    });
    return rows.map(rowToCollection);
  },

  async findBySlug(slug: string): Promise<Collection | null> {
    const row = await prisma.catalogCollection.findUnique({ where: { slug } });
    return row ? rowToCollection(row) : null;
  },

  async upsert(col: Collection, sortOrder = 0): Promise<void> {
    const data = collectionToRow(col, sortOrder);
    await prisma.catalogCollection.upsert({
      where: { slug: col.slug },
      create: data,
      update: {
        parentSlug: data.parentSlug,
        sortOrder: data.sortOrder,
        visible: data.visible,
        conditions: data.conditions,
        metadata: data.metadata,
      },
    });
  },

  /** Update in place, or delete old slug row and create renamed row when slug changes. */
  async replaceCollection(
    originalSlug: string,
    col: Collection,
    sortOrder = 0,
  ): Promise<number> {
    const data = collectionToRow(col, sortOrder);
    if (originalSlug === col.slug) {
      await prisma.catalogCollection.upsert({
        where: { slug: col.slug },
        create: data,
        update: {
          parentSlug: data.parentSlug,
          sortOrder: data.sortOrder,
          visible: data.visible,
          conditions: data.conditions,
          metadata: data.metadata,
        },
      });
      return 0;
    }

    const [reparentResult] = await prisma.$transaction([
      prisma.catalogCollection.updateMany({
        where: { parentSlug: originalSlug },
        data: { parentSlug: col.slug, updatedAt: new Date() },
      }),
      prisma.catalogCollection.delete({ where: { slug: originalSlug } }),
      prisma.catalogCollection.create({ data }),
    ]);
    return reparentResult.count;
  },

  async saveAll(collections: Collection[]): Promise<void> {
    const slugs = collections.map((c) => c.slug);

    for (let i = 0; i < collections.length; i += 1) {
      const col = collections[i];
      const data = collectionToRow(col, i);
      await prisma.catalogCollection.upsert({
        where: { slug: col.slug },
        create: data,
        update: {
          parentSlug: data.parentSlug,
          sortOrder: data.sortOrder,
          visible: data.visible,
          conditions: data.conditions,
          metadata: data.metadata,
        },
      });
    }

    if (slugs.length > 0) {
      await prisma.catalogCollection.deleteMany({
        where: { slug: { notIn: slugs } },
      });
    } else {
      await prisma.catalogCollection.deleteMany();
    }
  },

  async deleteAll(): Promise<void> {
    await prisma.catalogCollection.deleteMany();
  },

  async deleteNotInSlugs(slugs: string[]): Promise<void> {
    if (slugs.length === 0) {
      await prisma.catalogCollection.deleteMany();
      return;
    }
    await prisma.catalogCollection.deleteMany({
      where: { slug: { notIn: slugs } },
    });
  },

  async deleteBySlug(slug: string): Promise<boolean> {
    try {
      await prisma.catalogCollection.delete({ where: { slug } });
      return true;
    } catch {
      return false;
    }
  },
};
