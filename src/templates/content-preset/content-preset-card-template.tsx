"use client";

import type { ContentPresetCardViewModel } from "@/view-models/content-preset-card";
import { ContentPresetCardBody } from "@/templates/content-preset/content-preset-card-body";

type Props = {
  viewModel: ContentPresetCardViewModel;
  className?: string;
};

export function ContentPresetCardTemplate({ viewModel, className }: Props) {
  return <ContentPresetCardBody viewModel={viewModel} className={className} />;
}
