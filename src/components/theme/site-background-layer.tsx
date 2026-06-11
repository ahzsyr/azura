"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useTheme } from "next-themes";
import { useVisualExperience, useResolvedVisualExperience } from "@/components/theme/visual-experience-context";
import {
  resolveVisitorVisualExperience,
} from "@/features/theme/visual-experience-resolver";
import { runtimeConfigSignature } from "@/features/theme/backgrounds/config-reader";
import {
  resolveBackgroundRuntimeConfig,
  backgroundSettingsSignature,
} from "@/features/theme/backgrounds/settings";
import {
  mountSiteBackground,
  unmountSiteBackground,
} from "@/features/theme/backgrounds/site-runtime";
import {
  applyGlassSiteOverlay,
  downgradeSiteBackgroundForPolicy,
  normalizeSiteBackgroundEffect,
} from "@/features/theme/backgrounds/background-system";
import {
  readStoredPresetEffects,
  restorePresetColorsFromStorage,
  THEME_CHANGE_EVENT,
} from "@/features/theme/engine";
import type { ThemeEngineSnapshot } from "@/features/theme/engine/types";
import { CURSOR_PREF_STORAGE_KEY } from "@/features/theme/engine/constants";
import { getCapabilities } from "@/lib/theme/effects/capability-engine";
import { deferUntilIdle } from "@/lib/performance/defer-until-idle";
import { isShellVisible, SHELL_READY_EVENT, whenShellReady } from "@/lib/motion/shell-ready";
import type { BackgroundEffectId } from "@/features/theme/backgrounds/types";
import type { ThemeTokens } from "@/types/theme";

type Props = {
  tokens?: ThemeTokens | null;
  /** Theme studio preview — skip shell-ready defer. */
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

function applyBackgroundCssVars(tokens: ThemeTokens): void {
  const runtime = resolveBackgroundRuntimeConfig(
    tokens.backgroundEffectSettings,
    tokens.animationSpeed,
    tokens.animationsEnabled,
  );
  const root = document.documentElement;
  root.style.setProperty("--bg-effect-intensity", String(runtime.intensity));
  root.style.setProperty("--bg-effect-opacity", String(runtime.opacity));
  root.style.setProperty("--bg-effect-speed", String(runtime.speed));
}

function isGlassCardStyle(cardStyle: string | null | undefined): boolean {
  return cardStyle === "glassmorphism" || cardStyle === "liquid-glass";
}

function resolveEffectAppearance(resolvedTheme: string | undefined): "light" | "dark" {
  if (resolvedTheme === "dark" || resolvedTheme === "light") return resolvedTheme;
  if (typeof document !== "undefined" && document.documentElement.dataset.theme === "light") {
    return "light";
  }
  return "dark";
}

export function SiteBackgroundLayer({ tokens: tokensProp, immediate = false }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const lastMountedSigRef = useRef<string | null>(null);
  const { resolvedTheme } = useTheme();
  const visualCtx = useVisualExperience();
  const contextResolved = useResolvedVisualExperience();

  const tokens = tokensProp ?? visualCtx?.site ?? null;

  const resolved = useMemo(() => {
    if (!tokens) return contextResolved;
    return resolveVisitorVisualExperience({
      site: tokens,
      page: visualCtx?.page,
      storedEffects: readStoredPresetEffects(),
      cursorPreference: readCursorPreference(),
    });
  }, [tokens, visualCtx?.page, contextResolved]);

  const mountBackground = useCallback(
    (options?: { force?: boolean }) => {
      const host = hostRef.current;
      if (!host || !resolved || !tokens) return;

      const appearance = resolveEffectAppearance(resolvedTheme);
      restorePresetColorsFromStorage(appearance);
      applyBackgroundCssVars(tokens);
      applyGlassSiteOverlay(isGlassCardStyle(resolved.cardStyle));

      const { policy } = getCapabilities();
      let effectId: BackgroundEffectId | "none" = "none";

      if (resolved.backgroundEnabled && resolved.backgroundEffect) {
        const downgraded =
          downgradeSiteBackgroundForPolicy(resolved.backgroundEffect, policy) ??
          resolved.backgroundEffect;
        effectId = normalizeSiteBackgroundEffect(downgraded) as BackgroundEffectId;
      }

      document.body.dataset.bgEffect = effectId === "none" ? "" : effectId;
      if (effectId === "none") {
        document.body.removeAttribute("data-bg-effect");
      }

      const runtime = resolveBackgroundRuntimeConfig(
        resolved.backgroundEffectSettings,
        tokens.animationSpeed,
        resolved.animationsEnabled,
      );

      const mountSig = [
        appearance,
        effectId,
        runtimeConfigSignature(runtime),
      ].join("|");

      if (!options?.force && lastMountedSigRef.current === mountSig) {
        return;
      }

      void mountSiteBackground(host, effectId, runtime, { force: options?.force }).then(() => {
        lastMountedSigRef.current = mountSig;
      });
    },
    [resolved, tokens, resolvedTheme],
  );

  useEffect(() => {
    if (!resolved || !tokens) return;

    if (immediate) {
      mountBackground({ force: true });
      return;
    }

    let cancelIdle: (() => void) | undefined;
    const run = () => {
      cancelIdle?.();
      cancelIdle = deferUntilIdle(() => mountBackground());
    };

    let stopShell: (() => void) | undefined;
    if (isShellVisible()) {
      run();
    } else {
      stopShell = whenShellReady(run);
      document.addEventListener(SHELL_READY_EVENT, run);
    }

    return () => {
      stopShell?.();
      document.removeEventListener(SHELL_READY_EVENT, run);
      cancelIdle?.();
    };
  }, [
    immediate,
    mountBackground,
    resolved?.backgroundEffect,
    resolved?.backgroundEnabled,
    resolved?.animationsEnabled,
    resolved?.cardStyle,
    tokens?.animationSpeed,
    tokens ? backgroundSettingsSignature(tokens.backgroundEffectSettings) : "",
  ]);

  useEffect(() => {
    const onThemeChange = (event: Event) => {
      const detail = (event as CustomEvent<Partial<ThemeEngineSnapshot>>).detail;
      if (detail?.appearanceOnly) {
        mountBackground({ force: true });
        return;
      }
      mountBackground({ force: true });
    };
    window.addEventListener(THEME_CHANGE_EVENT, onThemeChange);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, onThemeChange);
  }, [mountBackground]);

  useEffect(() => {
    return () => {
      unmountSiteBackground();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      data-bg-layer
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-500"
      style={{ opacity: "var(--bg-effect-opacity, 1)" }}
    />
  );
}
