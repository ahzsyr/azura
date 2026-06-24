import { prisma } from "@/lib/prisma";
import { jsonStoreRepository } from "@/repositories/json-store.repository";
import { BROWSABLE_TABLES, SCHEMA_MODELS, type BrowsableTableKey } from "./constants";
import type { DatabaseOverview, SchemaModelInfo } from "./types";

export const databaseService = {
  async getOverview(): Promise<DatabaseOverview> {
    const [
      jsonEntries,
      namespaces,
      contentItems,
      inquiries,
      cmsPages,
      posts,
      media,
      users,
      contentTypes,
      faqItems,
      faqSets,
      testimonials,
      searchDocs,
    ] = await Promise.all([
      jsonStoreRepository.count(),
      jsonStoreRepository.listNamespaces(),
      prisma.contentItem.count({ where: { deletedAt: null } }),
      prisma.inquiry.count(),
      prisma.cmsPage.count(),
      prisma.post.count(),
      prisma.mediaAsset.count(),
      prisma.user.count(),
      prisma.contentType.count(),
      prisma.faqItem.count(),
      prisma.faqSet.count(),
      prisma.testimonial.count(),
      prisma.searchDocument.count(),
    ]);

    const counts: [string, number][] = [
      ["contentItems", contentItems],
      ["inquiries", inquiries],
      ["cmsPages", cmsPages],
      ["posts", posts],
      ["media", media],
      ["users", users],
      ["contentTypes", contentTypes],
      ["faqItems", faqItems],
      ["faqSets", faqSets],
      ["testimonials", testimonials],
      ["searchDocs", searchDocs],
    ];

    return {
      jsonEntries,
      namespaces: namespaces.map((n) => ({ name: n.namespace, count: n._count.id })),
      relationalCounts: Object.fromEntries(counts),
    };
  },

  async getSchemaInspector(): Promise<SchemaModelInfo[]> {
    const overview = await this.getOverview();
    const countByLabel: Record<string, number> = {
      ContentItem: overview.relationalCounts.contentItems ?? 0,
      ContentType: overview.relationalCounts.contentTypes ?? 0,
      Inquiry: overview.relationalCounts.inquiries ?? 0,
      CmsPage: overview.relationalCounts.cmsPages ?? 0,
      Post: overview.relationalCounts.posts ?? 0,
      MediaAsset: overview.relationalCounts.media ?? 0,
      User: overview.relationalCounts.users ?? 0,
      FaqItem: overview.relationalCounts.faqItems ?? 0,
      FaqSet: overview.relationalCounts.faqSets ?? 0,
      Testimonial: overview.relationalCounts.testimonials ?? 0,
      SearchDocument: overview.relationalCounts.searchDocs ?? 0,
      JsonStore: overview.jsonEntries,
    };

    return SCHEMA_MODELS.map((m) => ({
      ...m,
      count: countByLabel[m.name],
    }));
  },

  async listBrowsable(table: BrowsableTableKey, page = 1, pageSize = 20) {
    const config = BROWSABLE_TABLES[table];
    const skip = (page - 1) * pageSize;
    const query = { skip, take: pageSize, orderBy: { updatedAt: "desc" as const } };

    switch (table) {
      case "FaqItem": {
        const [items, total] = await Promise.all([
          prisma.faqItem.findMany({
            ...query,
            include: { faqSet: { select: { id: true, slug: true } } },
          }),
          prisma.faqItem.count(),
        ]);
        return { items, total, config };
      }
      case "FaqSet": {
        const [items, total] = await Promise.all([
          prisma.faqSet.findMany({
            ...query,
            include: { _count: { select: { items: true } } },
          }),
          prisma.faqSet.count(),
        ]);
        return { items, total, config };
      }
      case "Testimonial": {
        const [items, total] = await Promise.all([
          prisma.testimonial.findMany(query),
          prisma.testimonial.count(),
        ]);
        return { items, total, config };
      }
      case "Gallery": {
        const [items, total] = await Promise.all([
          prisma.gallery.findMany(query),
          prisma.gallery.count(),
        ]);
        return { items, total, config };
      }
      case "ContentItem": {
        const [items, total] = await Promise.all([
          prisma.contentItem.findMany({
            ...query,
            include: { contentType: { select: { slug: true } } },
          }),
          prisma.contentItem.count(),
        ]);
        return { items, total, config };
      }
      case "ContentType": {
        const [items, total] = await Promise.all([
          prisma.contentType.findMany(query),
          prisma.contentType.count(),
        ]);
        return { items, total, config };
      }
      case "ContentCollection": {
        const [items, total] = await Promise.all([
          prisma.contentCollection.findMany({
            ...query,
            include: { contentType: { select: { slug: true } } },
          }),
          prisma.contentCollection.count(),
        ]);
        return { items, total, config };
      }
      default:
        return { items: [], total: 0, config };
    }
  },

  async getBrowsableRecord(table: BrowsableTableKey, id: string) {
    switch (table) {
      case "FaqItem":
        return prisma.faqItem.findUnique({
          where: { id },
          include: { faqSet: { select: { slug: true } } },
        });
      case "FaqSet":
        return prisma.faqSet.findUnique({
          where: { id },
          include: { _count: { select: { items: true } } },
        });
      case "Testimonial":
        return prisma.testimonial.findUnique({ where: { id } });
      case "Gallery":
        return prisma.gallery.findUnique({ where: { id } });
      case "ContentItem":
        return prisma.contentItem.findUnique({
          where: { id },
          include: { contentType: { select: { slug: true } } },
        });
      case "ContentType":
        return prisma.contentType.findUnique({ where: { id } });
      case "ContentCollection":
        return prisma.contentCollection.findUnique({
          where: { id },
          include: { contentType: { select: { slug: true } } },
        });
      default:
        return null;
    }
  },
};
