import { prisma } from "@/lib/prisma";
import type { PricingCalculatorAdmin, PricingCalculatorPublic } from "./types";

function toNumber(value: { toString(): string } | number | null | undefined): number {
  if (value == null) return 0;
  return Number(value);
}

function parseOptions(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export const pricingCalculatorService = {
  async getBySlug(slug: string): Promise<PricingCalculatorPublic | null> {
    const row = await prisma.pricingCalculator.findFirst({
      where: { slug, isPublished: true },
      include: {
        fields: { orderBy: { sortOrder: "asc" } },
        rules: { orderBy: { sortOrder: "asc" } },
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
      basePrice: toNumber(row.basePrice),
      fields: row.fields.map((f) => ({
        id: f.id,
        key: f.key,
        labelEn: f.labelEn,
        labelAr: f.labelAr,
        fieldType: f.fieldType,
        options: parseOptions(f.options),
        defaultValue: f.defaultValue,
      })),
      rules: row.rules.map((r) => ({
        id: r.id,
        fieldKey: r.fieldKey,
        operator: r.operator,
        value: r.value,
        priceDelta: toNumber(r.priceDelta),
        multiplier: toNumber(r.multiplier),
      })),
    };
  },

  async listForAdmin(): Promise<PricingCalculatorAdmin[]> {
    const rows = await prisma.pricingCalculator.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { fields: true, rules: true } } },
    });
    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      titleEn: row.titleEn,
      titleAr: row.titleAr,
      sortOrder: row.sortOrder,
      isPublished: row.isPublished,
      fieldCount: row._count.fields,
      ruleCount: row._count.rules,
    }));
  },

  async getByIdForAdmin(id: string) {
    return prisma.pricingCalculator.findUnique({
      where: { id },
      include: {
        fields: { orderBy: { sortOrder: "asc" } },
        rules: { orderBy: { sortOrder: "asc" } },
      },
    });
  },
};
