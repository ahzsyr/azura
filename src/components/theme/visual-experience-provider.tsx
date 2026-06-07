"use client";

import { useMemo, type ReactNode } from "react";
import type { PageVisualSettings } from "@/schemas/visual-settings";
import type { ThemeTokens } from "@/types/theme";
import { resolveVisualExperience } from "@/features/theme/visual-experience-resolver";
import { VisualExperienceContext } from "@/components/theme/visual-experience-context";

type Props = {
  site: ThemeTokens | null;
  page?: PageVisualSettings | null;
  children: ReactNode;
};

export function VisualExperienceProvider({ site, page, children }: Props) {
  const value = useMemo(() => {
    if (!site) return null;
    const pageSettings = page ?? {};
    return {
      site,
      page: pageSettings,
      resolved: resolveVisualExperience({ site, page: pageSettings }),
    };
  }, [site, page]);

  if (!value) {
    return <>{children}</>;
  }

  return (
    <VisualExperienceContext.Provider value={value}>{children}</VisualExperienceContext.Provider>
  );
}
