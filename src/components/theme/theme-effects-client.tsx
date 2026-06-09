"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useTheme } from "next-themes";
import type { ThemeTokens } from "@/types/theme";
import type { PageVisualSettings } from "@/schemas/visual-settings";
import { resolveVisualExperience } from "@/features/theme/visual-experience-resolver";
import type { ResolvedVisualExperience } from "@/features/theme/visual-experience-resolver";
import { applyVisualEffects } from "@/features/theme/effects-runtime";
import { useResolvedVisualExperience } from "@/components/theme/visual-experience-context";
import {
  applySiteVisualEffects,
  readCursorPreference,
  resolveDomAppearance,
} from "@/features/theme/apply-site-visual-effects";
import {
  buildLiveVisualExperience,
  readStoredPresetEffects,
  THEME_CHANGE_EVENT,
} from "@/features/theme/engine";
import { deferUntilIdle } from "@/lib/performance/defer-until-idle";

type Props = {
  tokens: ThemeTokens | null;
  /** SSR-resolved site experience — avoids client recompute on every render. */
  siteResolved?: ResolvedVisualExperience | null;
  /** Apply effects on mount (theme studio preview without ThemeEngineProvider). */
  applyOnMount?: boolean;
};

function resolveEffectAppearance(resolvedTheme: string | undefined): "light" | "dark" | null {
  if (resolvedTheme === "dark" || resolvedTheme === "light") return resolvedTheme;
  return resolveDomAppearance();
}

export function ThemeEffectsClient({ tokens, siteResolved, applyOnMount = false }: Props) {
  const { resolvedTheme } = useTheme();
  const contextResolved = useResolvedVisualExperience();
  const baseResolved = useMemo(
    () => siteResolved ?? contextResolved ?? null,
    [siteResolved, contextResolved],
  );

  const applyFromStorage = useCallback(() => {
    if (!tokens || !baseResolved) return;
    const appearance = resolveEffectAppearance(resolvedTheme);
    if (!appearance) return;
    applySiteVisualEffects(tokens, baseResolved, appearance, readCursorPreference());
  }, [tokens, baseResolved, resolvedTheme]);

  useEffect(() => {
    if (!applyOnMount) return;
    if (tokens?.animationsEnabled === false && baseResolved) {
      const inactive = (id: string | null | undefined) => !id || id === "none";
      if (
        inactive(baseResolved.cursorEffect) &&
        inactive(baseResolved.backgroundEffect) &&
        inactive(baseResolved.textEffect)
      ) {
        return;
      }
    }
    const cancelIdle = deferUntilIdle(applyFromStorage);
    return cancelIdle;
  }, [applyOnMount, applyFromStorage, tokens?.animationsEnabled, baseResolved]);

  useEffect(() => {
    const onThemeChange = () => {
      document.documentElement.classList.add("theme-transitioning");
      deferUntilIdle(() => {
        applyFromStorage();
        window.setTimeout(() => {
          document.documentElement.classList.remove("theme-transitioning");
        }, 400);
      });
    };

    window.addEventListener(THEME_CHANGE_EVENT, onThemeChange);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, onThemeChange);
  }, [applyFromStorage]);

  return null;
}

type PageProps = {
  site: ThemeTokens;
  page: PageVisualSettings;
  siteResolved?: ResolvedVisualExperience | null;
};

export function PageVisualEffects({ site, page, siteResolved }: PageProps) {
  const { resolvedTheme } = useTheme();
  const pageKey = useMemo(() => JSON.stringify(page), [page]);
  const baseSiteResolved = useMemo(
    () => siteResolved ?? resolveVisualExperience({ site }),
    [site, siteResolved],
  );

  useEffect(() => {
    const applyPageEffects = () => {
      const live = readStoredPresetEffects();
      const appearance = resolveEffectAppearance(resolvedTheme) ?? resolveDomAppearance() ?? "light";
      if (live) {
        applyVisualEffects(buildLiveVisualExperience(site, live, readCursorPreference()));
        return;
      }
      applyVisualEffects(resolveVisualExperience({ site, page }));
    };

    const cancelIdle = deferUntilIdle(applyPageEffects);

    const onThemeChange = () => deferUntilIdle(applyPageEffects);
    window.addEventListener(THEME_CHANGE_EVENT, onThemeChange);

    return () => {
      cancelIdle();
      window.removeEventListener(THEME_CHANGE_EVENT, onThemeChange);
      const appearance = resolveDomAppearance() ?? "light";
      applySiteVisualEffects(site, baseSiteResolved, appearance, readCursorPreference());
    };
  }, [
    site,
    page,
    pageKey,
    baseSiteResolved,
    resolvedTheme,
    site.cursorEffect,
    site.backgroundEffect,
    site.textEffect,
    site.cursorEffectEnabled,
    site.backgroundEffectEnabled,
    site.textEffectEnabled,
    site.animationsEnabled,
    site.cardStyle,
    site.borderStyle,
  ]);

  return null;
}
