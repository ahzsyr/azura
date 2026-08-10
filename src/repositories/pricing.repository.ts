import "server-only";

import { prisma } from "@/lib/prisma";

export const pricingRepository = {
  findPlanSet(slug: string, publishedOnly: boolean) {
    return prisma.pricingPlanSet.findFirst({
      where: {
        slug,
        ...(publishedOnly ? { isPublished: true } : {}),
      },
      select: { id: true, slug: true, currency: true },
    });
  },

  findPlans(planSetId: string, publishedOnly: boolean, limit?: number) {
    return prisma.pricingPlan.findMany({
      where: {
        planSetId,
        ...(publishedOnly ? { isPublished: true } : {}),
      },
      orderBy: { sortOrder: "asc" },
      take: limit && limit > 0 ? limit : undefined,
    });
  },

  findPlanById(id: string) {
    return prisma.pricingPlan.findUnique({
      where: { id },
      include: {
        planSet: { select: { slug: true, currency: true, isPublished: true } },
      },
    });
  },

  findPlanFeatures(planSetId: string) {
    return prisma.pricingPlanFeature.findMany({
      where: { planSetId },
      orderBy: { sortOrder: "asc" },
    });
  },
};
