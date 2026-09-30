import { prisma } from "@/lib/prisma";
import {
  loadBundleForRefs,
  localizedField,
  type EntityRef,
} from "@/features/portal/lib/portal-translation";
import type { PricingPlanSetAdmin, PricingPlanSetPublic } from "./types";

function decimalToNumber(value: { toString(): string } | number | null | undefined): number {
  if (value == null) return 0;
  return Number(value);
}

function collectPlanSetRefs(row: {
  id: string;
  plans: { id: string }[];
  features: { id: string }[];
}): EntityRef[] {
  return [
    { entityType: "PricingPlanSet", entityId: row.id },
    ...row.plans.map((p) => ({ entityType: "PricingPlan", entityId: p.id })),
    ...row.features.map((f) => ({ entityType: "PricingPlanFeature", entityId: f.id })),
  ];
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

    const bundle = await loadBundleForRefs(collectPlanSetRefs(row));

    return {
      id: row.id,
      slug: row.slug,
      title: localizedField(bundle, "PricingPlanSet", row.id, "title"),
      description: localizedField(bundle, "PricingPlanSet", row.id, "description"),
      currency: row.currency,
      plans: row.plans.map((plan) => ({
        id: plan.id,
        name: localizedField(bundle, "PricingPlan", plan.id, "name"),
        description: localizedField(bundle, "PricingPlan", plan.id, "description"),
        priceMonthly: decimalToNumber(plan.priceMonthly),
        priceYearly: decimalToNumber(plan.priceYearly),
        discountPercent: plan.discountPercent,
        badge: localizedField(bundle, "PricingPlan", plan.id, "badge"),
        isHighlighted: plan.isHighlighted,
        ctaLabel: localizedField(bundle, "PricingPlan", plan.id, "ctaLabel"),
        ctaHref: plan.ctaHref,
        featureValues:
          plan.featureValues && typeof plan.featureValues === "object"
            ? (plan.featureValues as Record<string, unknown>)
            : {},
      })),
      features: row.features.map((f) => ({
        id: f.id,
        label: localizedField(bundle, "PricingPlanFeature", f.id, "label"),
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
    const bundle = await loadBundleForRefs(
      rows.map((row) => ({ entityType: "PricingPlanSet", entityId: row.id }))
    );
    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: localizedField(bundle, "PricingPlanSet", row.id, "title"),
      description: localizedField(bundle, "PricingPlanSet", row.id, "description"),
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
