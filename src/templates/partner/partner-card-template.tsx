"use client";

import type { Locale } from "@/i18n/routing";
import type { PartnerCardViewModel } from "@/view-models/partner-card";
import { PartnerCardBody } from "@/templates/partner/partner-card-body";

type Props = {
  viewModel: PartnerCardViewModel;
  locale: Locale;
  className?: string;
};

export function PartnerCardTemplate({ viewModel, locale, className }: Props) {
  return <PartnerCardBody viewModel={viewModel} locale={locale} className={className} />;
}
