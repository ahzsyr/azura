"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ResolvedVisualExperience } from "@/features/theme/visual-experience-resolver";
import { useTheme } from "next-themes";
import type { ThemeTokens } from "@/types/theme";
import { applyVisualEffects } from "@/features/theme/effects-runtime";
import { setThemeWithTransition } from "@/lib/theme/apply-theme-transition";
import {
  PUBLIC_THEME_KEY,
  CURSOR_PREF_STORAGE_KEY,
  THEME_CHANGE_EVENT,
  type AppearanceMode,
  type CursorPreference,
  type ResolvedAppearance,
  type UserCreatedPreset,
  buildLiveVisualExperience,
  fetchAndApplyCatalogPreset,
  applyUserPresetToDocument,
  notifyAppearanceChange,
  readStoredAppearanceMode,
  readStoredPresetId,
  readStoredPresetEffects,
  resolveAppearance,
  restorePresetColorsFromStorage,
  syncThemeDataAttributes,
  listUserPresets,
  saveUserPreset,
  deleteUserPreset,
  clearVisitorPresetOverrides,
} from "@/features/theme/engine";
import { reconcileSiteHtmlAttributes } from "@/lib/theme/reconcile-html-attributes";
type ThemeEngineContextValue = {
  appearanceMode: AppearanceMode;
  resolvedAppearance: ResolvedAppearance;
  activePresetId: string | null;
  activePresetSource: "site" | "catalog" | "user" | null;
  userPresets: UserCreatedPreset[];
  cursorPreference: CursorPreference;
  setAppearanceMode: (mode: AppearanceMode) => void;
  toggleLightDark: () => void;
  applyCatalogPreset: (presetId: string) => Promise<boolean>;
  applyUserPreset: (preset: UserCreatedPreset) => void;
  saveUserCreatedPreset: (
    input: Omit<UserCreatedPreset, "id" | "createdAt"> & { id?: string },
  ) => UserCreatedPreset;
  removeUserPreset: (id: string) => void;
  resetVisitorTheme: () => void;
  setCursorPreference: (pref: CursorPreference) => void;
};

const ThemeEngineContext = createContext<ThemeEngineContextValue | null>(null);

type Props = {
  children: ReactNode;
  siteTheme: ThemeTokens | null;
  defaultPresetId?: string | null;
  defaultAppearance?: AppearanceMode;
  /** SSR-resolved site defaults for post-hydration reconciliation. */
  ssrHtmlAttributes?: Record<string, string>;
  /** Pre-resolved site visual experience from ThemeProvider. */
  siteResolved?: ResolvedVisualExperience | null;
};

