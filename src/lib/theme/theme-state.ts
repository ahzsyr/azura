import type { ThemeTokens } from "@/types/theme";
import type {
  AppearanceMode,
  PresetColorTokens,
  ResolvedAppearance,
} from "@/features/theme/engine/types";
import { resolveThemeSurfaces } from "@/features/theme/surfaces/theme-surfaces";
import { resolveAppearance } from "@/lib/theme/resolve-appearance";
import {
  resolveBrowserProjection,
  type BrowserProjection,
} from "@/lib/theme/browser-chrome-projection";

export type ThemeRuntimeStatus = "boot" | "hydrated" | "projecting" | "error";

export type ThemeState = {
  appearance: AppearanceMode;
  resolvedAppearance: ResolvedAppearance;
  presetId: string | null;
  presetColors: PresetColorTokens | null;
  surfaces: {
    light: ReturnType<typeof resolveThemeSurfaces>;
    dark: ReturnType<typeof resolveThemeSurfaces>;
    active: ReturnType<typeof resolveThemeSurfaces>;
  };
  browserProjection: BrowserProjection;
  cssProjection: {
    background: string;
    surface: string;
  };
  runtimeStatus: ThemeRuntimeStatus;
  version: number;
};

export type BuildThemeStateInput = {
  siteTheme: ThemeTokens | null;
  appearance: AppearanceMode;
  visitorPresetId?: string | null;
  visitorColors?: PresetColorTokens | null;
  prefersDark?: boolean;
  runtimeStatus?: ThemeRuntimeStatus;
  version?: number;
};

/** Build canonical ThemeState from site + visitor + appearance (pure aside from matchMedia via resolveAppearance on client). */
export function buildThemeState(input: BuildThemeStateInput): ThemeState {
  const {
    siteTheme,
    appearance,
    visitorPresetId = null,
    visitorColors = null,
    prefersDark,
    runtimeStatus = "hydrated",
    version = 1,
  } = input;

  const resolvedAppearance = resolveAppearance(appearance, { prefersDark });
  const presetColors = visitorColors ?? siteTheme?.presetColors ?? null;
  const primary = siteTheme?.primaryColor ?? "#6366f1";
  const light = resolveThemeSurfaces(presetColors, "light", primary);
  const dark = resolveThemeSurfaces(presetColors, "dark", primary);
  const active = resolvedAppearance === "dark" ? dark : light;
  const browserProjection = resolveBrowserProjection(siteTheme, visitorColors);

  return {
    appearance,
    resolvedAppearance,
    presetId: visitorPresetId ?? siteTheme?.siteDefaultPresetId ?? null,
    presetColors,
    surfaces: { light, dark, active },
    browserProjection,
    cssProjection: {
      background: active.background,
      surface: active.surface,
    },
    runtimeStatus,
    version,
  };
}
