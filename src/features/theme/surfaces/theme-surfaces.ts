import type { PresetColorTokens } from "@/features/theme/engine/types";

/** Astro sample defaults — dark canvas / light neutrals */
export const DEFAULT_DARK_SURFACES = {
  background: "#020408",
  surface: "#0a0f18",
  text: "#e2e8f0",
  textMuted: "#64748b",
} as const;

export const DEFAULT_LIGHT_SURFACES = {
  background: "#fafafa",
  surface: "#ffffff",
  text: "#18181b",
  textMuted: "#71717a",
  border: "#e4e4e7",
  canvasWell: "#f4f4f5",
} as const;

export type ResolvedSurfaces = {
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  canvasWell: string;
  canvasChrome: string;
  shadowAmbient: string;
};

function hexToLuminance(hex: string): number {
  const n = hex.replace("#", "");
  if (n.length !== 6) return 0;
  const r = parseInt(n.slice(0, 2), 16) / 255;
  const g = parseInt(n.slice(2, 4), 16) / 255;
  const b = parseInt(n.slice(4, 6), 16) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function isLightBackground(hex: string | undefined): boolean {
  if (!hex) return false;
  return hexToLuminance(hex) > 0.55;
}

function borderDarkFromPrimary(primary: string): string {
  return `color-mix(in srgb, ${primary} 14%, transparent)`;
}

/** Resolve canvas colors for light or dark appearance (sample token semantics). */
export function resolveThemeSurfaces(
  colors: PresetColorTokens | null | undefined,
  mode: "light" | "dark",
  primary: string,
): ResolvedSurfaces {
  const c: PresetColorTokens = {
    primary,
    accent: colors?.accent ?? primary,
    ...colors,
  };
  const usePresetInLight = mode === "light" && isLightBackground(c.background);
  const usePresetInDark = mode === "dark" && c.background && !isLightBackground(c.background);

  if (mode === "light") {
    if (usePresetInLight) {
      const bg = c.background!;
      const surface = c.surface ?? "#ffffff";
      return {
        background: bg,
        surface,
        text: c.text ?? DEFAULT_LIGHT_SURFACES.text,
        textMuted: c.textMuted ?? DEFAULT_LIGHT_SURFACES.textMuted,
        border: `color-mix(in srgb, ${primary} 8%, ${DEFAULT_LIGHT_SURFACES.border})`,
        canvasWell: `color-mix(in srgb, ${bg} 92%, ${primary} 8%)`,
        canvasChrome: "color-mix(in srgb, var(--az-bg-secondary) 65%, transparent)",
        shadowAmbient: "rgb(15 23 42 / 0.12)",
      };
    }
    return {
      background: DEFAULT_LIGHT_SURFACES.background,
      surface: DEFAULT_LIGHT_SURFACES.surface,
      text: DEFAULT_LIGHT_SURFACES.text,
      textMuted: DEFAULT_LIGHT_SURFACES.textMuted,
      border: DEFAULT_LIGHT_SURFACES.border,
      canvasWell: DEFAULT_LIGHT_SURFACES.canvasWell,
      canvasChrome: "color-mix(in srgb, var(--az-bg-secondary) 65%, transparent)",
      shadowAmbient: "rgb(15 23 42 / 0.12)",
    };
  }

  if (usePresetInDark) {
    const bg = c.background!;
    const surface = c.surface ?? c.background ?? DEFAULT_DARK_SURFACES.surface;
    const text = c.text ?? DEFAULT_DARK_SURFACES.text;
    const muted = c.textMuted ?? DEFAULT_DARK_SURFACES.textMuted;
    return {
      background: bg,
      surface,
      text,
      textMuted: muted,
      border: borderDarkFromPrimary(primary),
      canvasWell: `color-mix(in srgb, ${bg} 92%, ${primary} 8%)`,
      canvasChrome: `color-mix(in srgb, ${surface} 72%, transparent)`,
      shadowAmbient: "rgb(0 0 0 / 0.45)",
    };
  }

  return {
    background: DEFAULT_DARK_SURFACES.background,
    surface: DEFAULT_DARK_SURFACES.surface,
    text: DEFAULT_DARK_SURFACES.text,
    textMuted: DEFAULT_DARK_SURFACES.textMuted,
    border: borderDarkFromPrimary(primary),
    canvasWell: `color-mix(in srgb, ${DEFAULT_DARK_SURFACES.background} 92%, ${primary} 8%)`,
    canvasChrome: `color-mix(in srgb, ${DEFAULT_DARK_SURFACES.surface} 72%, transparent)`,
    shadowAmbient: "rgb(0 0 0 / 0.45)",
  };
}
