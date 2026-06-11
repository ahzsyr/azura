import type { HeaderDesktopMode } from "@/features/navigation/types";
import { isBoxedHeaderStyle } from "@/features/navigation/header-overlay-utils";

/** Default breathing room below the header (overridable in CSS). */
export const HEADER_CONTENT_GAP_DEFAULT = "16px";

/** CSS value for `.site-main` top padding when inset is active. */
export const SITE_CONTENT_TOP_INSET_CSS =
  "calc(var(--header-height, 76px) + var(--header-overlay-top-gap, 0px) + var(--header-content-gap, 16px))";

export function boxedHeaderTopGapPx(headerStyle: string | undefined): number {
  return isBoxedHeaderStyle(headerStyle) ? 12 : 0;
}

const SPACER_LAYOUT_MODES: ReadonlySet<HeaderDesktopMode> = new Set([
  "fixed-top",
  "absolute",
  "hide-reveal",
  "sticky",
  "shrink-scroll",
]);

export function resolveHeaderInsetActive(opts: {
  mode: HeaderDesktopMode;
  workspaceOverlay: boolean;
  blockOverlay: boolean;
  isSticking: boolean;
  usesLayoutSpacer?: boolean;
}): boolean {
  const { mode, workspaceOverlay, blockOverlay, isSticking, usesLayoutSpacer = false } =
    opts;
  if (mode === "static") return false;
  if (workspaceOverlay || blockOverlay) return true;
  if (usesLayoutSpacer && SPACER_LAYOUT_MODES.has(mode)) return false;
  if (mode === "fixed-top" || mode === "absolute" || mode === "hide-reveal") return true;
  if (mode === "sticky" || mode === "shrink-scroll") return isSticking;
  return false;
}

export function readHeaderContentGapPx(doc: Document = document): number {
  const raw = getComputedStyle(doc.documentElement)
    .getPropertyValue("--header-content-gap")
    .trim();
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 16;
}

/** Pixel offset for sticky sub-navs from measured header root height. */
export function resolveStickyNavTopPx(
  headerRootHeightPx: number,
  headerStyle: string | undefined,
  doc: Document = document
): number {
  const html = doc.documentElement;
  const az = getComputedStyle(html).getPropertyValue("--az-sticky-nav-top").trim();
  const azPx = parseFloat(az);
  if (Number.isFinite(azPx) && azPx > 0) return Math.ceil(azPx);

  const overlayGap = parseFloat(
    getComputedStyle(html).getPropertyValue("--header-overlay-top-gap").trim()
  );
  const overlayPx = Number.isFinite(overlayGap) ? overlayGap : boxedHeaderTopGapPx(headerStyle);
  return Math.ceil(headerRootHeightPx + overlayPx + readHeaderContentGapPx(doc));
}
