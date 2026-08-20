"use server";

import { revalidatePath } from "next/cache";
import { Prisma, PricingCalculatorFieldType } from "@prisma/client";
import { requireAdmin } from "@/features/auth/guards";
import { uniqueSlug } from "@/features/portal/lib/unique-slug";
import { parseChildrenJson, str, num, bool } from "@/features/portal/lib/parse-children-json";
import { checkboxValue } from "@/features/portal/lib/action-helpers";
import { syncLegacyJsonRowTranslations } from "@/features/portal/lib/portal-translation";
import { revalidateMarketingHome } from "@/services/cache";
import { localeService } from "@/features/i18n/locale.service";
import { getDefaultLocaleFieldFromForm } from "@/features/translation/form-sync";
import { syncEntityTranslationsFromForm } from "@/features/translation/form-sync.server";
import { prisma } from "@/lib/prisma";

const ADMIN_BASE = "/admin/pricing-calculators";

function revalidateCalculatorPaths(slug?: string, id?: string) {
  revalidateMarketingHome();
  revalidatePath(ADMIN_BASE);
  revalidatePath(`${ADMIN_BASE}/new`);
  if (id) revalidatePath(`${ADMIN_BASE}/${id}`);
  if (slug) revalidatePath(`/calculator/${slug}`);
}

export async function upsertPricingCalculator(formData: FormData) {
  await requireAdmin();
  const enabledLocales = await localeService.listEnabled();
  const id = (formData.get("id") as string | null) || undefined;
  const titleForSlug = getDefaultLocaleFieldFromForm(formData, enabledLocales, "title");
  const slugInput = (formData.get("slug") as string | null)?.trim();
  const slug = slugInput
    ? await uniqueSlug(prisma.pricingCalculator, slugInput, id, "calculator")
    : await uniqueSlug(prisma.pricingCalculator, titleForSlug, id, "calculator");

  const data = {
    slug,
    currency: ((formData.get("currency") as string) || "USD").slice(0, 3),
    basePrice: new Prisma.Decimal(num(formData.get("basePrice"))),
    isPublished: checkboxValue(formData.get("isPublished")),
    sortOrder: Number(formData.get("sortOrder") ?? 0),
  };

  const calculator =
    id != null
      ? await prisma.pricingCalculator.update({ where: { id }, data })
      : await prisma.pricingCalculator.create({
          data: {
            ...data,
            sortOrder: data.sortOrder || (await prisma.pricingCalculator.count()),
          },
        });

  await syncEntityTranslationsFromForm(formData, "PricingCalculator", calculator.id, enabledLocales);

  const fields = parseChildrenJson(formData.get("fieldsJson"));
  const rules = parseChildrenJson(formData.get("rulesJson"));
  const keptFieldIds = new Set<string>();
  const keptRuleIds = new Set<string>();

  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    const fieldId = str(row.id);
    const typeRaw = str(row.fieldType, "NUMBER");
    const fieldType = Object.values(PricingCalculatorFieldType).includes(
      typeRaw as PricingCalculatorFieldType
    )
      ? (typeRaw as PricingCalculatorFieldType)
      : PricingCalculatorFieldType.NUMBER;
    const fieldData = {
      calculatorId: calculator.id,
      key: str(row.key, `field_${i + 1}`),
      fieldType,
      options: Array.isArray(row.options) ? row.options : [],
      defaultValue: str(row.defaultValue),
      sortOrder: num(row.sortOrder, i),
    };
    const field =
      fieldId != null
        ? await prisma.pricingCalculatorField.update({ where: { id: fieldId }, data: fieldData })
        : await prisma.pricingCalculatorField.create({ data: fieldData });
    keptFieldIds.add(field.id);
    await syncLegacyJsonRowTranslations("PricingCalculatorField", field.id, row, enabledLocales);
  }
  await prisma.pricingCalculatorField.deleteMany({
    where: { calculatorId: calculator.id, id: { notIn: [...keptFieldIds] } },
  });

  for (let i = 0; i < rules.length; i++) {
    const row = rules[i];
    const ruleId = str(row.id);
    const ruleData = {
      calculatorId: calculator.id,
      fieldKey: str(row.fieldKey),
      operator: str(row.operator, "eq"),
      value: str(row.value),
      priceDelta: new Prisma.Decimal(num(row.priceDelta)),
      multiplier: new Prisma.Decimal(num(row.multiplier, 1)),
      sortOrder: num(row.sortOrder, i),
    };
    if (ruleId != null) {
      await prisma.pricingCalculatorRule.update({ where: { id: ruleId }, data: ruleData });
      keptRuleIds.add(ruleId);
    } else {
      const created = await prisma.pricingCalculatorRule.create({ data: ruleData });
      keptRuleIds.add(created.id);
    }
  }
  await prisma.pricingCalculatorRule.deleteMany({
    where: { calculatorId: calculator.id, id: { notIn: [...keptRuleIds] } },
  });

  revalidateCalculatorPaths(calculator.slug, calculator.id);
  return calculator;
}

export async function deletePricingCalculator(id: string) {
  await requireAdmin();
  const row = await prisma.pricingCalculator.findUnique({ where: { id }, select: { slug: true } });
  await prisma.pricingCalculator.delete({ where: { id } });
  revalidateCalculatorPaths(row?.slug, id);
}

export async function togglePricingCalculatorPublished(id: string, isPublished: boolean) {
  await requireAdmin();
  const row = await prisma.pricingCalculator.update({
    where: { id },
    data: { isPublished },
    select: { slug: true, id: true },
  });
  revalidateCalculatorPaths(row.slug, id);
}
