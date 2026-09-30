"use client";

import { useMemo, type ReactNode } from "react";
import type { PageVisualSettings } from "@/schemas/visual-settings";
import type { ThemeTokens } from "@/types/theme";
import {
  resolveVisualExperience,
  type ResolvedVisualExperience,
} from "@/features/theme/visual-experience-resolver";
import {
  VisualExperienceContext,
  VisualExperienceStaticContext,
} from "@/components/theme/visual-experience-context";
import { VisualExperienceSync } from "@/components/theme/theme-effects-client";

type Props = {
  site: ThemeTokens | null;
  page?: PageVisualSettings | null;
  /** Pre-resolved site experience from ThemeProvider (avoids client recompute). */
  siteResolved?: ResolvedVisualExperience | null;
  /**
   * When false, suppresses the nested VisualExperienceSync so this provider
   * only exposes context without making global DOM mutations. Set to false on
   * CMS/content page renderers to prevent their raw-token sync from conflicting
   * with the layout-level global applier. Defaults to true.
   */
  syncGlobally?: boolean;
  children: ReactNode;
};

export function VisualExperienceProvider({ site, page, siteResolved, syncGlobally = true, children }: Props) {
  const value = useMemo(() => {
    if (!site) return null;
    const pageSettings = page ?? {};
    return {
      site,
      page: pageSettings,
      resolved:
        siteResolved ?? resolveVisualExperience({ site, page: pageSettings }),
    };
  }, [site, page, siteResolved]);

  if (!value) {
    return <>{children}</>;
  }

  return (
    <VisualExperienceStaticContext.Provider value={value.resolved}>
      <VisualExperienceContext.Provider value={value}>
        {syncGlobally && <VisualExperienceSync />}
        {children}
      </VisualExperienceContext.Provider>
    </VisualExperienceStaticContext.Provider>
  );
}
