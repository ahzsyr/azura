"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useThemeEngine } from "@/components/theme/theme-engine-provider";
import {
  nextAppearanceMode,
  resolveAppearance,
  type AppearanceMode,
} from "@/features/theme/engine";

function modeIcon(mode: AppearanceMode): string {
  if (mode === "dark") return "🌙";
  if (mode === "light") return "☀️";
  return "◐";
}

/**
 * Fixed theme mode FAB — toggles light ↔ dark (System is a separate control).
 * Optimistic icon + pointerdown so the control responds before click-up / React commit.
 */
export function ThemeToggleFab() {
  const engine = useThemeEngine();
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<AppearanceMode>(engine.appearanceMode);
  const togglingRef = useRef(false);
  const handledByPointerRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMode(engine.appearanceMode);
  }, [engine.appearanceMode]);

  const toggle = useCallback(() => {
    if (togglingRef.current) return;
    togglingRef.current = true;

    const resolved = resolveAppearance(mode);
    const next = nextAppearanceMode(mode, resolved);
    setMode(next);
    engine.setAppearanceMode(next, { animate: true });

    requestAnimationFrame(() => {
      togglingRef.current = false;
    });
  }, [engine, mode]);

  if (!mounted) return null;

  return (
    <button
      type="button"
      id="theme-toggle"
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        handledByPointerRef.current = true;
        toggle();
      }}
      onClick={(event) => {
        // Suppress the trailing click after pointerdown; keep keyboard activation.
        if (handledByPointerRef.current) {
          handledByPointerRef.current = false;
          event.preventDefault();
          return;
        }
        toggle();
      }}
      aria-label={`Theme mode: ${mode}`}
      title={`Theme mode: ${mode}`}
    >
      {modeIcon(mode)}
    </button>
  );
}
