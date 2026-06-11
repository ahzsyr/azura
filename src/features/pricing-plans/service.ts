import { prisma } from "@/lib/prisma";
import type { PricingPlanSetAdmin, PricingPlanSetPublic } from "./types";

function decimalToNumber(value: { toString(): string } | number | null | undefined): number {
  if (value == null) return 0;
  return Number(value);
}

function mapPlan(row: {
  id: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  priceMonthly: { toString(): string };
  priceYearly: { toString(): string };
  discountPercent: number;
  badgeEn: string;
  badgeAr: string;
  isHighlighted: boolean;
  ctaLabelEn: string;
  ctaLabelAr: string;
  ctaHref: string;
  featureValues: unknown;
}): PricingPlanSetPublic["plans"][number] {
  return {
    id: row.id,
    nameEn: row.nameEn,
    nameAr: row.nameAr,
    descriptionEn: row.descriptionEn,
    descriptionAr: row.descriptionAr,
    priceMonthly: decimalToNumber(row.priceMonthly),
    priceYearly: decimalToNumber(row.priceYearly),
    discountPercent: row.discountPercent,
    badgeEn: row.badgeEn,
    badgeAr: row.badgeAr,
    isHighlighted: row.isHighlighted,
    ctaLabelEn: row.ctaLabelEn,
    ctaLabelAr: row.ctaLabelAr,
    ctaHref: row.ctaHref,
    featureValues:
      row.featureValues && typeof row.featureValues === "object"
        ? (row.featureValues as Record<string, unknown>)
        : {},
  };
}

export const pricingPlanSetService = {
  async getBySlug(slug: string): Promise<PricingPlanSetPublic | null> {
    const row = await prisma.pricingPlanSet.findFirst({
      where: { slug, isPublished: true },
      include: {
        plans: {
          where: { isPublished: true },
          orderBy: { sortOrder: "asc" },
        },
        features: { orderBy: { sortOrder: "asc" } },
      },
    });
    if (!row) return null;
    return {
      id: row.id,
      slug: row.slug,
      titleEn: row.titleEn,
      titleAr: row.titleAr,
      descriptionEn: row.descriptionEn,
      descriptionAr: row.descriptionAr,
      currency: row.currency,
      plans: row.plans.map(mapPlan),
      features: row.features.map((f) => ({
        id: f.id,
        labelEn: f.labelEn,
        labelAr: f.labelAr,
      })),
    };
  },

  async listForAdmin(): Promise<PricingPlanSetAdmin[]> {
    const rows = await prisma.pricingPlanSet.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        _count: { select: { plans: true, features: true } },
      },
    });
    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      titleEn: row.titleEn,
      titleAr: row.titleAr,
      descriptionEn: row.descriptionEn,
      descriptionAr: row.descriptionAr,
      currency: row.currency,
      sortOrder: row.sortOrder,
      isPublished: row.isPublished,
      planCount: row._count.plans,
      featureCount: row._count.features,
    }));
  },

  async getByIdForAdmin(id: string) {
    return prisma.pricingPlanSet.findUnique({
      where: { id },
      include: {
        plans: { orderBy: { sortOrder: "asc" } },
        features: { orderBy: { sortOrder: "asc" } },
      },
    });
  },
};
