/**
 * Published-only theme merge helpers (pure where possible).
 * Server wiring that touches Prisma lives in theme-package-apply.server.ts.
 */
import { createHash } from "node:crypto";
import type { ThemePreset } from "@prisma/client";
import { syncPresetIdentityFields } from "@/features/theme/preset-identity";
import type { ThemeTokenPatch } from "@/platform/packages/theme-token-package";
import {
  CLEAR_CUSTOM_CSS,
  CLEAR_FOOTER_CONFIG,
  CLEAR_GLASS_EFFECT_SETTINGS,
  CLEAR_HEADER_CONFIG,
  CLEAR_MOBILE_BROWSER_CONFIG,
  CLEAR_MOTION_SETTINGS,
  CLEAR_VISUAL_EFFECT_SETTINGS,
  clearBrandConfig,
} from "@/platform/packages/theme-token-clear-values";

/** Columns copied by publishFromDraft — used for dirty-draft hashing. */
export const SITE_THEME_COMPARE_KEYS = [
  "preset",
  "siteDefaultPresetId",
  "activePresetId",
  "primaryColor",
  "secondaryColor",
  "typography",
  "faviconUrl",
  "logoUrl",
  "brandConfig",
  "headerConfig",
  "footerConfig",
  "animationsEnabled",
  "animationSpeed",
  "lazyLoadEnabled",
  "darkModeEnabled",
  "spacingScale",
  "customCss",
  "cursorEffect",
  "backgroundEffect",
  "textEffect",
  "cursorEffectEnabled",
  "backgroundEffectEnabled",
  "textEffectEnabled",
  "glassEffectEnabled",
  "backgroundEffectSettings",
  "cursorEffectSettings",
  "textEffectSettings",
  "glassEffectSettings",
  "motionSettings",
  "cardStyle",
  "borderStyle",
  "themeProvenance",
  "mobileBrowserConfig",
] as const;

export type SiteThemeComparable = Record<string, unknown> & {
  id?: string;
  updatedAt?: unknown;
};

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value as object).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`).join(",")}}`;
}

export function hashSiteThemeRow(row: SiteThemeComparable | null | undefined): string {
  if (!row) return createHash("sha256").update("null").digest("hex");
  const picked: Record<string, unknown> = {};
  for (const key of SITE_THEME_COMPARE_KEYS) {
    if (key in row) picked[key] = row[key];
  }
  return createHash("sha256").update(stableStringify(picked)).digest("hex");
}

export function isDraftDirtyVersusPublished(
  published: SiteThemeComparable | null | undefined,
  draft: SiteThemeComparable | null | undefined,
): boolean {
  if (!draft) return false;
  return hashSiteThemeRow(published) !== hashSiteThemeRow(draft);
}

export const DIRTY_DRAFT_MESSAGE =
  "Theme Studio has unpublished changes; publish or discard draft first.";

export type PublishedThemeFields = {
  preset: ThemePreset;
  siteDefaultPresetId: string | null;
  activePresetId: string | null;
  primaryColor: string;
  secondaryColor: string;
  typography: unknown;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  customCss?: string | null;
  brandConfig?: unknown;
  headerConfig?: unknown;
  footerConfig?: unknown;
  mobileBrowserConfig?: unknown;
  motionSettings?: unknown;
  glassEffectSettings?: unknown;
  cursorEffectSettings?: unknown;
  textEffectSettings?: unknown;
  backgroundEffectSettings?: unknown;
  cursorEffect?: string | null;
  backgroundEffect?: string | null;
  textEffect?: string | null;
  cursorEffectEnabled?: boolean;
  backgroundEffectEnabled?: boolean;
  textEffectEnabled?: boolean;
  glassEffectEnabled?: boolean;
  cardStyle?: string | null;
  borderStyle?: string | null;
  darkModeEnabled: boolean;
  animationsEnabled: boolean;
  lazyLoadEnabled: boolean;
  animationSpeed: number;
  spacingScale: number;
  themeProvenance: {
    sourcePresetId?: string | null;
    sourcePackageId?: string | null;
    sourcePackageVersion?: string | null;
    appliedAt?: string | null;
  };
};

export type ThemeTokenMergeOptions = {
  /** Resolved @font-face rows to persist on typography (activate path). */
  resolvedFontFaces?: Array<{
    family: string;
    url: string;
    format?: "woff2" | "woff" | "truetype" | "opentype";
  }>;
};

