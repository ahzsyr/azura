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
import { normalizeBranding } from "@/features/navigation/branding-defaults";
import { useResolvedThemePreview } from "./resolve-theme-client";

const MAX_UNDO = 40;

function themeFromRecord(theme: SiteTheme): ThemeTokens {
  return siteThemeToTokens(theme);
}

export function createInitialThemeTokens(base: SiteTheme | null): ThemeTokens {
  if (base) return themeFromRecord(base);
  return {
    preset: "CLASSIC",
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
  fd.set("activePresetId", state.activePresetId ?? "");
  fd.set("cursorEffect", state.cursorEffect ?? "");
  fd.set("backgroundEffect", state.backgroundEffect ?? "");
  fd.set("textEffect", state.textEffect ?? "");
  fd.set("cursorEffectEnabled", state.cursorEffectEnabled ? "true" : "false");
  fd.set("backgroundEffectEnabled", state.backgroundEffectEnabled ? "true" : "false");
  fd.set("textEffectEnabled", state.textEffectEnabled ? "true" : "false");
  fd.set("cardStyle", state.cardStyle ?? "");
  fd.set("borderStyle", state.borderStyle ?? "");
  fd.set("backgroundEffectSettings", JSON.stringify(state.backgroundEffectSettings));
  return fd;
}

export function useThemeStudio(base: SiteTheme) {
  const [state, setStateRaw] = useState<ThemeTokens>(() => createInitialThemeTokens(base));
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    JSON.stringify(createInitialThemeTokens(base)),
  );
  const undoStack = useRef<ThemeTokens[]>([]);
  const redoStack = useRef<ThemeTokens[]>([]);
  const [historyTick, setHistoryTick] = useState(0);
  const syncHistory = useCallback(() => {
    setHistoryTick((n) => n + 1);
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
  }, []);

  const resetFromBase = useCallback((record: SiteTheme) => {
    const next = createInitialThemeTokens(record);
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

  const canUndo = undoStack.current.length > 0;
  const canRedo = redoStack.current.length > 0;
  void historyTick;

  const isDirty = useMemo(
    () => JSON.stringify(state) !== savedSnapshot,
    [state, savedSnapshot, historyTick],
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
    (presetId: string) => {
      const preset = ALL_PRESETS.find((p) => p.id === presetId);
      if (!preset) return;
      const style = PRESET_STYLE_MAP[presetId];
      setState((s) => ({
        ...s,
        activePresetId: presetId,
        primaryColor: preset.tokens.primary,
        secondaryColor: preset.tokens.accent ?? s.secondaryColor,
        backgroundEffect: preset.bg === "none" ? null : preset.bg || s.backgroundEffect,
        textEffect: preset.text === "none" ? null : preset.text || s.textEffect,
        cursorEffect: preset.cursor === "none" ? null : preset.cursor || s.cursorEffect,
        cardStyle: style?.cardStyle ?? preset.cardStyle ?? s.cardStyle,
        borderStyle: style?.borderStyle ?? preset.borderStyle ?? s.borderStyle,
        presetColors: {
          primary: preset.tokens.primary,
          accent: preset.tokens.accent ?? preset.tokens.primary,
          background: preset.tokens.background,
          surface: preset.tokens.surface,
          text: preset.tokens.text,
          textMuted: preset.tokens.textMuted,
        },
      }));
    },
    [setState],
  );

  const resetIndustryPreset = useCallback(() => {
    setState((s) => ({
      ...s,
      activePresetId: null,
      presetColors: null,
    }));
  }, [setState]);

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
    resetIndustryPreset,
    exportThemeJson,
    importThemeJson,
    buildFormData: () => buildThemeFormData(state),
  };
}

export type ThemeStudioApi = ReturnType<typeof useThemeStudio>;
