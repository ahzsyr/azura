"use client";

import { useEffect } from "react";

type Props = {
  cardStyle?: string | null;
  borderStyle?: string | null;
  activePresetId?: string | null;
};

/** Sync site-published preset data-* hooks on `<html>` for global preset CSS. */
export function ThemePresetAttributes({ cardStyle, borderStyle, activePresetId }: Props) {
  useEffect(() => {
    const html = document.documentElement;
    if (activePresetId) html.dataset.presetId = activePresetId;
    else delete html.dataset.presetId;

    if (cardStyle) html.dataset.cardStyle = cardStyle;
    else delete html.dataset.cardStyle;

    if (borderStyle) html.dataset.borderStyle = borderStyle;
    else delete html.dataset.borderStyle;
  }, [cardStyle, borderStyle, activePresetId]);

  return null;
}
