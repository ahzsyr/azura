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
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={resolved.appearance.resolved}
      enableSystem
      enableColorScheme
      disableTransitionOnChange
      storageKey={PUBLIC_THEME_KEY}
      themes={["light", "dark", "system"]}
      scriptProps={nextThemesScriptProps()}
    >
      {children}
    </NextThemesProvider>
  );
}