export function ThemeEngineProvider({
  children,
  siteTheme,
  defaultPresetId,
  defaultAppearance = "light",
  ssrHtmlAttributes,
  siteResolved,
}: Props) {
  const { resolvedTheme, setTheme } = useTheme();
  const didInitRef = useRef(false);
  const [appearanceMode, setAppearanceModeState] = useState<AppearanceMode>(defaultAppearance);
  const [activePresetId, setActivePresetId] = useState<string | null>(
    defaultPresetId ?? siteTheme?.activePresetId ?? null,
  );
  const [activePresetSource, setActivePresetSource] = useState<
    "site" | "catalog" | "user" | null
  >(defaultPresetId || siteTheme?.activePresetId ? "site" : null);
  const [userPresets, setUserPresets] = useState<UserCreatedPreset[]>([]);
  const [cursorPreference, setCursorPreferenceState] = useState<CursorPreference>("custom");
  const [hydrated, setHydrated] = useState(false);

  const resolvedAppearance: ResolvedAppearance =
    resolvedTheme === "dark"
      ? "dark"
      : resolvedTheme === "light"
        ? "light"
        : resolveAppearance(appearanceMode);

  const refreshUserPresets = useCallback(() => {
    setUserPresets(listUserPresets());
  }, []);

  const applyResolvedEffects = useCallback(
    (resolved: ResolvedAppearance, cursorPref?: CursorPreference) => {
      if (!siteTheme || !siteResolved) return;
      restorePresetColorsFromStorage(resolved);
      const live = readStoredPresetEffects();
      const experience = live
        ? buildLiveVisualExperience(siteTheme, live, cursorPref ?? cursorPreference)
        : siteResolved;
      applyVisualEffects(experience);
    },
    [siteTheme, siteResolved, cursorPreference],
  );

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    const storedMode = readStoredAppearanceMode(PUBLIC_THEME_KEY);
    if (storedMode) setAppearanceModeState(storedMode);

    const needsThemeReset =
      typeof document !== "undefined" &&
      document.cookie.split("; ").some((c) => c === "theme-reset=1");

    if (needsThemeReset) {
      clearVisitorPresetOverrides();
      setActivePresetId(defaultPresetId ?? siteTheme?.activePresetId ?? null);
      setActivePresetSource("site");
      document.cookie = "theme-reset=; Max-Age=0; path=/";
    } else {
      const storedPreset = readStoredPresetId();
      if (storedPreset) {
        setActivePresetId(storedPreset);
        setActivePresetSource(
          storedPreset.startsWith("user-") ? "user" : "catalog",
        );
      } else if (defaultPresetId) {
        setActivePresetId(defaultPresetId);
        setActivePresetSource("site");
      }
    }

    try {
      const pref = localStorage.getItem(CURSOR_PREF_STORAGE_KEY);
      if (pref === "normal" || pref === "custom") {
        setCursorPreferenceState(pref);
      }
    } catch {
      // ignore
    }

    refreshUserPresets();
    reconcileSiteHtmlAttributes(ssrHtmlAttributes);
    setHydrated(true);
  }, [defaultPresetId, siteTheme?.activePresetId, refreshUserPresets, ssrHtmlAttributes]);

  useEffect(() => {
    if (!hydrated || !siteTheme || !siteResolved || resolvedTheme === undefined) return;

    const mode = appearanceMode;
    const resolved: ResolvedAppearance =
      resolvedTheme === "dark"
        ? "dark"
        : resolvedTheme === "light"
          ? "light"
          : resolveAppearance(mode);

    syncThemeDataAttributes(mode, resolved);
    applyResolvedEffects(resolved);
  }, [
    hydrated,
    siteTheme,
    siteResolved,
    appearanceMode,
    resolvedTheme,
    cursorPreference,
    applyResolvedEffects,
  ]);

  useEffect(() => {
    const onThemeChange = () => {
      const mode =
        (document.documentElement.dataset.themeMode as AppearanceMode | undefined) ??
        appearanceMode;
      const resolved =
        document.documentElement.dataset.theme === "light" ? "light" : "dark";
      syncThemeDataAttributes(mode, resolved);
    };
    window.addEventListener(THEME_CHANGE_EVENT, onThemeChange);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, onThemeChange);
  }, [appearanceMode]);

  const setAppearanceMode = useCallback(
    (mode: AppearanceMode) => {
      setAppearanceModeState(mode);
      setThemeWithTransition((next) => setTheme(next), mode);
      const resolved = resolveAppearance(mode);
      restorePresetColorsFromStorage(resolved);
      notifyAppearanceChange(mode, resolved);
      applyResolvedEffects(resolved);
    },
    [setTheme, applyResolvedEffects],
  );

  const toggleLightDark = useCallback(() => {
    const current = appearanceMode;
    if (current === "system") {
      const next: AppearanceMode = resolvedAppearance === "dark" ? "light" : "dark";
      setAppearanceMode(next);
      return;
    }
    setAppearanceMode(current === "dark" ? "light" : "dark");
  }, [appearanceMode, resolvedAppearance, setAppearanceMode]);

  const applyCatalogPreset = useCallback(
    async (presetId: string) => {
      const resolved = resolveAppearance(appearanceMode);
      const payload = await fetchAndApplyCatalogPreset(presetId, resolved);
      if (!payload) return false;
      setActivePresetId(presetId);
      setActivePresetSource("catalog");
      if (siteTheme) {
        applyVisualEffects(
          buildLiveVisualExperience(
            siteTheme,
            {
              cursor: payload.cursor,
              backgroundEffect: payload.backgroundEffect,
              textEffect: payload.textEffect,
              cardStyle: payload.cardStyle,
              borderStyle: payload.borderStyle,
            },
            cursorPreference,
          ),
        );
      }
      return true;
    },
    [appearanceMode, siteTheme, cursorPreference],
  );

  const applyUserPreset = useCallback(
    (preset: UserCreatedPreset) => {
      const resolved = resolveAppearance(appearanceMode);
      applyUserPresetToDocument(preset, resolved);
      setActivePresetId(preset.id);
      setActivePresetSource("user");
      if (siteTheme) {
        applyVisualEffects(
          buildLiveVisualExperience(
            siteTheme,
            {
              cursor: preset.cursor,
              backgroundEffect: preset.backgroundEffect,
              textEffect: preset.textEffect,
              cardStyle: preset.cardStyle,
              borderStyle: preset.borderStyle,
            },
            cursorPreference,
          ),
        );
      }
    },
    [appearanceMode, siteTheme, cursorPreference],
  );

  const saveUserCreatedPreset = useCallback(
    (input: Omit<UserCreatedPreset, "id" | "createdAt"> & { id?: string }) => {
      const saved = saveUserPreset(input);
      refreshUserPresets();
      return saved;
    },
    [refreshUserPresets],
  );

  const removeUserPreset = useCallback(
    (id: string) => {
      deleteUserPreset(id);
      refreshUserPresets();
      if (activePresetId === id) {
        setActivePresetId(defaultPresetId ?? siteTheme?.activePresetId ?? null);
        setActivePresetSource("site");
      }
    },
    [activePresetId, defaultPresetId, siteTheme?.activePresetId, refreshUserPresets],
  );

  const resetVisitorTheme = useCallback(() => {
    clearVisitorPresetOverrides();
    setActivePresetId(defaultPresetId ?? siteTheme?.activePresetId ?? null);
    setActivePresetSource("site");
    reconcileSiteHtmlAttributes(ssrHtmlAttributes);
    if (siteTheme && siteResolved) {
      applyVisualEffects(siteResolved);
    }
  }, [defaultPresetId, siteTheme, siteResolved, cursorPreference, ssrHtmlAttributes]);

  const setCursorPreference = useCallback(
    (pref: CursorPreference) => {
      setCursorPreferenceState(pref);
      try {
        localStorage.setItem(CURSOR_PREF_STORAGE_KEY, pref);
      } catch {
        // ignore
      }
      const resolved = resolveAppearance(appearanceMode);
      applyResolvedEffects(resolved, pref);
    },
    [appearanceMode, applyResolvedEffects],
  );

  const value = useMemo<ThemeEngineContextValue>(
    () => ({
      appearanceMode,
      resolvedAppearance,
      activePresetId,
      activePresetSource,
      userPresets,
      cursorPreference,
      setAppearanceMode,
      toggleLightDark,
      applyCatalogPreset,
      applyUserPreset,
      saveUserCreatedPreset,
      removeUserPreset,
      resetVisitorTheme,
      setCursorPreference,
    }),
    [
      appearanceMode,
      resolvedAppearance,
      activePresetId,
      activePresetSource,
      userPresets,
      cursorPreference,
      setAppearanceMode,
      toggleLightDark,
      applyCatalogPreset,
      applyUserPreset,
      saveUserCreatedPreset,
      removeUserPreset,
      resetVisitorTheme,
      setCursorPreference,
    ],
  );

  return (
    <ThemeEngineContext.Provider value={value}>{children}</ThemeEngineContext.Provider>
  );
}

export function useThemeEngine(): ThemeEngineContextValue {
  const ctx = useContext(ThemeEngineContext);
  if (!ctx) {
    throw new Error("useThemeEngine must be used within ThemeEngineProvider");
  }
  return ctx;
}
