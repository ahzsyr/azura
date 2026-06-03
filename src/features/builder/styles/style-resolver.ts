import type { CSSProperties } from "react";
import type {
  BlockResponsiveOverride,
  BlockResponsiveSettings,
  BlockStyleSettings,
  DeviceBreakpoint,
  ResolvedBlockStyles,
} from "@/types/block-system";
import type { ThemeTokens } from "@/types/theme";
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
  const tablet = responsive?.tablet ?? {};
  const mobile = responsive?.mobile ?? {};
  let merged = { ...base, ...localeStyles };

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
      styles.backgroundColor ?? overrides.primaryColor ?? theme.primaryColor,
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
  alignment?: BlockResponsiveOverride["alignment"]
): CSSProperties {
  const resolved = resolveLayoutFromPresets(styles);
  const s = applyThemeTokens(resolved, theme);
  const css: CSSProperties = {};

  if (s.width !== undefined) css.width = toCssValue(s.width);
  if (s.maxWidth !== undefined) css.maxWidth = toCssValue(s.maxWidth);
  if (s.height !== undefined) css.height = toCssValue(s.height);
  if (s.minHeight !== undefined) css.minHeight = toCssValue(s.minHeight);
  if (s.sectionSpacing !== undefined) {
    css.paddingTop = toCssValue(s.sectionSpacing);
    css.paddingBottom = toCssValue(s.sectionSpacing);
  }
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

  const style = blockStylesToCss(merged, input.theme, responsiveLayer?.alignment);
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
