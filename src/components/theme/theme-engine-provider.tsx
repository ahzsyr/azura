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
import { resolveVisitorVisualExperience } from "@/features/theme/visual-experience-resolver";
import { useTheme } from "next-themes";
import type { ThemeTokens } from "@/types/theme";
import { setThemeWithTransition } from "@/lib/theme/apply-theme-transition";
import {
  PUBLIC_THEME_KEY,
  CURSOR_PREF_STORAGE_KEY,
  THEME_CHANGE_EVENT,
  type AppearanceMode,
  type CursorPreference,
  type ResolvedAppearance,
  type UserCreatedPreset,
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
import {
  forceApplyVisualEffects,
  resetVisualEffectsCoordinator,
  scheduleApplyVisualEffects,
} from "@/features/theme/visual-effects-coordinator";
import { invalidateThemeStorageReadCache } from "@/features/theme/engine/storage-read-cache";

type ThemeEngineContextValue = {
  appearanceMode: AppearanceMode;
  resolvedAppearance: ResolvedAppearance;
  activePresetId: string | null;
  activePresetSource: "site" | "catalog" | "user" | null;
  userPresets: UserCreatedPreset[];
  cursorPreference: CursorPreference;
  setAppearanceMode: (mode: AppearanceMode, options?: { animate?: boolean }) => void;
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

function resolveEngineExperience(
  siteTheme: ThemeTokens,
  cursorPref: CursorPreference,
): ResolvedVisualExperience {
  return resolveVisitorVisualExperience({
    site: siteTheme,
    storedEffects: readStoredPresetEffects(),
    cursorPreference: cursorPref,
  });
}

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

  const applyVisitorEffects = useCallback(
    (
      resolved: ResolvedAppearance,
      cursorPref?: CursorPreference,
      options?: { colorsOnly?: boolean; force?: boolean; immediate?: boolean },
    ) => {
      if (!siteTheme) return;
      restorePresetColorsFromStorage(resolved);
      const experience = resolveEngineExperience(siteTheme, cursorPref ?? cursorPreference);
      scheduleApplyVisualEffects(experience, options);
    },
    [siteTheme, cursorPreference],
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
      invalidateThemeStorageReadCache();
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
    if (!hydrated || !siteTheme) return;
    const mode = appearanceMode;
    const resolved = resolveAppearance(mode);
    syncThemeDataAttributes(mode, resolved);
  }, [hydrated, siteTheme, appearanceMode]);

  const setAppearanceMode = useCallback(
    (mode: AppearanceMode, options?: { animate?: boolean }) => {
      setAppearanceModeState(mode);
      if (options?.animate) {
        setThemeWithTransition((next) => setTheme(next), mode);
      } else {
        setTheme(mode);
      }
      const resolved = resolveAppearance(mode);
      restorePresetColorsFromStorage(resolved);
      syncThemeDataAttributes(mode, resolved);
      notifyAppearanceChange(mode, resolved, { appearanceOnly: true });
      applyVisitorEffects(resolved, cursorPreference, { colorsOnly: true });
    },
    [setTheme, applyVisitorEffects, cursorPreference],
  );

  const toggleLightDark = useCallback(() => {
    const current = appearanceMode;
    if (current === "system") {
      const next: AppearanceMode = resolvedAppearance === "dark" ? "light" : "dark";
      setAppearanceMode(next, { animate: false });
      return;
    }
    setAppearanceMode(current === "dark" ? "light" : "dark", { animate: false });
  }, [appearanceMode, resolvedAppearance, setAppearanceMode]);

  const applyCatalogPreset = useCallback(
    async (presetId: string) => {
      const resolved = resolveAppearance(appearanceMode);
      const payload = await fetchAndApplyCatalogPreset(presetId, resolved);
      if (!payload) return false;
      invalidateThemeStorageReadCache();
      setActivePresetId(presetId);
      setActivePresetSource("catalog");
      if (siteTheme) {
        forceApplyVisualEffects(
          resolveVisitorVisualExperience({
            site: siteTheme,
            storedEffects: {
              cursor: payload.cursor,
              backgroundEffect: payload.backgroundEffect,
              textEffect: payload.textEffect,
              cardStyle: payload.cardStyle,
              borderStyle: payload.borderStyle,
            },
            cursorPreference,
          }),
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
      invalidateThemeStorageReadCache();
      setActivePresetId(preset.id);
      setActivePresetSource("user");
      if (siteTheme) {
        forceApplyVisualEffects(
          resolveVisitorVisualExperience({
            site: siteTheme,
            storedEffects: {
              cursor: preset.cursor,
              backgroundEffect: preset.backgroundEffect,
              textEffect: preset.textEffect,
              cardStyle: preset.cardStyle,
              borderStyle: preset.borderStyle,
            },
            cursorPreference,
          }),
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
    invalidateThemeStorageReadCache();
    setActivePresetId(defaultPresetId ?? siteTheme?.activePresetId ?? null);
    setActivePresetSource("site");
    reconcileSiteHtmlAttributes(ssrHtmlAttributes);
    resetVisualEffectsCoordinator();
    if (siteTheme && siteResolved) {
      forceApplyVisualEffects(siteResolved);
    }
  }, [defaultPresetId, siteTheme, siteResolved, ssrHtmlAttributes]);

  const setCursorPreference = useCallback(
    (pref: CursorPreference) => {
      setCursorPreferenceState(pref);
      try {
        localStorage.setItem(CURSOR_PREF_STORAGE_KEY, pref);
      } catch {
        // ignore
      }
      const resolved = resolveAppearance(appearanceMode);
      applyVisitorEffects(resolved, pref, { force: true });
    },
    [appearanceMode, applyVisitorEffects],
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
