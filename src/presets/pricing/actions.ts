"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
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

const ADMIN_BASE = "/admin/pricing-plans";

function revalidatePricingPlanPaths(slug?: string, id?: string) {
  revalidateMarketingHome();
  revalidatePath(ADMIN_BASE);
  revalidatePath(`${ADMIN_BASE}/new`);
  if (id) revalidatePath(`${ADMIN_BASE}/${id}`);
  if (slug) revalidatePath(`/pricing/${slug}`);
}

export async function upsertPricingPlanSet(formData: FormData) {
  await requireAdmin();
  const enabledLocales = await localeService.listEnabled();
  const id = (formData.get("id") as string | null) || undefined;
  const titleForSlug = getDefaultLocaleFieldFromForm(formData, enabledLocales, "title");
  const slugInput = (formData.get("slug") as string | null)?.trim();
  const slug = slugInput
    ? await uniqueSlug(prisma.pricingPlanSet, slugInput, id, "pricing")
    : await uniqueSlug(prisma.pricingPlanSet, titleForSlug, id, "pricing");

  const data = {
    slug,
    currency: ((formData.get("currency") as string) || "USD").slice(0, 3),
    isPublished: checkboxValue(formData.get("isPublished")),
    sortOrder: Number(formData.get("sortOrder") ?? 0),
  };

  const planSet =
    id != null
      ? await prisma.pricingPlanSet.update({ where: { id }, data })
      : await prisma.pricingPlanSet.create({
          data: {
            ...data,
            sortOrder: data.sortOrder || (await prisma.pricingPlanSet.count()),
          },
        });

  await syncEntityTranslationsFromForm(formData, "PricingPlanSet", planSet.id, enabledLocales);

  const plans = parseChildrenJson(formData.get("plansJson"));
  const features = parseChildrenJson(formData.get("featuresJson"));
  const keptPlanIds = new Set<string>();
  const keptFeatureIds = new Set<string>();

  for (let i = 0; i < plans.length; i++) {
    const row = plans[i];
    const planId = str(row.id);
    const planData = {
      planSetId: planSet.id,
      priceMonthly: new Prisma.Decimal(num(row.priceMonthly)),
      priceYearly: new Prisma.Decimal(num(row.priceYearly)),
      discountPercent: num(row.discountPercent),
      isHighlighted: bool(row.isHighlighted),
      ctaHref: str(row.ctaHref, "/contact"),
      featureValues: (row.featureValues as Prisma.InputJsonValue) ?? {},
      isPublished: bool(row.isPublished, true),
      sortOrder: num(row.sortOrder, i),
    };
    const plan =
      planId != null
        ? await prisma.pricingPlan.update({ where: { id: planId }, data: planData })
        : await prisma.pricingPlan.create({ data: planData });
    keptPlanIds.add(plan.id);
    await syncLegacyJsonRowTranslations("PricingPlan", plan.id, row, enabledLocales);
  }

  await prisma.pricingPlan.deleteMany({
    where: { planSetId: planSet.id, id: { notIn: [...keptPlanIds] } },
  });

  for (let i = 0; i < features.length; i++) {
    const row = features[i];
    const featureId = str(row.id);
    const featureData = {
      planSetId: planSet.id,
      sortOrder: num(row.sortOrder, i),
    };
    const feature =
      featureId != null
        ? await prisma.pricingPlanFeature.update({ where: { id: featureId }, data: featureData })
        : await prisma.pricingPlanFeature.create({ data: featureData });
    keptFeatureIds.add(feature.id);
    await syncLegacyJsonRowTranslations("PricingPlanFeature", feature.id, row, enabledLocales);
  }

  await prisma.pricingPlanFeature.deleteMany({
    where: { planSetId: planSet.id, id: { notIn: [...keptFeatureIds] } },
  });

  revalidatePricingPlanPaths(planSet.slug, planSet.id);
  return planSet;
}

export async function deletePricingPlanSet(id: string) {
  await requireAdmin();
  const row = await prisma.pricingPlanSet.findUnique({
    where: { id },
    select: { slug: true },
  });
  await prisma.pricingPlanSet.delete({ where: { id } });
  revalidatePricingPlanPaths(row?.slug, id);
}

export async function togglePricingPlanSetPublished(id: string, isPublished: boolean) {
  await requireAdmin();
  const row = await prisma.pricingPlanSet.update({
    where: { id },
    data: { isPublished },
    select: { slug: true, id: true },
  });
  revalidatePricingPlanPaths(row.slug, id);
}

export async function reorderPricingPlanSets(ids: string[]) {
  await requireAdmin();
  await prisma.$transaction(
    ids.map((setId, index) =>
      prisma.pricingPlanSet.update({ where: { id: setId }, data: { sortOrder: index } })
    )
  );
  revalidatePricingPlanPaths();
}
