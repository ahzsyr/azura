"use client";

import { useEffect } from "react";
import { hasVisitorThemeOverrides } from "@/features/theme/engine/preset-session";

type Props = {
  cardStyle?: string | null;
  borderStyle?: string | null;
  siteDefaultPresetId?: string | null;
};

/** Sync site-published preset data-* hooks on `<html>` for global preset CSS. */
export function ThemePresetAttributes({ cardStyle, borderStyle, siteDefaultPresetId }: Props) {
  useEffect(() => {
    if (hasVisitorThemeOverrides()) return;

    const html = document.documentElement;
    if (siteDefaultPresetId) html.dataset.presetId = siteDefaultPresetId;
    else delete html.dataset.presetId;

    if (cardStyle) html.dataset.cardStyle = cardStyle;
    else delete html.dataset.cardStyle;

    if (borderStyle) html.dataset.borderStyle = borderStyle;
    else delete html.dataset.borderStyle;
  }, [cardStyle, borderStyle, siteDefaultPresetId]);

  return null;
}
