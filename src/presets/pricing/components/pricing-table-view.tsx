"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";
import { pickLocaleField } from "@/features/builder/blocks/content/lib/locale-field";
import { pickLocale } from "@/features/builder/blocks/portal/lib/pick-locale";
import type { PricingPlanSetPublic } from "@/presets/pricing/types";
import type { PackageCardData } from "@/components/packages/package-card";
import { PackageCard } from "@/components/packages/package-card";
import type { CompareCardProps } from "@/features/comparison/get-compare-props";
import type { BlockNode } from "@/types/builder";
import type { BlockOverflowContext } from "@/features/builder/components/marketing-items-overflow";
import { MarketingItemsOverflow } from "@/features/builder/components/marketing-items-overflow";
import { getShortLanguageLocale } from "@/shared/layout/direction/direction-utils";
import type { PricingPlanCardViewModel } from "@/view-models/pricing-plan-card";
import { PlanCardTemplate } from "@/templates/pricing/plan-card-template";
import type { PricingPlanFeatureView } from "@/templates/pricing/plan-card-body";

type BillingPeriod = "monthly" | "yearly";

type TablePlanRow = {
  entityId: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  isHighlighted: boolean;
  featureValues: Record<string, string>;
};

type Props = {
  locale: Locale;
  title?: string;
  source: "packages" | "planSet";
  layout: "cards" | "table" | "comparison";
  showBillingToggle?: boolean;
  defaultBillingPeriod?: BillingPeriod;
  highlightedPlanId?: string;
  /** ViewModel path (plan-set preset resolver). */
  planViewModels?: PricingPlanCardViewModel[];
  features?: PricingPlanFeatureView[];
  currency?: string;
  /** Legacy fallback during migration. */
  planSet?: PricingPlanSetPublic | null;
  packages?: PackageCardData[];
  packageCompare?: CompareCardProps;
  block?: BlockNode;
  overflow?: BlockOverflowContext;
};

function formatMoney(amount: number, currency: string, locale: Locale) {
  return amount.toLocaleString(getShortLanguageLocale(locale), {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 0,
  });
}

function isPlanHighlighted(planId: string, highlightedPlanId: string, isHighlighted: boolean) {
  return highlightedPlanId === planId || isHighlighted;
}

