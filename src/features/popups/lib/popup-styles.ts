import type { CSSProperties } from "react";
import type { PopupCustomOffset, PopupDesign, PopupItem } from "@/features/popups/popup.schema";

const NEUTRAL_BORDER =
  "color-mix(in srgb, var(--foreground) 10%, transparent)";

/** Rough relative luminance for #rgb / #rrggbb / rgb() — used to pick contrasting text. */
function colorLuminance(input: string): number | null {
  const value = input.trim();
  let r = 0;
  let g = 0;
  let b = 0;

  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const h = hex[1]!;
    if (h.length === 3) {
      r = parseInt(h[0]! + h[0]!, 16);
      g = parseInt(h[1]! + h[1]!, 16);
      b = parseInt(h[2]! + h[2]!, 16);
    } else {
      r = parseInt(h.slice(0, 2), 16);
      g = parseInt(h.slice(2, 4), 16);
      b = parseInt(h.slice(4, 6), 16);
    }
  } else {
    const rgb = value.match(
      /^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)/i,
    );
    if (!rgb) return null;
    r = Number(rgb[1]);
    g = Number(rgb[2]);
    b = Number(rgb[3]);
  }

  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastingTextForBackground(backgroundColor: string): string | null {
  const lum = colorLuminance(backgroundColor);
  if (lum === null) return null;
  return lum > 0.55 ? "#0d0f14" : "#f5f5f7";
}

function isDocumentDarkMode(): boolean {
  if (typeof document === "undefined") return false;
  const root = document.documentElement;
  return (
    root.classList.contains("dark") || root.getAttribute("data-theme") === "dark"
  );
}

function isLiquidGlassActive(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.getAttribute("data-glass-effect") === "liquid";
}

export function getPopupPositionStyle(
  item: Pick<PopupItem, "position" | "customOffset" | "zIndex">,
): CSSProperties {
  const { position, customOffset, zIndex } = item;
  const style: CSSProperties = { zIndex };

  const offset = customOffset as PopupCustomOffset;

  switch (position) {
    case "bottom-start":
      style.bottom = `calc(${24 + offset.bottom}px + var(--popup-mobile-fab-clearance, 0px))`;
      style.insetInlineStart = `${24 + offset.left}px`;
      break;
    case "bottom-end":
      style.bottom = `calc(${24 + offset.bottom}px + var(--popup-mobile-fab-clearance, 0px))`;
      style.insetInlineEnd = `${24 + offset.right}px`;
      break;
    case "top-start":
      style.top = `${80 + offset.top}px`;
      style.insetInlineStart = `${24 + offset.left}px`;
      break;
    case "top-end":
      style.top = `${80 + offset.top}px`;
      style.insetInlineEnd = `${24 + offset.right}px`;
      break;
    case "left":
      style.top = "50%";
      style.insetInlineStart = `${24 + offset.left}px`;
      style.transform = "translateY(-50%)";
      break;
    case "right":
      style.top = "50%";
      style.insetInlineEnd = `${24 + offset.right}px`;
      style.transform = "translateY(-50%)";
      break;
    case "top":
      style.top = `${80 + offset.top}px`;
      style.left = `${24 + offset.left}px`;
      style.right = `${24 + offset.right}px`;
      break;
    case "bottom":
      style.bottom = `calc(${24 + offset.bottom}px + var(--popup-mobile-fab-clearance, 0px))`;
      style.left = `${24 + offset.left}px`;
      style.right = `${24 + offset.right}px`;
      break;
    case "center":
      style.top = "50%";
      style.left = "50%";
      style.transform = "translate(-50%, -50%)";
      break;
    case "custom":
      if (offset.top) style.top = `${offset.top}px`;
      if (offset.right) style.insetInlineEnd = `${offset.right}px`;
      if (offset.bottom) style.bottom = `${offset.bottom}px`;
      if (offset.left) style.insetInlineStart = `${offset.left}px`;
      break;
    default:
      break;
  }

  return style;
}

