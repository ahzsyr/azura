import type { CSSProperties } from "react";
import { FALLBACK_LOCALES, getDirectionSync, resolvePrefixToCode, type PublicLocale } from "@/i18n/locale-config";
import type {
  AnnouncementBarAnimations,
  AnnouncementBarLayout,
  AnnouncementBarProps,
  AnnouncementBarResponsive,
  AnnouncementBarVisual,
} from "@/features/announcement-bar/announcement-bar.schema";
import type { NormalizedAnnouncementLine } from "@/features/announcement-bar/normalize-announcement-items";

export function repeatAnnouncementLines(
  lines: NormalizedAnnouncementLine[],
  times: number,
): NormalizedAnnouncementLine[] {
  if (lines.length === 0 || times <= 1) return lines;
  return Array.from({ length: times }, () => lines).flat();
}

export function computeMarqueeRepeatCount(
  cycleWidth: number,
  viewportWidth: number,
  minViewportCoverage = 2,
): number {
  if (cycleWidth <= 0 || viewportWidth <= 0) return 1;
  return Math.max(1, Math.ceil((viewportWidth * minViewportCoverage) / cycleWidth));
}

export function resolveBarTone(barToneRaw: AnnouncementBarProps["barTone"]) {
  if (barToneRaw === "gold") return "accent";
  return barToneRaw;
}

export function scrollDurationSec(
  speed: AnnouncementBarProps["scrollSpeed"],
  custom?: number,
  speedPercent = 100,
): number {
  let base: number;
  if (custom && custom > 0) {
    base = custom;
  } else if (speed === "slow") {
    base = 56;
  } else if (speed === "fast") {
    base = 20;
  } else {
    base = 40;
  }

  const clampedPercent = Math.min(400, Math.max(25, speedPercent || 100));
  return base * (100 / clampedPercent);
}

/** Mirror scroll direction on RTL pages so the ticker feels natural. */
export function resolveMarqueeScrollDirection(
  direction: AnnouncementBarProps["direction"],
  locale: string,
  enabledLocales?: PublicLocale[],
): "left" | "right" {
  const locales = enabledLocales ?? FALLBACK_LOCALES;
  const match =
    locales.find((l) => l.urlPrefix === locale || l.code === locale) ??
    locales.find((l) => l.code === resolvePrefixToCode(locale, locales));
  const pageDir = match?.dir ?? getDirectionSync(locale, locales);
  if (pageDir === "rtl") {
    return direction === "left" ? "right" : "left";
  }
  return direction;
}

/** Text direction for announcement copy (separate from marquee motion axis). */
export function resolveAnnouncementTextDirection(
  locale: string,
  enabledLocales?: PublicLocale[],
): "ltr" | "rtl" {
  const locales = enabledLocales ?? FALLBACK_LOCALES;
  const match =
    locales.find((l) => l.urlPrefix === locale || l.code === locale) ??
    locales.find((l) => l.code === resolvePrefixToCode(locale, locales));
  return match?.dir === "rtl" ? "rtl" : getDirectionSync(locale, locales);
}

export function getBarStyles(
  visual: AnnouncementBarVisual,
  layout: AnnouncementBarLayout,
): CSSProperties {
  const styles: CSSProperties = {};

  if (visual.barBackground) {
    if (visual.barBackgroundGradient && visual.gradientStart && visual.gradientEnd) {
      styles.background = `linear-gradient(90deg, ${visual.gradientStart}, ${visual.gradientEnd})`;
    } else {
      styles.background = visual.barBackground;
    }
  }

  if (visual.borderRadius) styles.borderRadius = visual.borderRadius;
  if (visual.borderWidth) styles.borderWidth = visual.borderWidth;
  if (visual.borderTopColor) styles.borderTopColor = visual.borderTopColor;
  if (visual.borderBottomColor) styles.borderBottomColor = visual.borderBottomColor;
  if (layout.zIndex != null) styles.zIndex = layout.zIndex;
  if (layout.sticky) {
    styles.position = "sticky";
    styles.top = layout.topOffset || "0";
  }

  return styles;
}

export function getTextStyles(visual: AnnouncementBarVisual): CSSProperties {
  const styles: CSSProperties = {};
  if (visual.fontSize) styles.fontSize = visual.fontSize;
  if (visual.fontWeight) styles.fontWeight = visual.fontWeight;
  if (visual.letterSpacing) styles.letterSpacing = visual.letterSpacing;
  if (visual.textTransform) styles.textTransform = visual.textTransform;
  if (visual.textColor) styles.color = visual.textColor;
  return styles;
}

export function getEntranceClass(animations: AnnouncementBarAnimations): string {
  if (animations.entranceAnimation === "none") return "";
  const animation = animations.entranceAnimation || "slide-down";
  return animation === "slide-down" ? "animate-slide-down" : "animate-fade";
}

export function isInternalHref(href: string): boolean {
  if (!href) return false;
  return href.startsWith("/") && !href.startsWith("//");
}

export function buildCssVars(props: {
  durationSec: number;
  mobileDurationSec: number;
  visual: AnnouncementBarVisual;
  animations: AnnouncementBarAnimations;
  responsive: AnnouncementBarResponsive;
  showCloseButton: boolean;
}): CSSProperties {
  const {
    durationSec,
    mobileDurationSec,
    visual,
    animations,
    responsive,
    showCloseButton,
  } = props;

  return {
    ["--az-ab-dur" as string]: `${durationSec}s`,
    ["--az-ab-mobile-dur" as string]: `${mobileDurationSec}s`,
    ...(visual.letterSpacing
      ? { ["--az-ab-letter-spacing" as string]: visual.letterSpacing }
      : {}),
    ["--stripLinkHoverTransform" as string]: animations.hoverScale ? "scale(1.05)" : "none",
    ["--stripBlinkDuration" as string]: `${animations.blinkSpeed ?? 1}s`,
    ["--stripBpTablet" as string]: responsive.breakpointTablet ?? "768px",
    ["--stripMobFont" as string]: responsive.mobileFontSize || "0.65rem",
    ["--stripMobPad" as string]: responsive.mobilePadding || "0.35rem",
    ["--stripAbViewportPadX" as string]: showCloseButton ? "2.5rem" : "0",
  };
}
