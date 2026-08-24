"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { SiteTheme } from "@prisma/client";
import {
  DEFAULT_FOOTER_CONFIG,
  DEFAULT_HEADER_CONFIG,
  DEFAULT_TYPOGRAPHY,
  siteThemeToTokens,
} from "@/features/theme/theme-config";
import { ALL_PRESETS } from "@/features/theme/presets-catalog";
import { PRESET_STYLE_MAP } from "@/features/theme/presets/preset-style-map";
import { THEME_PRESET_DEFAULTS } from "@/types/theme";
import type { ThemeTokens } from "@/types/theme";
import type { PresetColorTokens } from "@/features/theme/engine/types";
import { tokensToPresetColorTokens } from "@/lib/theme/tokens/preset-colors";
import { normalizeBranding } from "@/features/navigation/branding-defaults";
import { useResolvedThemePreview } from "./resolve-theme-client";

const MAX_UNDO = 40;

function themeFromRecord(theme: SiteTheme): ThemeTokens {
  return siteThemeToTokens(theme);
}

function applyPresetColorsToState(
  state: ThemeTokens,
  presetId: string | null,
  colors: PresetColorTokens,
): ThemeTokens {
  return {
    ...state,
    siteDefaultPresetId: presetId,
    activePresetId: presetId,
    preset: "CUSTOM",
    primaryColor: colors.primary,
    secondaryColor: colors.accent,
    presetColors: colors,
    themeProvenance: {
      sourcePresetId: presetId,
      appliedAt: new Date().toISOString(),
    },
  };
}

export function createInitialThemeTokens(base: SiteTheme | null): ThemeTokens {
  if (base) return themeFromRecord(base);
  return {
    preset: "CLASSIC",
    siteDefaultPresetId: null,
    activePresetId: null,
    primaryColor: "#047857",
    secondaryColor: "#d4af37",
    cursorEffect: null,
    backgroundEffect: null,
    textEffect: null,
    cursorEffectEnabled: true,
    backgroundEffectEnabled: true,
    textEffectEnabled: true,
    cardStyle: null,
    borderStyle: null,
    typography: DEFAULT_TYPOGRAPHY,
    faviconUrl: null,
    logoUrl: null,
    brandConfig: normalizeBranding({}),
    headerConfig: DEFAULT_HEADER_CONFIG,
    footerConfig: DEFAULT_FOOTER_CONFIG,
    animationsEnabled: true,
    animationSpeed: 1,
    lazyLoadEnabled: true,
    darkModeEnabled: false,
    spacingScale: 1,
    customCss: null,
    backgroundEffectSettings: { intensity: 1, opacity: 1 },
    cursorEffectSettings: { intensity: 1, opacity: 1 },
    textEffectSettings: { intensity: 1, opacity: 1 },
    motionSettings: { intensity: 1, opacity: 1 },
    themeProvenance: {
      sourcePresetId: null,
      appliedAt: null,
    },
    mobileBrowserConfig: {
      syncWithTheme: true,
      browserThemeColorLight: null,
      browserThemeColorDark: null,
      browserBackgroundColor: null,
      iosStatusBarStyle: "default",
    },
  };
}

