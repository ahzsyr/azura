"use client";

import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { ADMIN_THEME_KEY } from "@/lib/theme/apply-theme-transition";
import { nextThemesScriptProps } from "@/lib/theme/next-themes-script-props";

type Theme = "light" | "dark" | "system";

type AdminThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark";
};

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      enableColorScheme
      disableTransitionOnChange={false}
      storageKey={ADMIN_THEME_KEY}
      themes={["light", "dark", "system"]}
      scriptProps={nextThemesScriptProps()}
    >
      {children}
    </NextThemesProvider>
  );
}

export function useAdminTheme(): AdminThemeContextValue {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return {
    theme: (theme as Theme) ?? "light",
    setTheme: setTheme as (theme: Theme) => void,
    resolvedTheme: resolvedTheme === "dark" ? "dark" : "light",
  };
}
