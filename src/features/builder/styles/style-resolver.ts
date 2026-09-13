import type { CSSProperties } from "react";
import type {
  BlockResponsiveOverride,
  BlockResponsiveSettings,
  BlockStyleSettings,
  DeviceBreakpoint,
  ResolvedBlockStyles,
} from "@/types/block-system";
import type { ThemeTokens } from "@/types/theme";
import { BUILDER_BREAKPOINT_MQ } from "@/features/builder/constants/responsive-breakpoints";
import { resolveLayoutFromPresets } from "@/features/builder/styles/layout-preset-resolver";

function toCssValue(v: string | number | undefined): string | undefined {
  if (v === undefined || v === "") return undefined;
  return typeof v === "number" ? `${v}px` : v;
}

export function mergeStyleLayers(
  base: BlockStyleSettings = {},
  responsive?: BlockResponsiveSettings,
  breakpoint: DeviceBreakpoint = "desktop",
  localeStyles?: BlockStyleSettings
): BlockStyleSettings {
  const desktop = responsive?.desktop ?? {};
  const tablet = responsive?.tablet ?? {};
  const mobile = responsive?.mobile ?? {};
  // Style > Layout is the base; Responsive tab overlays desktop → tablet → mobile.
  let merged = { ...base, ...localeStyles, ...desktop };

  if (breakpoint === "tablet" || breakpoint === "mobile") {
    merged = { ...merged, ...tablet };
  }
  if (breakpoint === "mobile") {
    merged = { ...merged, ...mobile };
  }

  return merged;
}

export function applyThemeTokens(
  styles: BlockStyleSettings,
  theme?: ThemeTokens
): BlockStyleSettings {
  if (!theme) return styles;
  const overrides = styles.tokenOverrides ?? {};
  return {
    ...styles,
    fontFamily: styles.fontFamily ?? overrides.bodyFont ?? theme.typography.bodyFont,
    backgroundColor:
      styles.backgroundColor ??
      (overrides.primaryColor !== undefined ? theme.primaryColor : undefined),
  };
}

function alignmentToCss(alignment: BlockResponsiveOverride["alignment"]): CSSProperties {
  if (!alignment) return {};
  const map: Record<NonNullable<BlockResponsiveOverride["alignment"]>, CSSProperties> = {
    start: { display: "flex", flexDirection: "column", alignItems: "flex-start" },
    center: { display: "flex", flexDirection: "column", alignItems: "center" },
    end: { display: "flex", flexDirection: "column", alignItems: "flex-end" },
    stretch: { display: "flex", flexDirection: "column", alignItems: "stretch" },
  };
  return map[alignment] ?? {};
}

export function blockStylesToCss(
  styles: BlockStyleSettings,
  theme?: ThemeTokens,
  alignment?: BlockResponsiveOverride["alignment"],
  options?: { omitHeights?: boolean },
): CSSProperties {
  const resolved = resolveLayoutFromPresets(styles);
  const s = applyThemeTokens(resolved, theme);
  const css: CSSProperties = {};

  if (s.width !== undefined) css.width = toCssValue(s.width);
  if (s.maxWidth !== undefined) css.maxWidth = toCssValue(s.maxWidth);
  // Image blocks hug media height — applying min-height on the outer wrapper
  // leaves empty gaps under the image when the photo scales down.
  if (!options?.omitHeights) {
    if (s.height !== undefined) css.height = toCssValue(s.height);
    if (s.minHeight !== undefined) css.minHeight = toCssValue(s.minHeight);
  }
  const resolvedPaddingTop = s.paddingTop !== undefined ? s.paddingTop : s.sectionSpacing;
  const resolvedPaddingBottom = s.paddingBottom !== undefined ? s.paddingBottom : s.sectionSpacing;
  if (resolvedPaddingTop !== undefined) css.paddingTop = toCssValue(resolvedPaddingTop);
  if (resolvedPaddingBottom !== undefined) css.paddingBottom = toCssValue(resolvedPaddingBottom);
  if (s.contentSpacing !== undefined) css.gap = toCssValue(s.contentSpacing);

  if (s.fontFamily) css.fontFamily = s.fontFamily;
  if (s.fontWeight !== undefined) css.fontWeight = s.fontWeight as CSSProperties["fontWeight"];
  if (s.fontSize !== undefined) css.fontSize = toCssValue(s.fontSize);
  if (s.letterSpacing !== undefined) css.letterSpacing = toCssValue(s.letterSpacing);
  if (s.lineHeight !== undefined) css.lineHeight = s.lineHeight as CSSProperties["lineHeight"];
  if (s.textTransform) css.textTransform = s.textTransform;

  if (s.backgroundColor) css.backgroundColor = s.backgroundColor;
  if (s.textColor) css.color = s.textColor;
  if (s.borderColor) css.borderColor = s.borderColor;
  if (s.borderWidth !== undefined) css.borderWidth = toCssValue(s.borderWidth);
  if (s.borderRadius !== undefined) css.borderRadius = toCssValue(s.borderRadius);
  if (s.borderStyle) css.borderStyle = s.borderStyle;

  if (s.boxShadow) css.boxShadow = s.boxShadow;
  if (s.textShadow) css.textShadow = s.textShadow as CSSProperties["textShadow"];

  if (s.blur !== undefined) css.filter = `blur(${toCssValue(s.blur)})`;
  if (s.opacity !== undefined) css.opacity = s.opacity;
  if (s.brightness !== undefined) {
    const blur = s.blur !== undefined ? `blur(${toCssValue(s.blur)}) ` : "";
    css.filter = `${blur}brightness(${s.brightness})`.trim();
  }

  if (s.position) css.position = s.position;
  if (s.zIndex !== undefined) css.zIndex = s.zIndex;
  if (s.overflow) css.overflow = s.overflow;

  return { ...css, ...alignmentToCss(alignment) };
}

