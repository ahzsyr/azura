"use client";

import { useEffect } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { PUBLIC_THEME_KEY } from "@/lib/theme/apply-theme-transition";
import { nextThemesScriptProps } from "@/lib/theme/next-themes-script-props";
import type { ThemeTokens } from "@/types/theme";

export function ThemeWrapper({
  children,
  tokens,
}: {
  children: React.ReactNode;
  tokens: ThemeTokens | null;
}) {
  const lazyLoad = tokens?.lazyLoadEnabled ?? true;
  const spacing = tokens?.spacingScale ?? 1;

  useEffect(() => {
    const html = document.documentElement;
    html.dataset.lazyLoad = lazyLoad ? "true" : "false";
    if (spacing !== 1) {
      html.dataset.themeSpacing = "true";
    } else {
      delete html.dataset.themeSpacing;
    }
    return () => {
      delete html.dataset.lazyLoad;
      delete html.dataset.themeSpacing;
    };
  }, [lazyLoad, spacing]);

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      enableColorScheme
      disableTransitionOnChange={false}
      storageKey={PUBLIC_THEME_KEY}
      themes={["light", "dark", "system"]}
      scriptProps={nextThemesScriptProps()}
    >
      {children}
    </NextThemesProvider>
  );
}
