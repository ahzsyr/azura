"use client";

import { createContext, useContext } from "react";
import type { PageVisualSettings } from "@/schemas/visual-settings";
import type { ThemeTokens } from "@/types/theme";
import type { ResolvedVisualExperience } from "@/features/theme/visual-experience-resolver";

export type VisualExperienceContextValue = {
  site: ThemeTokens;
  page: PageVisualSettings;
  resolved: ResolvedVisualExperience;
};

export const VisualExperienceContext = createContext<VisualExperienceContextValue | null>(null);

export function useVisualExperience(): VisualExperienceContextValue | null {
  return useContext(VisualExperienceContext);
}

export function useResolvedVisualExperience(): ResolvedVisualExperience | null {
  return useContext(VisualExperienceContext)?.resolved ?? null;
}
