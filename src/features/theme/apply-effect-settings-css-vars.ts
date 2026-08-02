import {
  resolveMotionRuntimeConfig,
  resolveVisualEffectRuntimeConfig,
} from "@/features/theme/effect-settings";
import type { ResolvedVisualExperience } from "@/features/theme/visual-experience-resolver";

export function buildEffectSettingsCssVarEntries(
  resolved: ResolvedVisualExperience,
): Array<[string, string]> {
  const cursor = resolveVisualEffectRuntimeConfig(
    resolved.cursorEffectSettings,
    resolved.animationSpeed,
    resolved.animationsEnabled,
  );
  const text = resolveVisualEffectRuntimeConfig(
    resolved.textEffectSettings,
    resolved.animationSpeed,
    resolved.animationsEnabled,
  );
  const motion = resolveMotionRuntimeConfig(
    resolved.motionSettings,
    resolved.animationSpeed,
    resolved.animationsEnabled,
  );

  const entries: Array<[string, string]> = [
    ["--motion-intensity", String(motion.intensity)],
    ["--motion-opacity", String(motion.opacity)],
    ["--cursor-effect-intensity", String(cursor.intensity)],
    ["--cursor-effect-opacity", String(cursor.opacity)],
    ["--cursor-effect-speed", String(cursor.speed)],
    ["--text-effect-intensity", String(text.intensity)],
    ["--text-effect-opacity", String(text.opacity)],
    ["--text-effect-speed", String(text.speed)],
  ];

  if (cursor.colors?.primary) {
    entries.push(["--cursor-effect-primary", cursor.colors.primary]);
  }
  if (cursor.colors?.accent) {
    entries.push(["--cursor-effect-accent", cursor.colors.accent]);
  }
  if (text.colors?.primary) {
    entries.push(["--text-effect-primary", text.colors.primary]);
  }
  if (text.colors?.accent) {
    entries.push(["--text-effect-accent", text.colors.accent]);
  }

  return entries;
}

export function buildEffectSettingsCssVars(resolved: ResolvedVisualExperience): string {
  return buildEffectSettingsCssVarEntries(resolved)
    .map(([key, value]) => `${key}:${value}`)
    .join(";");
}

const OPTIONAL_COLOR_VARS = [
  "--cursor-effect-primary",
  "--cursor-effect-accent",
  "--text-effect-primary",
  "--text-effect-accent",
] as const;

export function applyEffectSettingsCssVars(resolved: ResolvedVisualExperience): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const entries = buildEffectSettingsCssVarEntries(resolved);
  const setKeys = new Set(entries.map(([key]) => key));

  for (const [key, value] of entries) {
    root.style.setProperty(key, value);
  }

  for (const key of OPTIONAL_COLOR_VARS) {
    if (!setKeys.has(key)) {
      root.style.removeProperty(key);
    }
  }
}
