"use client";

import {
  createContext,
  useContext,
  useMemo,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import type { FxsFieldMode, FxsThemePreset } from "../types";
import {
  fxsThemeToCssVars,
  resolveFxsTheme,
  type FxsThemeTokens,
} from "./theme-tokens";

type FxsThemeContextValue = {
  theme: FxsThemeTokens;
  preset: FxsThemePreset;
  fieldMode: FxsFieldMode;
};

const FxsThemeContext = createContext<FxsThemeContextValue | null>(null);

export function FxsThemeProvider({
  preset = "modern",
  fieldMode,
  children,
  className,
  style,
}: {
  preset?: FxsThemePreset;
  fieldMode?: FxsFieldMode;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const value = useMemo(() => {
    const theme = resolveFxsTheme(preset, fieldMode ? { fieldMode } : undefined);
    return {
      theme,
      preset: theme.preset,
      fieldMode: theme.fieldMode,
    };
  }, [preset, fieldMode]);

  return (
    <FxsThemeContext.Provider value={value}>
      <div
        className={cn("fxs-theme schema-theme", className)}
        data-fxs-preset={value.preset}
        data-fxs-field-mode={value.fieldMode}
        data-fxs-density={value.theme.fieldDensity}
        style={{ ...fxsThemeToCssVars(value.theme), ...style }}
      >
        {children}
      </div>
    </FxsThemeContext.Provider>
  );
}

export function useFxsTheme(): FxsThemeContextValue {
  const ctx = useContext(FxsThemeContext);
  if (!ctx) {
    const theme = resolveFxsTheme("modern");
    return { theme, preset: "modern", fieldMode: theme.fieldMode };
  }
  return ctx;
}