export function getPopupDesignStyle(design: PopupDesign): CSSProperties {
  const style: CSSProperties = {
    borderRadius: `${design.borderRadius}px`,
    // Padding is applied inside content copy via --popup-pad so media can be edge-to-edge.
    ["--popup-pad" as string]: `${design.padding}px`,
    fontSize: `${design.fontSize}px`,
    fontWeight: design.fontWeight,
    animationDuration: `${design.animationDurationMs}ms`,
    ["--popup-anim-duration" as string]: `${design.animationDurationMs}ms`,
    ["--popup-accent" as string]: design.accentColor || "var(--primary)",
    ["--popup-radius" as string]: `${design.borderRadius}px`,
    // Theme-aware default (light/dark). Custom colors applied carefully below.
    color: "var(--foreground)",
  };

  const hasBg = Boolean(design.backgroundColor?.trim());
  const hasText = Boolean(design.textColor?.trim());
  const bgLum = hasBg ? colorLuminance(design.backgroundColor) : null;
  const textLum = hasText ? colorLuminance(design.textColor) : null;
  const dark = isDocumentDarkMode();
  const glassLiquid = isLiquidGlassActive();

  if (hasBg) {
    style.backgroundColor = design.backgroundColor;
  }

  if (hasBg && hasText) {
    // If custom pair has poor contrast, force readable text for the surface.
    if (
      bgLum !== null &&
      textLum !== null &&
      Math.abs(bgLum - textLum) < 0.28
    ) {
      style.color = contrastingTextForBackground(design.backgroundColor) ?? "var(--foreground)";
    } else {
      style.color = design.textColor;
    }
  } else if (hasBg && !hasText) {
    style.color =
      contrastingTextForBackground(design.backgroundColor) ?? "var(--foreground)";
  } else if (!hasBg && hasText) {
    // Orphan textColor (e.g. leftover #0d0f14 from a light preset) breaks dark mode.
    // Follow theme foreground instead of a hardcoded light-mode text color.
    style.color = "var(--foreground)";
  }

  /*
   * Dark mode + liquid glass paints the panel with the theme surface (!important),
   * wiping light custom backgrounds while leaving inline dark textColor. Prefer
   * theme foreground whenever the effective surface is dark.
   */
  if (dark) {
    const bgIsLight = bgLum !== null && bgLum > 0.55;
    const effectiveSurfaceIsDark = !hasBg || glassLiquid || (bgLum !== null && bgLum <= 0.55);
    if (effectiveSurfaceIsDark) {
      style.color = "var(--foreground)";
    }
    // Avoid sticking a light solid behind glass (glass already replaces it).
    if (glassLiquid && bgIsLight) {
      delete style.backgroundColor;
    }
  }

  if (design.fontFamily) style.fontFamily = design.fontFamily;
  if (design.borderWidth > 0) {
    style.borderWidth = `${design.borderWidth}px`;
    style.borderStyle = "solid";
    style.borderColor = design.borderColor || NEUTRAL_BORDER;
  }
  if (design.boxShadow) style.boxShadow = design.boxShadow;
  if (design.width > 0) style.width = `${design.width}px`;
  if (design.maxWidth > 0) {
    style.maxWidth = `${design.maxWidth}px`;
    (style as Record<string, string>)["--popup-max-width"] = `${design.maxWidth}px`;
  }
  if (design.minHeight > 0) style.minHeight = `${design.minHeight}px`;

  return style;
}

export function getPopupAnimationClass(animation: PopupDesign["animation"]): string {
  switch (animation) {
    case "fade":
      return "popup-anim-fade";
    case "slide":
      return "popup-anim-slide";
    case "scale":
      return "popup-anim-scale";
    case "bounce":
      return "popup-anim-bounce";
    default:
      return "popup-anim-none";
  }
}
