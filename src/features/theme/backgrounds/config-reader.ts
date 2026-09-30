import type { BackgroundRuntimeConfig } from "./types";

const DEFAULTS: BackgroundRuntimeConfig = {
  intensity: 1,
  opacity: 1,
  speed: 1,
  animationsEnabled: true,
};

function readVar(name: string, fallback: number): number {
  if (typeof document === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
}

/** Read live background tuning from SSR-injected CSS custom properties. */
export function readBackgroundConfig(): BackgroundRuntimeConfig {
  const speed = readVar("--bg-effect-speed", DEFAULTS.speed);
  return {
    intensity: readVar("--bg-effect-intensity", DEFAULTS.intensity),
    opacity: readVar("--bg-effect-opacity", DEFAULTS.opacity),
    speed,
    animationsEnabled: speed > 0,
  };
}

export function runtimeConfigSignature(config: BackgroundRuntimeConfig): string {
  return `${config.intensity}|${config.opacity}|${config.speed}|${config.animationsEnabled}`;
}
