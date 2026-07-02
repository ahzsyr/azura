"use client";

import { useCallback, useEffect, useState } from "react";
import { useThemeEngine } from "@/components/theme/theme-engine-provider";
import type { AppearanceMode } from "@/features/theme/engine";

function modeIcon(mode: AppearanceMode): string {
  if (mode === "dark") return "🌙";
  if (mode === "light") return "☀️";
  return "◐";
}

/**
 * Fixed theme mode FAB — Astro Layout `#theme-toggle` parity (dark → light → system).
 */
export function ThemeToggleFab() {
  const engine = useThemeEngine();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggle = useCallback(() => {
    engine.toggleLightDark();
  }, [engine]);

  if (!mounted) return null;

  const mode = engine.appearanceMode;

  return (
    <button
      type="button"
      id="theme-toggle"
      onClick={toggle}
      aria-label={`Theme mode: ${mode}`}
      title={`Theme mode: ${mode}`}
    >
      {modeIcon(mode)}
    </button>
  );
}
