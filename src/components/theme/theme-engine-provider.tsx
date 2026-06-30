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
  type VisitorPersonalization,
  type UserCreatedPreset,
  fetchAndApplyCatalogPreset,
  applyUserPresetToDocument,
  notifyAppearanceChange,
  readStoredAppearanceMode,
  readStoredPresetId,
  readStoredPresetEffects,
  patchStoredPresetEffects,
  resolveAppearance,
  nextAppearanceMode,
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
  siteDefaultPresetId: string | null;
  visitorPresetId: string | null;
  effectivePresetId: string | null;
  activePresetSource: "site" | "catalog" | "user" | null;
  userPresets: UserCreatedPreset[];
  cursorPreference: CursorPreference;
  cursorEffect: string | null;
  visitorPersonalization: VisitorPersonalization;
  setAppearanceMode: (mode: AppearanceMode, options?: { animate?: boolean }) => void;
  toggleLightDark: () => void;
  applyCatalogPreset: (presetId: string) => Promise<{
    ok: boolean;
    reason?: "unavailable" | "request_failed";
    message?: string;
    status?: number | null;
  }>;
  applyUserPreset: (preset: UserCreatedPreset) => void;
  saveUserCreatedPreset: (
    input: Omit<UserCreatedPreset, "id" | "createdAt"> & { id?: string },
  ) => UserCreatedPreset;
  removeUserPreset: (id: string) => void;
  resetVisitorTheme: () => void;
  setCursorPreference: (pref: CursorPreference) => void;
  setVisitorCursorEffect: (effectId: string | null) => void;
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
  const visitorEffectsBootRef = useRef(false);
  const initialSiteDefaultPresetId =
    defaultPresetId ?? siteTheme?.siteDefaultPresetId ?? null;
  const [appearanceMode, setAppearanceModeState] = useState<AppearanceMode>(defaultAppearance);
  const [siteDefaultPresetId] = useState<string | null>(
    initialSiteDefaultPresetId,
  );
  const [visitorPresetId, setVisitorPresetId] = useState<string | null>(null);
  const [activePresetSource, setActivePresetSource] = useState<
    "site" | "catalog" | "user" | null
  >(initialSiteDefaultPresetId ? "site" : null);
  const [userPresets, setUserPresets] = useState<UserCreatedPreset[]>([]);
  const [cursorPreference, setCursorPreferenceState] = useState<CursorPreference>("custom");
  const [hydrated, setHydrated] = useState(false);

  const effectivePresetId = visitorPresetId ?? siteDefaultPresetId;

  const resolvedAppearance: ResolvedAppearance =
    resolvedTheme === "dark"
      ? "dark"
      : resolvedTheme === "light"
        ? "light"
        : resolveAppearance(appearanceMode);

  const cursorEffect = useMemo(() => {
    if (!siteTheme) return null;
    return resolveEngineExperience(siteTheme, cursorPreference).cursorEffect;
  }, [siteTheme, cursorPreference, appearanceMode, effectivePresetId]);

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
      setVisitorPresetId(null);
      setActivePresetSource("site");
      document.cookie = "theme-reset=; Max-Age=0; path=/";
      resetVisualEffectsCoordinator();
      reconcileSiteHtmlAttributes(ssrHtmlAttributes);
      if (siteResolved) {
        forceApplyVisualEffects(siteResolved);
        visitorEffectsBootRef.current = true;
      }
    } else {
      const storedPreset = readStoredPresetId();
      if (storedPreset) {
        setVisitorPresetId(storedPreset);
        setActivePresetSource(
          storedPreset.startsWith("user-") ? "user" : "catalog",
        );
      } else if (initialSiteDefaultPresetId) {
        setVisitorPresetId(null);
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
    if (!needsThemeReset) {
      reconcileSiteHtmlAttributes(ssrHtmlAttributes);
    }
    setHydrated(true);
  }, [initialSiteDefaultPresetId, refreshUserPresets, ssrHtmlAttributes, siteResolved]);

  useEffect(() => {
    if (!hydrated || !siteTheme || visitorEffectsBootRef.current) return;
    visitorEffectsBootRef.current = true;
    const resolved = resolveAppearance(appearanceMode);
    applyVisitorEffects(resolved, cursorPreference, { immediate: true });
  }, [hydrated, siteTheme, appearanceMode, cursorPreference, applyVisitorEffects]);

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
    const next = nextAppearanceMode(appearanceMode);
    setAppearanceMode(next, { animate: true });
  }, [appearanceMode, setAppearanceMode]);

  const applyCatalogPreset = useCallback(
    async (presetId: string) => {
      const resolved = resolveAppearance(appearanceMode);
      const result = await fetchAndApplyCatalogPreset(presetId, resolved);
      if (!result.ok) {
        return {
          ok: false,
          reason: result.reason,
          message: result.message,
          status: result.status,
        };
      }
      const { payload } = result;
      invalidateThemeStorageReadCache();
      setVisitorPresetId(presetId);
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
      return { ok: true };
    },
    [appearanceMode, siteTheme, cursorPreference],
  );

  const applyUserPreset = useCallback(
    (preset: UserCreatedPreset) => {
      const resolved = resolveAppearance(appearanceMode);
      applyUserPresetToDocument(preset, resolved);
      invalidateThemeStorageReadCache();
      setVisitorPresetId(preset.id);
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
      if (visitorPresetId === id) {
        setVisitorPresetId(null);
        setActivePresetSource("site");
      }
    },
    [visitorPresetId, refreshUserPresets],
  );

  const resetVisitorTheme = useCallback(() => {
    clearVisitorPresetOverrides();
    invalidateThemeStorageReadCache();
    setVisitorPresetId(null);
    setActivePresetSource("site");
    reconcileSiteHtmlAttributes(ssrHtmlAttributes);
    resetVisualEffectsCoordinator();
    if (siteTheme && siteResolved) {
      forceApplyVisualEffects(siteResolved);
    }
  }, [siteTheme, siteResolved, ssrHtmlAttributes]);

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

  const setVisitorCursorEffect = useCallback(
    (effectId: string | null) => {
      const normalized =
        effectId && effectId !== "default" && effectId !== "none" ? effectId : null;
      patchStoredPresetEffects({ cursor: normalized });
      const pref: CursorPreference = normalized ? "custom" : "normal";
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
    () => {
      const storedEffects = readStoredPresetEffects();
      const visitorPersonalization: VisitorPersonalization = {
        visitorPresetId,
        appearanceMode,
        cursorEffect: storedEffects?.cursor ?? null,
        backgroundEffect: storedEffects?.backgroundEffect ?? null,
        textEffect: storedEffects?.textEffect ?? null,
        cardStyle: storedEffects?.cardStyle ?? null,
        borderStyle: storedEffects?.borderStyle ?? null,
      };
      return {
        appearanceMode,
        resolvedAppearance,
        siteDefaultPresetId,
        visitorPresetId,
        effectivePresetId,
        activePresetSource,
        userPresets,
        cursorPreference,
        cursorEffect,
        visitorPersonalization,
        setAppearanceMode,
        toggleLightDark,
        applyCatalogPreset,
        applyUserPreset,
        saveUserCreatedPreset,
        removeUserPreset,
        resetVisitorTheme,
        setCursorPreference,
        setVisitorCursorEffect,
      };
    },
    [
      appearanceMode,
      resolvedAppearance,
      siteDefaultPresetId,
      visitorPresetId,
      effectivePresetId,
      activePresetSource,
      userPresets,
      cursorPreference,
      cursorEffect,
      setAppearanceMode,
      toggleLightDark,
      applyCatalogPreset,
      applyUserPreset,
      saveUserCreatedPreset,
      removeUserPreset,
      resetVisitorTheme,
      setCursorPreference,
      setVisitorCursorEffect,
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
