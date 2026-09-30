"use client";

import { useEffect } from "react";
import type { ThemeTypographySettings } from "@/schemas/theme";
import { collectThemeFonts } from "@/lib/theme/locale-fonts";
import { buildGoogleFontsHrefForFonts } from "@/lib/theme/font-registry";

const STUDIO_FONTS_LINK_ID = "theme-studio-typography-fonts";

/** Loads Google Fonts used by global and locale typography settings in Theme Studio. */
export function useTypographyFontLoader(typography: ThemeTypographySettings) {
  useEffect(() => {
    const href = buildGoogleFontsHrefForFonts(collectThemeFonts(typography));
    if (!href) return;

    let link = document.getElementById(STUDIO_FONTS_LINK_ID) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = STUDIO_FONTS_LINK_ID;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }

    if (link.href !== href) {
      link.href = href;
    }
  }, [typography]);
}
