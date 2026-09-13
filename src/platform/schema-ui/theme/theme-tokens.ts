export type ThemeTokens = {
  spacing: Record<string, string>;
  radius: Record<string, string>;
  inputHeight: string;
  labelStyle: "above" | "floating" | "inline";
  buttonVariant: string;
  /** Optional FXS extensions (ignored by older consumers). */
  elevation?: Record<string, string>;
  motionDuration?: string;
  fieldDensity?: "comfortable" | "compact" | "spacious";
  sectionStyle?: "flat" | "card" | "bordered" | "filled" | "collapsible" | "accordion" | "soft";
};

export const defaultTheme: ThemeTokens = {
  spacing: { sm: "0.5rem", md: "1rem", lg: "1.5rem" },
  radius: { sm: "0.375rem", md: "0.5rem", lg: "0.75rem" },
  inputHeight: "3rem",
  labelStyle: "above",
  buttonVariant: "default",
  elevation: {
    sm: "0 1px 2px rgba(0,0,0,0.04)",
    md: "0 4px 12px rgba(0,0,0,0.06)",
    lg: "0 8px 24px rgba(0,0,0,0.08)",
  },
  motionDuration: "160ms",
  fieldDensity: "comfortable",
  sectionStyle: "card",
};

export function mergeTheme(overrides?: Partial<ThemeTokens>): ThemeTokens {
  if (!overrides) return defaultTheme;
  return {
    ...defaultTheme,
    ...overrides,
    spacing: { ...defaultTheme.spacing, ...overrides.spacing },
    radius: { ...defaultTheme.radius, ...overrides.radius },
    elevation: { ...defaultTheme.elevation, ...overrides.elevation },
  };
}
