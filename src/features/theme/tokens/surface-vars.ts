import {
  isLightBackground,
  type ResolvedSurfaces,
} from "@/features/theme/surfaces/theme-surfaces";

const LIGHT_CARD_TEXT = "#0f172a";

function cardForegroundForSurface(surfaces: ResolvedSurfaces): string {
  return isLightBackground(surfaces.surface) ? LIGHT_CARD_TEXT : surfaces.text;
}

/** Apply resolved surfaces to `document.documentElement` (client-only). */
export function applySurfaceCssVars(
  html: HTMLElement,
  surfaces: ResolvedSurfaces,
  primary: string,
): void {
  const cardFg = cardForegroundForSurface(surfaces);

  html.style.setProperty("--background", surfaces.background);
  html.style.setProperty("--foreground", surfaces.text);
  html.style.setProperty("--card", surfaces.surface);
  html.style.setProperty("--card-foreground", cardFg);
  html.style.setProperty("--color-surface", surfaces.surface);
  html.style.setProperty("--sur", surfaces.surface);
  html.style.setProperty("--bg", surfaces.background);
  html.style.setProperty("--border", surfaces.border);
  html.style.setProperty("--input", surfaces.border);
  html.style.setProperty("--muted", surfaces.surface);
  html.style.setProperty("--muted-foreground", surfaces.textMuted);
  html.style.setProperty("--az-bg-primary", surfaces.background);
  html.style.setProperty("--az-bg-secondary", surfaces.surface);
  html.style.setProperty("--az-text-primary", surfaces.text);
  html.style.setProperty("--az-text-secondary", surfaces.textMuted);
  html.style.setProperty("--az-color-bg", surfaces.background);
  html.style.setProperty("--az-color-surface", surfaces.surface);
  html.style.setProperty("--az-color-text", surfaces.text);
  html.style.setProperty("--az-color-muted", surfaces.textMuted);
  html.style.setProperty("--az-color-border", surfaces.border);
  html.style.setProperty("--az-shadow-ambient", surfaces.shadowAmbient);
  html.style.setProperty(
    "--az-text-tertiary",
    `color-mix(in srgb, ${surfaces.textMuted} 88%, ${surfaces.background})`,
  );
  html.style.setProperty("--az-canvas-well", surfaces.canvasWell);
  html.style.setProperty("--az-canvas-chrome", surfaces.canvasChrome);
  html.style.setProperty("--az-border-subtle", surfaces.border);
}

export function surfaceCssBlock(surfaces: ResolvedSurfaces, mode: "light" | "dark"): string {
  const tertiary =
    mode === "light"
      ? "#a1a1aa"
      : `color-mix(in srgb, ${surfaces.textMuted} 88%, ${surfaces.background})`;
  const onAccent = mode === "light" ? "#fafafa" : "#0b1220";
  const success = mode === "light" ? "#16a34a" : "#22c55e";
  const warning = mode === "light" ? "#d97706" : "#f59e0b";
  const danger = mode === "light" ? "#dc2626" : "#ef4444";
  const dangerMuted = mode === "light" ? "#991b1b" : "#fecaca";

  return [
    `--az-bg-primary:${surfaces.background}`,
    `--az-bg-secondary:${surfaces.surface}`,
    `--az-text-primary:${surfaces.text}`,
    `--az-text-secondary:${surfaces.textMuted}`,
    `--az-color-bg:${surfaces.background}`,
    `--az-color-surface:${surfaces.surface}`,
    `--az-color-text:${surfaces.text}`,
    `--az-color-muted:${surfaces.textMuted}`,
    `--az-text-on-accent:${onAccent}`,
    `--az-text-tertiary:${tertiary}`,
    `--az-canvas-well:${surfaces.canvasWell}`,
    `--az-canvas-chrome:${surfaces.canvasChrome}`,
    `--az-shadow-ambient:${surfaces.shadowAmbient}`,
    `--az-success:${success}`,
    `--az-warning:${warning}`,
    `--az-danger:${danger}`,
    `--az-danger-muted:${dangerMuted}`,
    `--background:${surfaces.background}`,
    `--foreground:${surfaces.text}`,
    `--card:${surfaces.surface}`,
    `--card-foreground:${cardForegroundForSurface(surfaces)}`,
    `--popover:${surfaces.surface}`,
    `--popover-foreground:${surfaces.text}`,
    `--muted:${surfaces.canvasWell}`,
    `--muted-foreground:${surfaces.textMuted}`,
    `--border:${surfaces.border}`,
    `--input:${surfaces.border}`,
    `--color-surface:${surfaces.surface}`,
    `--sur:${surfaces.surface}`,
    `--bg:${surfaces.background}`,
  ].join(";");
}
