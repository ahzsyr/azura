import { cn } from "@/lib/utils";

export function presetSurfaceClass(...extra: Array<string | false | null | undefined>): string {
  return cn("az-card", "az-preset-surface", ...extra);
}

export function presetGlassClass(...extra: Array<string | false | null | undefined>): string {
  return cn("az-card", "az-glass-panel", ...extra);
}

export function presetHeroGradientClass(...extra: Array<string | false | null | undefined>): string {
  return cn("az-preset-hero-gradient", ...extra);
}
