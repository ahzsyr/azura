"use client";

import type { Locale } from "@/i18n/routing";
import type { PricingPlanCardViewModel } from "@/view-models/pricing-plan-card";
import {
  PlanCardBody,
  type PricingPlanFeatureView,
} from "@/templates/pricing/plan-card-body";

type BillingPeriod = "monthly" | "yearly";

type Props = {
  viewModel: PricingPlanCardViewModel;
  locale: Locale;
  billing: BillingPeriod;
  features?: PricingPlanFeatureView[];
  highlighted?: boolean;
  className?: string;
};

export function PlanCardTemplate({
  viewModel,
  locale,
  billing,
  features,
  highlighted,
  className,
}: Props) {
  return (
    <PlanCardBody
      viewModel={viewModel}
      locale={locale}
      billing={billing}
      features={features}
      highlighted={highlighted}
      className={className}
    />
  );
}