export function mergeThemeTokenPatchOntoPublished(
  published: PublishedThemeFields,
  patch: ThemeTokenPatch,
  packageId: string,
  packageVersion: string,
  options?: ThemeTokenMergeOptions,
): PublishedThemeFields {
  const next: PublishedThemeFields = {
    ...published,
    typography:
      typeof published.typography === "object" && published.typography && !Array.isArray(published.typography)
        ? { ...(published.typography as Record<string, unknown>) }
        : {},
    themeProvenance: {
      sourcePresetId: null,
      sourcePackageId: packageId,
      sourcePackageVersion: packageVersion,
      appliedAt: new Date().toISOString(),
    },
  };

  if (patch.primaryColor !== undefined) next.primaryColor = patch.primaryColor;
  if (patch.secondaryColor !== undefined) next.secondaryColor = patch.secondaryColor;
  if (patch.darkModeEnabled !== undefined) next.darkModeEnabled = patch.darkModeEnabled;
  if (patch.animationsEnabled !== undefined) next.animationsEnabled = patch.animationsEnabled;
  if (patch.lazyLoadEnabled !== undefined) next.lazyLoadEnabled = patch.lazyLoadEnabled;
  if (patch.animationSpeed !== undefined) next.animationSpeed = patch.animationSpeed;
  if (patch.spacingScale !== undefined) next.spacingScale = patch.spacingScale;
  if (patch.logoUrl !== undefined) next.logoUrl = patch.logoUrl;
  if (patch.faviconUrl !== undefined) next.faviconUrl = patch.faviconUrl;

  if (patch.customCss !== undefined) {
    next.customCss = patch.customCss === null ? CLEAR_CUSTOM_CSS : patch.customCss;
  }
  if (patch.brandConfig !== undefined) {
    next.brandConfig = patch.brandConfig === null ? clearBrandConfig() : patch.brandConfig;
  }
  if (patch.headerConfig !== undefined) {
    next.headerConfig = patch.headerConfig === null ? CLEAR_HEADER_CONFIG : patch.headerConfig;
  }
  if (patch.footerConfig !== undefined) {
    next.footerConfig = patch.footerConfig === null ? CLEAR_FOOTER_CONFIG : patch.footerConfig;
  }
  if (patch.mobileBrowserConfig !== undefined) {
    next.mobileBrowserConfig =
      patch.mobileBrowserConfig === null ? CLEAR_MOBILE_BROWSER_CONFIG : patch.mobileBrowserConfig;
  }
  if (patch.motionSettings !== undefined) {
    next.motionSettings =
      patch.motionSettings === null ? { ...CLEAR_MOTION_SETTINGS } : patch.motionSettings;
  }
  if (patch.backgroundEffectSettings !== undefined) {
    next.backgroundEffectSettings =
      patch.backgroundEffectSettings === null
        ? { ...CLEAR_VISUAL_EFFECT_SETTINGS }
        : patch.backgroundEffectSettings;
  }
  if (patch.cursorEffectSettings !== undefined) {
    next.cursorEffectSettings =
      patch.cursorEffectSettings === null
        ? { ...CLEAR_VISUAL_EFFECT_SETTINGS }
        : patch.cursorEffectSettings;
  }
  if (patch.textEffectSettings !== undefined) {
    next.textEffectSettings =
      patch.textEffectSettings === null
        ? { ...CLEAR_VISUAL_EFFECT_SETTINGS }
        : patch.textEffectSettings;
  }
  if (patch.glassEffectSettings !== undefined) {
    next.glassEffectSettings =
      patch.glassEffectSettings === null
        ? { ...CLEAR_GLASS_EFFECT_SETTINGS }
        : patch.glassEffectSettings;
  }
  if (patch.cursorEffect !== undefined) next.cursorEffect = patch.cursorEffect;
  if (patch.backgroundEffect !== undefined) next.backgroundEffect = patch.backgroundEffect;
  if (patch.textEffect !== undefined) next.textEffect = patch.textEffect;
  if (patch.cursorEffectEnabled !== undefined) next.cursorEffectEnabled = patch.cursorEffectEnabled;
  if (patch.backgroundEffectEnabled !== undefined) {
    next.backgroundEffectEnabled = patch.backgroundEffectEnabled;
  }
  if (patch.textEffectEnabled !== undefined) next.textEffectEnabled = patch.textEffectEnabled;
  if (patch.glassEffectEnabled !== undefined) next.glassEffectEnabled = patch.glassEffectEnabled;
  if (patch.cardStyle !== undefined) next.cardStyle = patch.cardStyle;
  if (patch.borderStyle !== undefined) next.borderStyle = patch.borderStyle;

  if (patch.typography || options?.resolvedFontFaces) {
    const typo = { ...(next.typography as Record<string, unknown>) };
    if (patch.typography) {
      if (patch.typography.bodyFont !== undefined) typo.bodyFont = patch.typography.bodyFont;
      if (patch.typography.headingFont !== undefined) typo.headingFont = patch.typography.headingFont;
      if (patch.typography.baseFontSize !== undefined) typo.baseFontSize = patch.typography.baseFontSize;
      if (patch.typography.headingScale !== undefined) typo.headingScale = patch.typography.headingScale;
      // Never persist unresolved package: fontFaces on SiteTheme.
      delete typo.fontFaces;
    }
    if (options?.resolvedFontFaces) {
      typo.fontFaces = options.resolvedFontFaces;
    }
    next.typography = typo;
  }

  let siteDefault = next.siteDefaultPresetId;
  if (patch.siteDefaultPresetId !== undefined) siteDefault = patch.siteDefaultPresetId;
  if (patch.preset !== undefined) {
    next.preset = patch.preset;
  }
  if (patch.preset !== undefined || patch.siteDefaultPresetId !== undefined) {
    const identity = syncPresetIdentityFields(siteDefault);
    next.siteDefaultPresetId = identity.siteDefaultPresetId;
    next.activePresetId = identity.activePresetId;
  }

  return next;
}
