import { resolveBackgroundRuntimeConfig } from "@/features/theme/backgrounds/settings";
import type { ThemeTokens } from "@/types/theme";
import { PUBLIC_MOTION } from "@/lib/motion/public-motion";

export const MOTION_TOKENS = {
  scale: "--motion-scale",
  speed: "--animation-speed",
  durationFast: "--motion-duration-fast",
  durationNormal: "--motion-duration-normal",
  durationSlow: "--motion-duration-slow",
  easeStandard: "--motion-ease-standard",
  easeEmphasized: "--motion-ease-emphasized",
} as const;

const EASE_STANDARD = PUBLIC_MOTION.easeCss;
const EASE_EMPHASIZED = PUBLIC_MOTION.easeCss;

function buildBackgroundEffectCssVars(tokens: ThemeTokens): string {
  const runtime = resolveBackgroundRuntimeConfig(
    tokens.backgroundEffectSettings,
    tokens.animationSpeed,
    tokens.animationsEnabled,
  );
  return [
    `--bg-effect-intensity:${runtime.intensity}`,
    `--bg-effect-opacity:${runtime.opacity}`,
    `--bg-effect-speed:${runtime.speed}`,
  ].join(";");
}

export function buildMotionCss(tokens: ThemeTokens): string {
  const factor = tokens.animationsEnabled ? tokens.animationSpeed : 0.01;
  const bgVars = buildBackgroundEffectCssVars(tokens);
  const fast = `${Math.round(150 * factor)}ms`;
  const normal = `${Math.round(300 * factor)}ms`;
  const slow = `${Math.round(500 * factor)}ms`;

  if (!tokens.animationsEnabled) {
    return `html { --motion-scale:0; --animation-speed:0; ${bgVars}; }
html[data-motion="off"] *,
html:not([data-motion]) * {
  animation-duration:0.01ms !important;
  animation-iteration-count:1 !important;
  transition-duration:0.01ms !important;
}`;
  }

  return `html {
  --motion-scale:${tokens.animationSpeed};
  --animation-speed:${tokens.animationSpeed};
  ${bgVars};
  --motion-duration-fast:${fast};
  --motion-duration-normal:${normal};
  --motion-duration-slow:${slow};
  --motion-ease-standard:${EASE_STANDARD};
  --motion-ease-emphasized:${EASE_EMPHASIZED};
}`;
}
