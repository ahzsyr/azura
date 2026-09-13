import type { CSSProperties } from "react";
import type { ThemeTokens } from "@/platform/schema-ui/theme/theme-tokens";
import { mergeTheme } from "@/platform/schema-ui/theme/theme-tokens";
import type { FxsFieldMode, FxsSectionStyle, FxsThemePreset } from "../types";

export type FxsThemeTokens = ThemeTokens & {
  preset: FxsThemePreset;
  fieldMode: FxsFieldMode;
  elevation: { sm: string; md: string; lg: string };
  motionDuration: string;
  fieldDensity: "comfortable" | "compact" | "spacious";
  sectionStyle: FxsSectionStyle;
  colors: {
    surface: string;
    surfaceMuted: string;
    border: string;
    borderFocus: string;
    success: string;
    danger: string;
  };
};

const baseColors = {
  surface: "var(--card, #fff)",
  surfaceMuted: "var(--muted, #f4f4f5)",
  border: "var(--border, #e4e4e7)",
  borderFocus: "var(--ring, var(--primary, #0891b2))",
  success: "var(--primary, #0891b2)",
  danger: "var(--destructive, #dc2626)",
};

const PRESETS: Record<FxsThemePreset, Partial<FxsThemeTokens>> = {
  minimal: {
    preset: "minimal",
    fieldMode: "classic",
    fieldDensity: "comfortable",
    sectionStyle: "flat" as FxsSectionStyle,
    inputHeight: "3rem",
    labelStyle: "above",
    radius: { sm: "0.375rem", md: "0.5rem", lg: "0.75rem" },
    spacing: { sm: "0.5rem", md: "1rem", lg: "1.5rem" },
    elevation: { sm: "none", md: "none", lg: "none" },
    motionDuration: "160ms",
    colors: baseColors,
  },
  modern: {
    preset: "modern",
    fieldMode: "floating",
    fieldDensity: "comfortable",
    sectionStyle: "filled" as FxsSectionStyle,
    inputHeight: "3.25rem",
    labelStyle: "floating",
    radius: { sm: "0.5rem", md: "0.75rem", lg: "1rem" },
    spacing: { sm: "0.625rem", md: "1.25rem", lg: "1.75rem" },
    elevation: {
      sm: "0 1px 2px rgba(0,0,0,0.04)",
      md: "0 4px 12px rgba(0,0,0,0.06)",
      lg: "0 8px 24px rgba(0,0,0,0.08)",
    },
    motionDuration: "180ms",
    colors: baseColors,
  },
  enterprise: {
    preset: "enterprise",
    fieldMode: "outlined",
    fieldDensity: "compact",
    sectionStyle: "card" as FxsSectionStyle,
    inputHeight: "2.75rem",
    labelStyle: "above",
    radius: { sm: "0.25rem", md: "0.375rem", lg: "0.5rem" },
    spacing: { sm: "0.375rem", md: "0.75rem", lg: "1.25rem" },
    elevation: {
      sm: "0 1px 1px rgba(0,0,0,0.03)",
      md: "0 2px 6px rgba(0,0,0,0.05)",
      lg: "0 4px 12px rgba(0,0,0,0.07)",
    },
    motionDuration: "150ms",
    colors: baseColors,
  },
  conversational: {
    preset: "conversational",
    fieldMode: "classic",
    fieldDensity: "spacious",
    sectionStyle: "flat" as FxsSectionStyle,
    inputHeight: "3.5rem",
    labelStyle: "above",
    radius: { sm: "0.75rem", md: "1rem", lg: "1.25rem" },
    spacing: { sm: "0.75rem", md: "1.5rem", lg: "2.5rem" },
    elevation: { sm: "none", md: "none", lg: "none" },
    motionDuration: "200ms",
    colors: baseColors,
  },
};

export function resolveFxsTheme(
  preset: FxsThemePreset = "modern",
  overrides?: Partial<FxsThemeTokens>,
): FxsThemeTokens {
  const pack = PRESETS[preset] ?? PRESETS.modern;
  const merged = mergeTheme({
    spacing: pack.spacing,
    radius: pack.radius,
    inputHeight: pack.inputHeight,
    labelStyle: pack.labelStyle,
    buttonVariant: pack.buttonVariant,
  });
  return {
    ...merged,
    preset,
    fieldMode: overrides?.fieldMode ?? pack.fieldMode ?? "classic",
    elevation: { ...(pack.elevation as FxsThemeTokens["elevation"]), ...overrides?.elevation },
    motionDuration: overrides?.motionDuration ?? pack.motionDuration ?? "160ms",
    fieldDensity: overrides?.fieldDensity ?? pack.fieldDensity ?? "comfortable",
    sectionStyle: overrides?.sectionStyle ?? pack.sectionStyle ?? "card",
    colors: { ...baseColors, ...pack.colors, ...overrides?.colors },
    ...overrides,
    spacing: { ...merged.spacing, ...overrides?.spacing },
    radius: { ...merged.radius, ...overrides?.radius },
  };
}

export function fxsThemeToCssVars(theme: FxsThemeTokens): CSSProperties {
  return {
    ["--schema-space-sm" as string]: theme.spacing.sm,
    ["--schema-space-md" as string]: theme.spacing.md,
    ["--schema-space-lg" as string]: theme.spacing.lg,
    ["--schema-radius-sm" as string]: theme.radius.sm,
    ["--schema-radius-md" as string]: theme.radius.md,
    ["--schema-radius-lg" as string]: theme.radius.lg,
    ["--schema-input-height" as string]: theme.inputHeight,
    ["--fxs-motion" as string]: theme.motionDuration,
    ["--fxs-elev-sm" as string]: theme.elevation.sm,
    ["--fxs-elev-md" as string]: theme.elevation.md,
    ["--fxs-elev-lg" as string]: theme.elevation.lg,
    ["--fxs-border" as string]: theme.colors.border,
    ["--fxs-border-focus" as string]: theme.colors.borderFocus,
    ["--fxs-success" as string]: theme.colors.success,
    ["--fxs-danger" as string]: theme.colors.danger,
    ["--fxs-surface" as string]: theme.colors.surface,
    ["--fxs-surface-muted" as string]: theme.colors.surfaceMuted,
  };
}

export const FXS_THEME_PRESETS = Object.keys(PRESETS) as FxsThemePreset[];
