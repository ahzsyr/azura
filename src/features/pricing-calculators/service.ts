import { prisma } from "@/lib/prisma";
import {
  loadBundleForRefs,
  localizedField,
  type EntityRef,
} from "@/features/portal/lib/portal-translation";
import type { PricingCalculatorAdmin, PricingCalculatorPublic } from "./types";

function toNumber(value: { toString(): string } | number | null | undefined): number {
  if (value == null) return 0;
  return Number(value);
}

function parseOptions(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function collectCalculatorRefs(row: {
  id: string;
  fields: { id: string }[];
}): EntityRef[] {
  return [
    { entityType: "PricingCalculator", entityId: row.id },
    ...row.fields.map((f) => ({ entityType: "PricingCalculatorField", entityId: f.id })),
  ];
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

    const bundle = await loadBundleForRefs(collectCalculatorRefs(row));

    return {
      id: row.id,
      slug: row.slug,
      title: localizedField(bundle, "PricingCalculator", row.id, "title"),
      description: localizedField(bundle, "PricingCalculator", row.id, "description"),
      currency: row.currency,
      basePrice: toNumber(row.basePrice),
      fields: row.fields.map((f) => ({
        id: f.id,
        key: f.key,
        label: localizedField(bundle, "PricingCalculatorField", f.id, "label"),
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
    const bundle = await loadBundleForRefs(
      rows.map((row) => ({ entityType: "PricingCalculator", entityId: row.id }))
    );
    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: localizedField(bundle, "PricingCalculator", row.id, "title"),
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