export function resolveBlockStyles(input: {
  styles?: BlockStyleSettings;
  responsive?: BlockResponsiveSettings;
  localeStyles?: BlockStyleSettings;
  breakpoint?: DeviceBreakpoint;
  theme?: ThemeTokens;
  blockId: string;
  /** When true, skip height/minHeight so the block can shrink-wrap media. */
  omitHeights?: boolean;
}): ResolvedBlockStyles {
  const breakpoint = input.breakpoint ?? "desktop";
  const merged = mergeStyleLayers(
    input.styles ?? {},
    input.responsive,
    breakpoint,
    input.localeStyles
  );

  const responsiveLayer = input.responsive?.[breakpoint];
  const hidden = Boolean(responsiveLayer?.hide);

  const style = blockStylesToCss(merged, input.theme, responsiveLayer?.alignment, {
    omitHeights: input.omitHeights,
  });
  const dataAttributes: Record<string, string> = {
    "data-block-id": input.blockId,
  };

  if (merged.cssVariables) {
    for (const [key, value] of Object.entries(merged.cssVariables)) {
      (style as Record<string, string>)[key.startsWith("--") ? key : `--${key}`] = value;
    }
  }

  return {
    className: merged.className ?? "",
    style,
    dataAttributes,
    hidden,
  };
}

const CSS_PROP_EXCEPTIONS: Record<string, string> = {
  WebkitOverflowScrolling: "-webkit-overflow-scrolling",
};

/** Convert React CSSProperties to a CSS declaration list (no trailing braces). */
export function cssPropertiesToDeclarations(style: CSSProperties): string {
  const parts: string[] = [];
  for (const [key, raw] of Object.entries(style)) {
    if (raw === undefined || raw === null || raw === "") continue;
    const prop =
      CSS_PROP_EXCEPTIONS[key] ??
      (key.startsWith("--") ? key : key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`));
    parts.push(`${prop}:${String(raw)}`);
  }
  return parts.join(";");
}

function hasResponsiveLayoutAuthoring(
  styles?: BlockStyleSettings,
  responsive?: BlockResponsiveSettings,
  localeStyles?: BlockStyleSettings,
): boolean {
  if (styles && Object.keys(styles).length > 0) return true;
  if (localeStyles && Object.keys(localeStyles).length > 0) return true;
  if (!responsive) return false;
  return (["desktop", "tablet", "mobile"] as const).some((bp) => {
    const layer = responsive[bp];
    return Boolean(layer && Object.keys(layer).length > 0);
  });
}

function escapeCssAttrValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Emit desktop/tablet/mobile Style > Layout CSS via media queries so live pages
 * apply responsive overrides on real viewports (not only a single SSR breakpoint).
 */
export function buildResponsiveBlockStyleSheet(input: {
  blockId: string;
  styles?: BlockStyleSettings;
  responsive?: BlockResponsiveSettings;
  localeStyles?: BlockStyleSettings;
  theme?: ThemeTokens;
  omitHeights?: boolean;
}): string | null {
  if (!hasResponsiveLayoutAuthoring(input.styles, input.responsive, input.localeStyles)) {
    return null;
  }

  const selector = `[data-block-id="${escapeCssAttrValue(input.blockId)}"]`;
  const breakpoints: DeviceBreakpoint[] = ["desktop", "tablet", "mobile"];
  const chunks: string[] = [];

  for (const breakpoint of breakpoints) {
    const resolved = resolveBlockStyles({
      ...input,
      breakpoint,
    });
    const decls = cssPropertiesToDeclarations(resolved.style);
    const hideDecl = resolved.hidden ? "display:none!important" : "";
    const body = [decls, hideDecl].filter(Boolean).join(";");
    if (!body) continue;
    chunks.push(`@media ${BUILDER_BREAKPOINT_MQ[breakpoint]}{${selector}{${body}}}`);
  }

  return chunks.length > 0 ? chunks.join("") : null;
}
