import {
  isLightBackground,
  type ResolvedSurfaces,
} from "@/features/theme/surfaces/theme-surfaces";
import { buildAliasDeclarations } from "@/lib/theme/tokens/aliases";
import { surfacesToSemanticRecord } from "@/lib/theme/tokens/semantic";
import { toModernColor } from "@/lib/theme/tokens/color-utils";

const LIGHT_CARD_TEXT = "#0f172a";

function cardForegroundForSurface(surfaces: ResolvedSurfaces): string {
  return isLightBackground(surfaces.surface) ? LIGHT_CARD_TEXT : surfaces.text;
}

/** @deprecated Pipeline sets semantic tokens directly. Kept for legacy callers. */
export function surfaceCssBlock(surfaces: ResolvedSurfaces, mode: "light" | "dark"): string {
  const semantic = surfacesToSemanticRecord(
    surfaces,
    { primary: "var(--primary)", accent: "var(--accent)" },
    "var(--radius)",
    mode,
  );
  return Object.entries(semantic)
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
}

/** Apply resolved surfaces — canonical semantic tokens + generated aliases. */
export function applySurfaceCssVars(
  html: HTMLElement,
  surfaces: ResolvedSurfaces,
  primary: string,
  mode: "light" | "dark" = "dark",
): void {
  const radius = getComputedStyle(html).getPropertyValue("--radius").trim() || "0.75rem";
  const accent =
    getComputedStyle(html).getPropertyValue("--accent").trim() || primary;

  const semantic = surfacesToSemanticRecord(
    surfaces,
    { primary, accent },
    radius,
    mode,
  );

  for (const [key, value] of Object.entries(semantic)) {
    html.style.setProperty(key, value);
  }

  html.style.setProperty("--card-foreground", cardForegroundForSurface(surfaces));
  html.style.setProperty("--muted-foreground", surfaces.textMuted);
  html.style.setProperty(
    "--az-text-tertiary",
    mode === "light"
      ? "#a1a1aa"
      : `color-mix(in oklch, ${surfaces.textMuted} 88%, ${surfaces.background})`,
  );
  html.style.setProperty("--az-canvas-well", surfaces.canvasWell);
  html.style.setProperty("--az-canvas-chrome", surfaces.canvasChrome);
  html.style.setProperty("--az-shadow-ambient", surfaces.shadowAmbient);

  for (const decl of buildAliasDeclarations()) {
    const idx = decl.indexOf(":");
    if (idx === -1) continue;
    html.style.setProperty(decl.slice(0, idx), decl.slice(idx + 1));
  }
}
