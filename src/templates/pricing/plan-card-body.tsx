"use client";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { pickLocaleField } from "@/features/builder/blocks/content/lib/locale-field";
import type { Locale } from "@/i18n/routing";
import type { PricingPlanCardViewModel } from "@/view-models/pricing-plan-card";
import { getShortLanguageLocale } from "@/shared/layout/direction/direction-utils";

type BillingPeriod = "monthly" | "yearly";

export type PricingPlanFeatureView = {
  id: string;
  label: string;
};

type Props = {
  viewModel: PricingPlanCardViewModel;
  locale: Locale;
  billing: BillingPeriod;
  features?: PricingPlanFeatureView[];
  highlighted?: boolean;
  className?: string;
};

function formatMoney(amount: number, currency: string, locale: Locale) {
  return amount.toLocaleString(getShortLanguageLocale(locale), {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 0,
  });
}

export function PlanCardBody({
  viewModel,
  locale,
  billing,
  features = [],
  highlighted = false,
  className,
}: Props) {
  const price = billing === "yearly" ? viewModel.priceYearly : viewModel.priceMonthly;
  const featureSlice = features.slice(0, 6);
  const defaultCta =
    pickLocaleField(
      { ctaLabelEn: "Get started", ctaLabelAr: "ابدأ" },
      "ctaLabel",
      locale,
    ) ?? "Get started";

  return (
    <article
      className={cn(
        "pb-pricing__card rounded-xl border p-6 flex flex-col min-w-[260px]",
        highlighted && "border-primary ring-2 ring-primary/20 shadow-lg",
        className,
      )}
    >
      {viewModel.badge && (
        <span className="text-xs font-medium text-primary mb-2">{viewModel.badge}</span>
      )}
      <h3 className="font-heading text-xl font-bold">{viewModel.name}</h3>
      <p className="text-sm text-muted-foreground mt-1 flex-1">{viewModel.description}</p>
      <p className="text-3xl font-bold mt-4 tabular-nums">
        {formatMoney(price, viewModel.currency, locale)}
        <span className="text-sm font-normal text-muted-foreground">
          /{billing === "yearly" ? "yr" : "mo"}
        </span>
      </p>
      {featureSlice.length > 0 && (
        <ul className="mt-4 space-y-2 text-sm">
          {featureSlice.map((feature) => (
            <li key={feature.id} className="flex justify-between gap-2">
              <span className="text-muted-foreground">{feature.label}</span>
              <span>{viewModel.featureValues[feature.id] || "✓"}</span>
            </li>
          ))}
        </ul>
      )}
      {viewModel.ctaHref && (
        <Button asChild className="mt-6 w-full" variant={highlighted ? "default" : "outline"}>
          <Link href={viewModel.ctaHref}>{viewModel.ctaLabel || defaultCta}</Link>
        </Button>
      )}
    </article>
  );
}
