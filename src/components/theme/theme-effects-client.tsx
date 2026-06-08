"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import type { ThemeTokens } from "@/types/theme";
import type { PageVisualSettings } from "@/schemas/visual-settings";
import { resolveVisualExperience } from "@/features/theme/visual-experience-resolver";
import { applyVisualEffects, visualEffectsEngine } from "@/features/theme/effects-runtime";
import { useResolvedVisualExperience } from "@/components/theme/visual-experience-context";
import {
  buildLiveVisualExperience,
  readStoredPresetEffects,
  restorePresetColorsFromStorage,
  THEME_CHANGE_EVENT,
} from "@/features/theme/engine";
import { CURSOR_PREF_STORAGE_KEY } from "@/features/theme/engine/constants";
import { deferUntilIdle } from "@/lib/performance/defer-until-idle";

type Props = {
  tokens: ThemeTokens | null;
};

function readCursorPreference(): "custom" | "normal" {
  try {
    const pref = localStorage.getItem(CURSOR_PREF_STORAGE_KEY);
    return pref === "normal" ? "normal" : "custom";
  } catch {
    return "custom";
  }
}

function resolveEffectAppearance(resolvedTheme: string | undefined): "light" | "dark" | null {
  if (resolvedTheme === "dark" || resolvedTheme === "light") return resolvedTheme;
  if (typeof document === "undefined") return null;
  const fromDom = document.documentElement.dataset.theme;
  if (fromDom === "dark" || fromDom === "light") return fromDom;
  return null;
}

export function ThemeEffectsClient({ tokens }: Props) {
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  const contextResolved = useResolvedVisualExperience();
  const siteResolved =
    contextResolved ?? (tokens ? resolveVisualExperience({ site: tokens }) : null);
  const effectAppearance = resolveEffectAppearance(resolvedTheme);

  useEffect(() => {
    if (!siteResolved || !tokens || !effectAppearance) return;

    const apply = () => {
      const mode = resolveEffectAppearance(resolvedTheme) ?? effectAppearance;
      restorePresetColorsFromStorage(mode);
      const live = readStoredPresetEffects();
      const experience = live
        ? buildLiveVisualExperience(tokens, live, readCursorPreference())
        : siteResolved;
      applyVisualEffects(experience);
    };

    const cancelIdle = deferUntilIdle(apply);

    const onThemeChange = () => {
      document.documentElement.classList.add("theme-transitioning");
      deferUntilIdle(() => {
        apply();
        window.setTimeout(() => {
          document.documentElement.classList.remove("theme-transitioning");
        }, 400);
      });
    };

    window.addEventListener(THEME_CHANGE_EVENT, onThemeChange);

    return () => {
      cancelIdle();
      window.removeEventListener(THEME_CHANGE_EVENT, onThemeChange);
      visualEffectsEngine.destroy();
    };
  }, [
    tokens,
    siteResolved,
    effectAppearance,
    resolvedTheme,
    siteResolved?.cursorEffect,
    siteResolved?.backgroundEffect,
    siteResolved?.textEffect,
    siteResolved?.animationsEnabled,
    siteResolved?.cardStyle,
  ]);

  useEffect(() => {
    return () => {
      visualEffectsEngine.destroy();
    };
  }, [pathname]);

  return null;
}

type PageProps = {
  site: ThemeTokens;
  page: PageVisualSettings;
};

export function PageVisualEffects({ site, page }: PageProps) {
  const pathname = usePathname();
  const pageKey = JSON.stringify(page);

  useEffect(() => {
    const resolveExperience = () => {
      const live = readStoredPresetEffects();
      if (live) {
        return buildLiveVisualExperience(site, live, readCursorPreference());
      }
      return resolveVisualExperience({ site, page });
    };

    const apply = () => {
      applyVisualEffects(resolveExperience());
    };

    const cancelIdle = deferUntilIdle(apply);

    const onThemeChange = () => deferUntilIdle(apply);
    window.addEventListener(THEME_CHANGE_EVENT, onThemeChange);

    return () => {
      cancelIdle();
      window.removeEventListener(THEME_CHANGE_EVENT, onThemeChange);
      visualEffectsEngine.destroy();
    };
  }, [
    site.cursorEffect,
    site.backgroundEffect,
    site.textEffect,
    site.cursorEffectEnabled,
    site.backgroundEffectEnabled,
    site.textEffectEnabled,
    site.animationsEnabled,
    site.cardStyle,
    site.borderStyle,
    pageKey,
  ]);

  useEffect(() => {
    return () => {
      visualEffectsEngine.destroy();
    };
  }, [pathname]);

  return null;
}