export function buildThemeFormData(state: ThemeTokens): FormData {
  const fd = new FormData();
  fd.set("preset", state.preset);
  fd.set("primaryColor", state.primaryColor);
  fd.set("secondaryColor", state.secondaryColor);
  fd.set("typography", JSON.stringify(state.typography));
  fd.set("faviconUrl", state.faviconUrl ?? "");
  fd.set("logoUrl", state.logoUrl ?? "");
  fd.set("brandConfig", JSON.stringify(state.brandConfig));
  fd.set("headerConfig", JSON.stringify(state.headerConfig));
  fd.set("footerConfig", JSON.stringify(state.footerConfig));
  fd.set("animationsEnabled", state.animationsEnabled ? "true" : "false");
  fd.set("animationSpeed", String(state.animationSpeed));
  fd.set("lazyLoadEnabled", state.lazyLoadEnabled ? "true" : "false");
  fd.set("darkModeEnabled", state.darkModeEnabled ? "true" : "false");
  fd.set("spacingScale", String(state.spacingScale));
  fd.set("customCss", state.customCss ?? "");
  fd.set("siteDefaultPresetId", state.siteDefaultPresetId ?? "");
  fd.set("cursorEffect", state.cursorEffect ?? "");
  fd.set("backgroundEffect", state.backgroundEffect ?? "");
  fd.set("textEffect", state.textEffect ?? "");
  fd.set("cursorEffectEnabled", state.cursorEffectEnabled ? "true" : "false");
  fd.set("backgroundEffectEnabled", state.backgroundEffectEnabled ? "true" : "false");
  fd.set("textEffectEnabled", state.textEffectEnabled ? "true" : "false");
  fd.set("cardStyle", state.cardStyle ?? "");
  fd.set("borderStyle", state.borderStyle ?? "");
  fd.set("backgroundEffectSettings", JSON.stringify(state.backgroundEffectSettings));
  fd.set("cursorEffectSettings", JSON.stringify(state.cursorEffectSettings));
  fd.set("textEffectSettings", JSON.stringify(state.textEffectSettings));
  fd.set("motionSettings", JSON.stringify(state.motionSettings));
  fd.set("themeProvenance", JSON.stringify(state.themeProvenance ?? null));
  fd.set("mobileBrowserConfig", JSON.stringify(state.mobileBrowserConfig ?? {}));
  return fd;
}

