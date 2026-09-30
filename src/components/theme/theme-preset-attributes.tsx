"use client";

import { useEffect } from "react";
import { hasVisitorThemeOverrides } from "@/features/theme/engine/preset-session";

type Props = {
  cardStyle?: string | null;
  borderStyle?: string | null;
  siteDefaultPresetId?: string | null;
  glassEffectEnabled?: boolean;
};

/**
 * Sync site-published preset data-* hooks on `<html>` for global preset CSS.
 * Liquid Glass controller lifecycle is owned exclusively by effects-runtime.
 */
export function ThemePresetAttributes({
  cardStyle,
  borderStyle,
  siteDefaultPresetId,
  glassEffectEnabled = false,
}: Props) {
  useEffect(() => {
    if (hasVisitorThemeOverrides()) return;

    const html = document.documentElement;
    if (siteDefaultPresetId) html.dataset.presetId = siteDefaultPresetId;
    else delete html.dataset.presetId;

    if (cardStyle) html.dataset.cardStyle = cardStyle;
    else delete html.dataset.cardStyle;

    if (borderStyle) html.dataset.borderStyle = borderStyle;
    else delete html.dataset.borderStyle;

    html.dataset.glassEffect = glassEffectEnabled ? "liquid" : "off";
  }, [cardStyle, borderStyle, siteDefaultPresetId, glassEffectEnabled]);

  return null;
}
