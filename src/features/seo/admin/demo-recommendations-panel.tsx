"use client";

import { useCallback } from "react";
import { SeoSimulationWidget } from "@/features/seo/admin/seo-simulation-widget";
import { simulationService } from "@/features/seo/platform/services/simulation.service";
import type {
  SeoExecutionContext,
  SeoRecommendation,
  ValidationResult,
} from "@/features/seo/platform/types";

type DemoRecommendationsPanelProps = {
  ctx: SeoExecutionContext;
  validation: ValidationResult;
  recommendations: SeoRecommendation[];
};

export function DemoRecommendationsPanel({
  ctx,
  validation,
  recommendations,
}: DemoRecommendationsPanelProps) {
  const project = useCallback(
    (acceptedIds: string[]) =>
      simulationService.project(ctx, {
        current: validation,
        acceptedRecommendationIds: acceptedIds,
        recommendations,
      }),
    [ctx, validation, recommendations]
  );

  return (
    <SeoSimulationWidget
      validation={validation}
      recommendations={recommendations}
      project={project}
    />
  );
}
