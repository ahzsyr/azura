"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { PUBLIC_THEME_KEY } from "@/lib/theme/apply-theme-transition";
import { nextThemesScriptProps } from "@/lib/theme/next-themes-script-props";
import type { ResolvedTheme } from "@/lib/theme/theme-resolver";

export function ThemeWrapper({
  children,
  resolved,
}: {
  children: React.ReactNode;
  resolved: ResolvedTheme;
}) {
  const darkModeEnabled = resolved.config.appearance.darkModeEnabled;
  const defaultMode = resolved.config.appearance.defaultMode;

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={defaultMode}
      enableSystem={darkModeEnabled}
      enableColorScheme
      disableTransitionOnChange
      storageKey={PUBLIC_THEME_KEY}
      themes={darkModeEnabled ? ["light", "dark", "system"] : ["light"]}
      scriptProps={nextThemesScriptProps()}
    >
      {children}
    </NextThemesProvider>
  );
}