export function PricingTableView({
  locale,
  title,
  source,
  layout = "cards",
  showBillingToggle = true,
  defaultBillingPeriod = "monthly",
  highlightedPlanId = "",
  planViewModels,
  features = [],
  currency = "USD",
  planSet,
  packages = [],
  packageCompare,
  block,
  overflow,
}: Props) {
  const [billing, setBilling] = useState<BillingPeriod>(defaultBillingPeriod);

  if (source === "packages") {
    const cards = (
      <>
        {packages.map((pkg) => (
          <PackageCard key={pkg.id} pkg={pkg} locale={locale} compare={packageCompare} />
        ))}
      </>
    );
    return (
      <div className={cn("pb-pricing", `pb-pricing--${layout}`)}>
        {title && <h2 className="pb-pricing__title font-heading text-2xl font-bold mb-8">{title}</h2>}
        {block && overflow ? (
          <MarketingItemsOverflow
            block={block}
            overflowFlags={overflow.flags}
            previewDevice={overflow.previewDevice}
            items={packages}
            columns={3}
            useSimpleSliderTrack={false}
            gridClassName="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
            getItemKey={(pkg) => pkg.id}
            renderItem={(pkg) => (
              <PackageCard pkg={pkg} locale={locale} compare={packageCompare} />
            )}
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{cards}</div>
        )}
      </div>
    );
  }

  const useViewModelPath = Boolean(planViewModels && planViewModels.length > 0);
  const legacyPlanSet = !useViewModelPath ? planSet : null;

  if (!useViewModelPath && (!legacyPlanSet || legacyPlanSet.plans.length === 0)) {
    return null;
  }

  const tablePlans: TablePlanRow[] = useViewModelPath
    ? planViewModels!.map((plan) => ({
        entityId: plan.entityId,
        name: plan.name,
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
        isHighlighted: plan.isHighlighted,
        featureValues: plan.featureValues,
      }))
    : legacyPlanSet!.plans.map((plan) => ({
        entityId: plan.id,
        name: pickLocale(plan, "name", locale),
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
        isHighlighted: plan.isHighlighted,
        featureValues: Object.fromEntries(
          Object.entries(plan.featureValues).map(([key, value]) => [key, String(value ?? "")]),
        ),
      }));

  const tableFeatures = useViewModelPath
    ? features
    : legacyPlanSet!.features.map((feature) => ({
        id: feature.id,
        label: pickLocale(feature, "label", locale),
      }));

  const tableCurrency = useViewModelPath ? currency : legacyPlanSet!.currency;

  const renderPlanCard = (plan: PricingPlanCardViewModel) => (
    <PlanCardTemplate
      key={plan.entityId}
      viewModel={plan}
      locale={locale}
      billing={billing}
      features={tableFeatures}
      highlighted={isPlanHighlighted(plan.entityId, highlightedPlanId, plan.isHighlighted)}
    />
  );

  return (
    <div className={cn("pb-pricing", `pb-pricing--${layout}`)}>
      {title && <h2 className="pb-pricing__title font-heading text-2xl font-bold">{title}</h2>}
      {showBillingToggle && (
        <div className="pb-pricing__billing inline-flex rounded-lg border p-1 my-6" role="group">
          {(["monthly", "yearly"] as const).map((period) => (
            <button
              key={period}
              type="button"
              className={cn(
                "px-4 py-1.5 text-sm rounded-md capitalize transition-colors",
                billing === period && "bg-primary text-primary-foreground",
              )}
              onClick={() => setBilling(period)}
            >
              {period}
            </button>
          ))}
        </div>
      )}
      {layout === "table" ? (
        <div className="overflow-x-auto rounded-xl border">
          <table className="pb-pricing__table w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-start p-3">Feature</th>
                {tablePlans.map((plan) => {
                  const highlighted = isPlanHighlighted(
                    plan.entityId,
                    highlightedPlanId,
                    plan.isHighlighted,
                  );
                  return (
                    <th
                      key={plan.entityId}
                      className={cn("p-3 text-center", highlighted && "bg-primary/5")}
                    >
                      {plan.name}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-3 font-medium">Price</td>
                {tablePlans.map((plan) => {
                  const price = billing === "yearly" ? plan.priceYearly : plan.priceMonthly;
                  return (
                    <td key={plan.entityId} className="p-3 text-center font-semibold tabular-nums">
                      {formatMoney(price, tableCurrency, locale)}
                    </td>
                  );
                })}
              </tr>
              {tableFeatures.map((feature) => (
                <tr key={feature.id} className="border-b last:border-0">
                  <td className="p-3">{feature.label}</td>
                  {tablePlans.map((plan) => (
                    <td key={plan.entityId} className="p-3 text-center text-muted-foreground">
                      {String(plan.featureValues[feature.id] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : useViewModelPath && block && overflow ? (
        <MarketingItemsOverflow
          block={block}
          overflowFlags={overflow.flags}
          previewDevice={overflow.previewDevice}
          items={planViewModels!}
          columns={3}
          useSimpleSliderTrack={false}
          gridClassName={cn(
            "pb-pricing__cards gap-6",
            layout === "comparison" ? "grid lg:grid-cols-3" : "grid md:grid-cols-2 lg:grid-cols-3",
          )}
          getItemKey={(plan) => plan.entityId}
          renderItem={(plan) => renderPlanCard(plan)}
        />
      ) : useViewModelPath ? (
        <div
          className={cn(
            "pb-pricing__cards gap-6",
            layout === "comparison" ? "grid lg:grid-cols-3" : "grid md:grid-cols-2 lg:grid-cols-3",
          )}
        >
          {planViewModels!.map((plan) => renderPlanCard(plan))}
        </div>
      ) : block && overflow ? (
        <MarketingItemsOverflow
          block={block}
          overflowFlags={overflow.flags}
          previewDevice={overflow.previewDevice}
          items={legacyPlanSet!.plans}
          columns={3}
          useSimpleSliderTrack={false}
          gridClassName={cn(
            "pb-pricing__cards gap-6",
            layout === "comparison" ? "grid lg:grid-cols-3" : "grid md:grid-cols-2 lg:grid-cols-3",
          )}
          getItemKey={(plan) => plan.id}
          renderItem={(plan) => {
            const price = billing === "yearly" ? plan.priceYearly : plan.priceMonthly;
            const highlighted = isPlanHighlighted(plan.id, highlightedPlanId, plan.isHighlighted);
            return (
              <article
                className={cn(
                  "pb-pricing__card rounded-xl border p-6 flex flex-col min-w-[260px]",
                  highlighted && "border-primary ring-2 ring-primary/20 shadow-lg",
                )}
              >
                {pickLocale(plan, "badge", locale) && (
                  <span className="text-xs font-medium text-primary mb-2">
                    {pickLocale(plan, "badge", locale)}
                  </span>
                )}
                <h3 className="font-heading text-xl font-bold">{pickLocale(plan, "name", locale)}</h3>
                <p className="text-sm text-muted-foreground mt-1 flex-1">
                  {pickLocale(plan, "description", locale)}
                </p>
                <p className="text-3xl font-bold mt-4 tabular-nums">
                  {formatMoney(price, legacyPlanSet!.currency, locale)}
                  <span className="text-sm font-normal text-muted-foreground">
                    /{billing === "yearly" ? "yr" : "mo"}
                  </span>
                </p>
                <ul className="mt-4 space-y-2 text-sm">
                  {legacyPlanSet!.features.slice(0, 6).map((f) => (
                    <li key={f.id} className="flex justify-between gap-2">
                      <span className="text-muted-foreground">{pickLocale(f, "label", locale)}</span>
                      <span>{String(plan.featureValues[f.id] ?? "✓")}</span>
                    </li>
                  ))}
                </ul>
                {plan.ctaHref && (
                  <Button asChild className="mt-6 w-full" variant={highlighted ? "default" : "outline"}>
                    <Link href={plan.ctaHref}>
                      {pickLocale(plan, "ctaLabel", locale) ||
                        pickLocaleField(
                          { ctaLabelEn: "Get started", ctaLabelAr: "ابدأ" },
                          "ctaLabel",
                          locale,
                        )}
                    </Link>
                  </Button>
                )}
              </article>
            );
          }}
        />
      ) : (
        <div
          className={cn(
            "pb-pricing__cards gap-6",
            layout === "comparison" ? "grid lg:grid-cols-3" : "grid md:grid-cols-2 lg:grid-cols-3",
          )}
        >
          {legacyPlanSet!.plans.map((plan) => {
            const price = billing === "yearly" ? plan.priceYearly : plan.priceMonthly;
            const highlighted = isPlanHighlighted(plan.id, highlightedPlanId, plan.isHighlighted);
            return (
              <article
                key={plan.id}
                className={cn(
                  "pb-pricing__card rounded-xl border p-6 flex flex-col",
                  highlighted && "border-primary ring-2 ring-primary/20 shadow-lg",
                )}
              >
                {pickLocale(plan, "badge", locale) && (
                  <span className="text-xs font-medium text-primary mb-2">
                    {pickLocale(plan, "badge", locale)}
                  </span>
                )}
                <h3 className="font-heading text-xl font-bold">{pickLocale(plan, "name", locale)}</h3>
                <p className="text-sm text-muted-foreground mt-1 flex-1">
                  {pickLocale(plan, "description", locale)}
                </p>
                <p className="text-3xl font-bold mt-4 tabular-nums">
                  {formatMoney(price, legacyPlanSet!.currency, locale)}
                  <span className="text-sm font-normal text-muted-foreground">
                    /{billing === "yearly" ? "yr" : "mo"}
                  </span>
                </p>
                <ul className="mt-4 space-y-2 text-sm">
                  {legacyPlanSet!.features.slice(0, 6).map((f) => (
                    <li key={f.id} className="flex justify-between gap-2">
                      <span className="text-muted-foreground">{pickLocale(f, "label", locale)}</span>
                      <span>{String(plan.featureValues[f.id] ?? "✓")}</span>
                    </li>
                  ))}
                </ul>
                {plan.ctaHref && (
                  <Button asChild className="mt-6 w-full" variant={highlighted ? "default" : "outline"}>
                    <Link href={plan.ctaHref}>
                      {pickLocale(plan, "ctaLabel", locale) ||
                        pickLocaleField(
                          { ctaLabelEn: "Get started", ctaLabelAr: "ابدأ" },
                          "ctaLabel",
                          locale,
                        )}
                    </Link>
                  </Button>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
