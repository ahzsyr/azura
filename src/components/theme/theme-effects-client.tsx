"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useTheme } from "next-themes";
import type { ThemeTokens } from "@/types/theme";
import {
  resolveVisitorVisualExperience,
  resolveVisualExperience,
} from "@/features/theme/visual-experience-resolver";
import type { ResolvedVisualExperience } from "@/features/theme/visual-experience-resolver";
import { useVisualExperience, useResolvedVisualExperience } from "@/components/theme/visual-experience-context";
import {
  readStoredPresetEffects,
  restorePresetColorsFromStorage,
  THEME_CHANGE_EVENT,
} from "@/features/theme/engine";
import type { ThemeEngineSnapshot } from "@/features/theme/engine/types";
import { CURSOR_PREF_STORAGE_KEY } from "@/features/theme/engine/constants";
import { deferUntilIdle } from "@/lib/performance/defer-until-idle";
import { SHELL_READY_EVENT, whenShellReady } from "@/lib/motion/shell-ready";
import { scheduleApplyVisualEffects } from "@/features/theme/visual-effects-coordinator";

type Props = {
  tokens: ThemeTokens | null;
  /** SSR-resolved site experience — avoids client recompute on every render. */
  siteResolved?: ResolvedVisualExperience | null;
  /** Apply effects on mount (theme studio preview without ThemeEngineProvider). */
  applyOnMount?: boolean;
  /** Skip shell-ready / idle defer (theme studio preview). */
  immediate?: boolean;
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

function isVisitorThemeBootstrapped(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.dataset.visitorThemeBootstrapped === "true";
}

function isBackgroundLayerMounted(): boolean {
  if (typeof document === "undefined") return false;
  return !!document.querySelector("[data-bg-layer], canvas[data-bg-effect]");
}

export function ThemeEffectsClient({
  tokens,
  siteResolved,
  applyOnMount = true,
  immediate = false,
}: Props) {
  const { resolvedTheme } = useTheme();
  const contextResolved = useResolvedVisualExperience();
  const baseResolved = useMemo(
    () =>
      siteResolved ??
      contextResolved ??
      (tokens ? resolveVisualExperience({ site: tokens }) : null),
    [siteResolved, contextResolved, tokens],
  );
  const effectAppearance = resolveEffectAppearance(resolvedTheme);

  const resolveExperience = useCallback((): ResolvedVisualExperience | null => {
    if (!tokens || !baseResolved) return null;
    return resolveVisitorVisualExperience({
      site: tokens,
      storedEffects: readStoredPresetEffects(),
      cursorPreference: readCursorPreference(),
    });
  }, [tokens, baseResolved]);

  const applyResolved = useCallback(
    (options?: { immediate?: boolean; colorsOnly?: boolean; force?: boolean }) => {
      const appearance = resolveEffectAppearance(resolvedTheme) ?? effectAppearance;
      if (!appearance) return;

      const bootstrapped = isVisitorThemeBootstrapped();
      if (!bootstrapped || options?.colorsOnly) {
        restorePresetColorsFromStorage(appearance);
      }

      const experience = resolveExperience();
      if (!experience) return;
      scheduleApplyVisualEffects(experience, options);
    },
    [resolveExperience, resolvedTheme, effectAppearance],
  );

  useEffect(() => {
    if (!applyOnMount) return;
    if (!baseResolved || !tokens || !effectAppearance) return;

    if (tokens.animationsEnabled === false) {
      const inactive = (id: string | null | undefined) => !id || id === "none";
      if (
        inactive(baseResolved.cursorEffect) &&
        inactive(baseResolved.backgroundEffect) &&
        inactive(baseResolved.textEffect)
      ) {
        return;
      }
    }

    const bootstrapped = isVisitorThemeBootstrapped();
    const bgMounted = isBackgroundLayerMounted();

    if (immediate) {
      applyResolved({ immediate: true });
      return;
    }

    if (!(bootstrapped && bgMounted)) {
      applyResolved({ immediate: true });
    }

    const runOnShellReady = () => {
      if (isVisitorThemeBootstrapped() && isBackgroundLayerMounted()) return;
      applyResolved({ immediate: true });
    };
    const stopShell = whenShellReady(runOnShellReady);
    document.addEventListener(SHELL_READY_EVENT, runOnShellReady);

    return () => {
      stopShell();
      document.removeEventListener(SHELL_READY_EVENT, runOnShellReady);
    };
  }, [
    applyOnMount,
    immediate,
    applyResolved,
    tokens,
    baseResolved,
    effectAppearance,
    resolvedTheme,
    baseResolved?.cursorEffect,
    baseResolved?.backgroundEffect,
    baseResolved?.textEffect,
    baseResolved?.animationsEnabled,
    baseResolved?.cardStyle,
  ]);

  useEffect(() => {
    const onThemeChange = (event: Event) => {
      const detail = (event as CustomEvent<Partial<ThemeEngineSnapshot>>).detail;
      if (detail?.appearanceOnly) return;
      applyResolved({ immediate: true });
    };

    window.addEventListener(THEME_CHANGE_EVENT, onThemeChange);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, onThemeChange);
  }, [applyResolved]);

  return null;
}

/** Applies page-level visual settings when nested inside VisualExperienceProvider (CMS pages). */
export function VisualExperienceSync() {
  const visualCtx = useVisualExperience();
  const { resolvedTheme } = useTheme();
  const pageKey = useMemo(() => JSON.stringify(visualCtx?.page ?? {}), [visualCtx?.page]);
  const effectAppearance = resolveEffectAppearance(resolvedTheme);

  useEffect(() => {
    if (!visualCtx?.site || !effectAppearance) return;

    let cancelIdle: (() => void) | undefined;
    const run = () => {
      cancelIdle?.();
      cancelIdle = deferUntilIdle(() => {
        restorePresetColorsFromStorage(effectAppearance);
        const experience = resolveVisitorVisualExperience({
          site: visualCtx.site,
          page: visualCtx.page,
          storedEffects: readStoredPresetEffects(),
          cursorPreference: readCursorPreference(),
        });
        scheduleApplyVisualEffects(experience, { force: true });
      });
    };

    const stopShell = whenShellReady(run);
    document.addEventListener(SHELL_READY_EVENT, run);

    return () => {
      stopShell();
      document.removeEventListener(SHELL_READY_EVENT, run);
      cancelIdle?.();
    };
  }, [visualCtx?.site, visualCtx?.page, pageKey, effectAppearance, resolvedTheme]);

  useEffect(() => {
    if (!visualCtx?.site || !effectAppearance) return;

    const onThemeChange = (event: Event) => {
      const detail = (event as CustomEvent<Partial<ThemeEngineSnapshot>>).detail;
      if (detail?.appearanceOnly) return;
      deferUntilIdle(() => {
        restorePresetColorsFromStorage(effectAppearance);
        const experience = resolveVisitorVisualExperience({
          site: visualCtx.site,
          page: visualCtx.page,
          storedEffects: readStoredPresetEffects(),
          cursorPreference: readCursorPreference(),
        });
        scheduleApplyVisualEffects(experience);
      });
    };

    window.addEventListener(THEME_CHANGE_EVENT, onThemeChange);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, onThemeChange);
  }, [visualCtx?.site, visualCtx?.page, pageKey, effectAppearance, resolvedTheme]);

  return null;
}
