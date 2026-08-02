"use client";

import type { EntityCardViewModel } from "@/view-models/entity-card";
import { EntityCardBody } from "@/templates/entity/entity-card-body";

type Props = {
  viewModel: EntityCardViewModel;
  className?: string;
};

export function EntityCardTemplate({ viewModel, className }: Props) {
  return <EntityCardBody viewModel={viewModel} className={className} />;
}
