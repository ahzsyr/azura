"use client";

import type { ContentPresetCardViewModel } from "@/view-models/content-preset-card";
import { ContentPresetCardBody } from "@/templates/content-preset/content-preset-card-body";

type Props = {
  viewModel: ContentPresetCardViewModel;
  locale?: string;
  className?: string;
};

export function ContentPresetCardTemplate({ viewModel, locale = "en", className }: Props) {
  return <ContentPresetCardBody viewModel={viewModel} locale={locale} className={className} />;
}
