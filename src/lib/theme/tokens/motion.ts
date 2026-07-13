import { resolveBackgroundRuntimeConfig } from "@/features/theme/backgrounds/settings";
import {
  resolveMotionRuntimeConfig,
  resolveVisualEffectRuntimeConfig,
} from "@/features/theme/effect-settings";
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

function buildMotionEffectCssVars(tokens: ThemeTokens): string {
  const motion = resolveMotionRuntimeConfig(
    tokens.motionSettings,
    tokens.animationSpeed,
    tokens.animationsEnabled,
  );
  const cursor = resolveVisualEffectRuntimeConfig(
    tokens.cursorEffectSettings,
    tokens.animationSpeed,
    tokens.animationsEnabled,
  );
  const text = resolveVisualEffectRuntimeConfig(
    tokens.textEffectSettings,
    tokens.animationSpeed,
    tokens.animationsEnabled,
  );

  const parts = [
    `--motion-intensity:${motion.intensity}`,
    `--motion-opacity:${motion.opacity}`,
    `--cursor-effect-intensity:${cursor.intensity}`,
    `--cursor-effect-opacity:${cursor.opacity}`,
    `--cursor-effect-speed:${cursor.speed}`,
    `--text-effect-intensity:${text.intensity}`,
    `--text-effect-opacity:${text.opacity}`,
    `--text-effect-speed:${text.speed}`,
  ];

  if (cursor.colors?.primary) parts.push(`--cursor-effect-primary:${cursor.colors.primary}`);
  if (cursor.colors?.accent) parts.push(`--cursor-effect-accent:${cursor.colors.accent}`);
  if (text.colors?.primary) parts.push(`--text-effect-primary:${text.colors.primary}`);
  if (text.colors?.accent) parts.push(`--text-effect-accent:${text.colors.accent}`);

  return parts.join(";");
}

export function buildMotionCss(tokens: ThemeTokens): string {
  const factor = tokens.animationsEnabled ? tokens.animationSpeed : 0.01;
  const bgVars = buildBackgroundEffectCssVars(tokens);
  const effectVars = buildMotionEffectCssVars(tokens);
  const motionIntensity = tokens.motionSettings?.intensity ?? 1;
  const fast = `${Math.round(150 * factor * motionIntensity)}ms`;
  const normal = `${Math.round(300 * factor * motionIntensity)}ms`;
  const slow = `${Math.round(500 * factor * motionIntensity)}ms`;

  if (!tokens.animationsEnabled) {
    return `html { --motion-scale:0; --animation-speed:0; ${bgVars}; ${effectVars}; }
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
  ${effectVars};
  --motion-duration-fast:${fast};
  --motion-duration-normal:${normal};
  --motion-duration-slow:${slow};
  --motion-ease-standard:${EASE_STANDARD};
  --motion-ease-emphasized:${EASE_EMPHASIZED};
}`;
}
