"use client";

import { useEffect } from "react";
import type { ResolvedPageTransitions } from "@/features/preloader/resolve-page-transitions";
import {
  pageTransitionCssVars,
  pageTransitionDataAttributes,
} from "@/lib/navigation/page-transitions";

type Props = {
  settings: ResolvedPageTransitions;
};

/**
 * Applies CMS page-transition preset to `<html>` for scoped view-transition CSS.
 */
export function PageTransitionAttributes({ settings }: Props) {
  useEffect(() => {
    const root = document.documentElement;
    const attrs = pageTransitionDataAttributes(
      settings.enabled,
      settings.preset,
      settings.durationMs,
      settings.sharedElementsEnabled !== false,
    );

    for (const [key, value] of Object.entries(attrs)) {
      root.setAttribute(key, value);
    }

    const vars = pageTransitionCssVars(settings.durationMs);
    for (const [key, value] of Object.entries(vars)) {
      root.style.setProperty(key, value);
    }

    return () => {
      root.removeAttribute("data-page-transition");
      root.removeAttribute("data-page-transition-enabled");
      root.removeAttribute("data-page-transition-duration");
      root.removeAttribute("data-shared-elements-enabled");
      root.style.removeProperty("--page-transition-duration");
      root.style.removeProperty("--page-transition-ease");
    };
  }, [settings.enabled, settings.preset, settings.durationMs, settings.sharedElementsEnabled]);

  return null;
}