export function useThemeStudio(base: SiteTheme) {
  const [state, setStateRaw] = useState<ThemeTokens>(() => createInitialThemeTokens(base));
  const baseVisualStateRef = useRef<ThemeTokens>(createInitialThemeTokens(base));
  const [defaultThemeColors, setDefaultThemeColors] = useState(() =>
    tokensToPresetColorTokens(createInitialThemeTokens(base)),
  );
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    JSON.stringify(createInitialThemeTokens(base)),
  );
  const undoStack = useRef<ThemeTokens[]>([]);
  const redoStack = useRef<ThemeTokens[]>([]);
  const [historyState, setHistoryState] = useState({ tick: 0, canUndo: false, canRedo: false });
  const syncHistory = useCallback(() => {
    setHistoryState(({ tick }) => ({
      tick: tick + 1,
      canUndo: undoStack.current.length > 0,
      canRedo: redoStack.current.length > 0,
    }));
  }, []);

  const resolved = useResolvedThemePreview(state);

  const setState = useCallback((updater: ThemeTokens | ((prev: ThemeTokens) => ThemeTokens)) => {
    setStateRaw((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (JSON.stringify(next) === JSON.stringify(prev)) return prev;
      undoStack.current = [...undoStack.current.slice(-MAX_UNDO + 1), prev];
      redoStack.current = [];
      syncHistory();
      return next;
    });
  }, [syncHistory]);

  const resetFromBase = useCallback((record: SiteTheme) => {
    const next = createInitialThemeTokens(record);
    baseVisualStateRef.current = next;
    setDefaultThemeColors(tokensToPresetColorTokens(next));
    setStateRaw(next);
    setSavedSnapshot(JSON.stringify(next));
    undoStack.current = [];
    redoStack.current = [];
    syncHistory();
  }, [syncHistory]);

  const undo = useCallback(() => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    setStateRaw((current) => {
      redoStack.current.push(current);
      syncHistory();
      return prev;
    });
  }, [syncHistory]);

  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (!next) return;
    setStateRaw((current) => {
      undoStack.current.push(current);
      syncHistory();
      return next;
    });
  }, [syncHistory]);

  const canUndo = historyState.canUndo;
  const canRedo = historyState.canRedo;
  void historyState.tick;

  const isDirty = useMemo(
    () => JSON.stringify(state) !== savedSnapshot,
    [state, savedSnapshot],
  );

  const markSaved = useCallback(() => {
    setSavedSnapshot(JSON.stringify(state));
    undoStack.current = [];
    redoStack.current = [];
    syncHistory();
  }, [state, syncHistory]);

  const revertToSaved = useCallback(() => {
    setStateRaw(JSON.parse(savedSnapshot) as ThemeTokens);
    undoStack.current = [];
    redoStack.current = [];
    syncHistory();
  }, [savedSnapshot, syncHistory]);

  const applyPresetColors = useCallback((preset: ThemeTokens["preset"]) => {
    const colors = THEME_PRESET_DEFAULTS[preset];
    if (preset !== "CUSTOM") {
      setState((s) => ({
        ...s,
        preset,
        primaryColor: colors.primaryColor,
        secondaryColor: colors.secondaryColor,
      }));
    } else {
      setState((s) => ({ ...s, preset }));
    }
  }, [setState]);

  const applyIndustryPreset = useCallback(
    async (presetId: string) => {
      const catalogItem = ALL_PRESETS.find((p) => p.id === presetId);
      const style = PRESET_STYLE_MAP[presetId];

      // Optimistic update from catalog for instant feedback while the full JSON loads.
      if (catalogItem) {
        const cursorEffect = catalogItem.cursor === "none" ? null : catalogItem.cursor || null;
        const backgroundEffect = catalogItem.bg === "none" ? null : catalogItem.bg || null;
        const textEffect = catalogItem.text === "none" ? null : catalogItem.text || null;
        setState((s) => ({
          ...s,
          siteDefaultPresetId: presetId,
          activePresetId: presetId,
          preset: "CUSTOM",
          primaryColor: catalogItem.tokens.primary,
          secondaryColor: catalogItem.tokens.accent ?? s.secondaryColor,
          backgroundEffect,
          textEffect,
          cursorEffect,
          cursorEffectEnabled: Boolean(cursorEffect),
          backgroundEffectEnabled: Boolean(backgroundEffect),
          textEffectEnabled: Boolean(textEffect),
          backgroundEffectSettings: { intensity: 1, opacity: 1 },
          cursorEffectSettings: { intensity: 1, opacity: 1 },
          textEffectSettings: { intensity: 1, opacity: 1 },
          motionSettings: { intensity: 1, opacity: 1 },
          cardStyle: style?.cardStyle ?? catalogItem.cardStyle ?? s.cardStyle,
          borderStyle: style?.borderStyle ?? catalogItem.borderStyle ?? s.borderStyle,
          presetColors: {
            primary: catalogItem.tokens.primary,
            accent: catalogItem.tokens.accent ?? catalogItem.tokens.primary,
            background: catalogItem.tokens.background,
            surface: catalogItem.tokens.surface,
            text: catalogItem.tokens.text,
            textMuted: catalogItem.tokens.textMuted,
          },
          themeProvenance: { sourcePresetId: presetId, appliedAt: new Date().toISOString() },
        }));
      }

      // Fetch the full preset JSON payload to apply complete colors, fonts, and effects.
      try {
        const res = await fetch("/api/apply-preset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ presetId }),
        });
        if (!res.ok) return;

        const payload = (await res.json()) as {
          success?: boolean;
          colors?: Record<string, string | undefined>;
          cursor?: string | null;
          backgroundEffect?: string | null;
          textEffect?: string | null;
          cardStyle?: string | null;
          borderStyle?: string | null;
          fonts?: { display?: string; body?: string; mono?: string } | null;
        };
        if (!payload.success) return;

        const colors = payload.colors ?? {};
        const fonts = payload.fonts;
        const cursorEffect = payload.cursor === "none" ? null : payload.cursor || null;
        const backgroundEffect =
          payload.backgroundEffect === "none" ? null : payload.backgroundEffect || null;
        const textEffect = payload.textEffect === "none" ? null : payload.textEffect || null;
        const cardStyle = style?.cardStyle ?? payload.cardStyle ?? null;
        const borderStyle = style?.borderStyle ?? payload.borderStyle ?? null;

        setState((s) => ({
          ...s,
          siteDefaultPresetId: presetId,
          activePresetId: presetId,
          preset: "CUSTOM",
          primaryColor: colors.primary ?? s.primaryColor,
          secondaryColor: colors.accent ?? colors.secondary ?? s.secondaryColor,
          presetColors: {
            primary: colors.primary ?? s.primaryColor,
            accent: colors.accent ?? colors.primary ?? s.secondaryColor,
            background: colors.background,
            surface: colors.surface,
            text: colors.text,
            textMuted: colors.textMuted,
          },
          cursorEffect,
          backgroundEffect,
          textEffect,
          cursorEffectEnabled: Boolean(cursorEffect),
          backgroundEffectEnabled: Boolean(backgroundEffect),
          textEffectEnabled: Boolean(textEffect),
          backgroundEffectSettings: { intensity: 1, opacity: 1 },
          cursorEffectSettings: { intensity: 1, opacity: 1 },
          textEffectSettings: { intensity: 1, opacity: 1 },
          motionSettings: { intensity: 1, opacity: 1 },
          cardStyle,
          borderStyle,
          ...(fonts
            ? {
                typography: {
                  ...s.typography,
                  headingFont: fonts.display ?? s.typography.headingFont,
                  bodyFont: fonts.body ?? s.typography.bodyFont,
                },
              }
            : {}),
          themeProvenance: { sourcePresetId: presetId, appliedAt: new Date().toISOString() },
        }));
      } catch {
        // Fetch failed — catalog-based optimistic apply remains in effect.
      }
    },
    [setState],
  );

  const duplicateIndustryPreset = useCallback(
    (presetId: string) => {
      applyIndustryPreset(presetId);
    },
    [applyIndustryPreset],
  );

  const applyDuplicatedPresetColors = useCallback(
    (presetId: string | null, colors: PresetColorTokens) => {
      setState((s) => applyPresetColorsToState(s, presetId, colors));
    },
    [setState],
  );

  const resetIndustryPreset = useCallback(() => {
    const baseVisual = baseVisualStateRef.current;
    setState((s) => ({
      ...s,
      preset: baseVisual.preset,
      siteDefaultPresetId: baseVisual.siteDefaultPresetId,
      activePresetId: baseVisual.siteDefaultPresetId,
      primaryColor: baseVisual.primaryColor,
      secondaryColor: baseVisual.secondaryColor,
      cursorEffect: baseVisual.cursorEffect,
      backgroundEffect: baseVisual.backgroundEffect,
      textEffect: baseVisual.textEffect,
      cursorEffectEnabled: baseVisual.cursorEffectEnabled,
      backgroundEffectEnabled: baseVisual.backgroundEffectEnabled,
      textEffectEnabled: baseVisual.textEffectEnabled,
      backgroundEffectSettings: baseVisual.backgroundEffectSettings,
      cursorEffectSettings: baseVisual.cursorEffectSettings,
      textEffectSettings: baseVisual.textEffectSettings,
      motionSettings: baseVisual.motionSettings,
      cardStyle: baseVisual.cardStyle,
      borderStyle: baseVisual.borderStyle,
      presetColors: null,
    }));
  }, [setState]);

  const duplicateDefaultTheme = useCallback(() => {
    resetIndustryPreset();
  }, [resetIndustryPreset]);

  const exportThemeJson = useCallback(() => {
    return JSON.stringify(state, null, 2);
  }, [state]);

  const importThemeJson = useCallback(
    (json: string) => {
      const parsed = JSON.parse(json) as ThemeTokens;
      setState({ ...createInitialThemeTokens(null), ...parsed });
    },
    [setState],
  );

  return {
    state,
    setState,
    resolved,
    defaultThemeColors,
    savedSnapshot,
    isDirty,
    markSaved,
    revertToSaved,
    resetFromBase,
    undo,
    redo,
    canUndo,
    canRedo,
    applyPresetColors,
    applyIndustryPreset,
    duplicateIndustryPreset,
    applyDuplicatedPresetColors,
    duplicateDefaultTheme,
    resetIndustryPreset,
    exportThemeJson,
    importThemeJson,
    buildFormData: () => buildThemeFormData(state),
  };
}

export type ThemeStudioApi = ReturnType<typeof useThemeStudio>;
