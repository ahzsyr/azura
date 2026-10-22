import type { ChromeTintStyle, IosStatusBarStyle } from "@/schemas/theme";
import type { BrowserProjection } from "@/lib/theme/browser-chrome-projection";

/** What Safari should find at one viewport edge. */
export type TintEdgeKind = "page" | "color" | "gradient";

/**
 * Flat plan the DOM writer and the stylesheet share.
 * `page` means Safari samples the page: no strip on top (a clear top strip
 * reads as black), and a clear strip on the bottom (that is what made the
 * toolbar glass). `color` and `gradient` paint a strip.
 */
export type TintAttrs = {
  top: TintEdgeKind;
  bottom: TintEdgeKind;
  topColor: string;
  bottomColor: string;
  gradient: string;
  /** `transparent` or a hex. Painted on html and body so it cannot become a surprise sample. */
  htmlBackground: string;
  pad: "on" | "off";
};

export type BrowserTintInput = {
  appearance: "light" | "dark";
  style: ChromeTintStyle;
  edgeToEdge: boolean;
  iosStatusBarStyle: IosStatusBarStyle;
  /** Opaque basis already resolved for this appearance (surface or primary). */
  colorLight: string;
  colorDark: string;
  /** Page canvas, used when edge-to-edge is off. */
  canvasLight: string;
  canvasDark: string;
  gradientLight: string | null;
  gradientDark: string | null;
};

function fade(color: string): string {
  return `linear-gradient(to bottom, ${color} 0%, transparent 100%)`;
}

/**
 * Map Mobile Browser settings to the two edges Safari samples.
 * Transparent and Glass share the page mechanism. Glass strength and blur
 * stay on the site bar; Safari draws its own glass over the page.
 */
export function resolveBrowserTint(input: BrowserTintInput): TintAttrs {
  const basis = input.appearance === "dark" ? input.colorDark : input.colorLight;
  const canvas = input.appearance === "dark" ? input.canvasDark : input.canvasLight;
  const gradient =
    (input.appearance === "dark" ? input.gradientDark : input.gradientLight) || fade(basis);

  let top: TintEdgeKind = "page";
  let bottom: TintEdgeKind = "page";
  let topColor = basis;
  let bottomColor = basis;
  let htmlBackground = "transparent";

  if (input.style === "solid") {
    top = "color";
    bottom = "color";
    htmlBackground = basis;
  } else if (input.style === "gradient") {
    top = "gradient";
    bottom = "gradient";
  }

  // Edge-to-edge off keeps content below the clock. The status-bar sample is
  // the page canvas in every tint style. The bottom edge keeps the style.
  if (!input.edgeToEdge) {
    top = "color";
    topColor = canvas;
    htmlBackground = canvas;
  }

  if (input.iosStatusBarStyle === "black") {
    top = "color";
    topColor = "#000000";
  } else if (input.iosStatusBarStyle === "default") {
    top = "color";
    topColor = "#f7f7f8";
  }

  return {
    top,
    bottom,
    topColor,
    bottomColor,
    gradient,
    htmlBackground,
    pad: input.edgeToEdge ? "off" : "on",
  };
}

/** Projection already baked the basis into themeColor. Canvas is the page background. */
export function tintAttrsFromProjection(
  projection: Pick<
    BrowserProjection,
    | "chromeTintStyle"
    | "iosStatusBarStyle"
    | "themeColorLight"
    | "themeColorDark"
    | "chromeGradientLight"
    | "chromeGradientDark"
  >,
  appearance: "light" | "dark",
  options?: {
    canvasLight?: string;
    canvasDark?: string;
    edgeToEdge?: boolean;
  },
): TintAttrs {
  return resolveBrowserTint({
    appearance,
    style: projection.chromeTintStyle,
    edgeToEdge: options?.edgeToEdge !== false,
    iosStatusBarStyle: projection.iosStatusBarStyle,
    colorLight: projection.themeColorLight,
    colorDark: projection.themeColorDark,
    canvasLight: options?.canvasLight ?? projection.themeColorLight,
    canvasDark: options?.canvasDark ?? projection.themeColorDark,
    gradientLight: projection.chromeGradientLight,
    gradientDark: projection.chromeGradientDark,
  });
}
