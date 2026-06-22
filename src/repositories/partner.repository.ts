import "server-only";

import { prisma } from "@/lib/prisma";

export const partnerRepository = {
  findProgram(slug: string, publishedOnly: boolean) {
    return prisma.partnerProgram.findFirst({
      where: {
        slug,
        ...(publishedOnly ? { isPublished: true } : {}),
      },
      select: { id: true, slug: true },
    });
  },

  findPartners(input: {
    programId: string;
    publishedOnly: boolean;
    collectionSlug?: string;
  }) {
    return prisma.partner.findMany({
      where: {
        programId: input.programId,
        ...(input.publishedOnly ? { isPublished: true } : {}),
        ...(input.collectionSlug ? { category: { slug: input.collectionSlug } } : {}),
      },
      orderBy: { sortOrder: "asc" },
      include: { category: { select: { slug: true } } },
    });
  },

  findPartnerById(id: string) {
    return prisma.partner.findUnique({
      where: { id },
      include: {
        category: { select: { slug: true } },
        program: { select: { slug: true, isPublished: true } },
      },
    });
  },

  findCategories(programId: string) {
    return prisma.partnerCategory.findMany({
      where: { programId },
      orderBy: { sortOrder: "asc" },
    });
  },
};
