import type { Composition, LayoutSpacing } from "@/features/layout-engine/types";
import { isTopSectionEnabled } from "@/features/layout-engine/types";

export type LayoutShellAttributes = {
  maxWidth: NonNullable<LayoutSpacing["maxWidth"]> | "page";
  container: NonNullable<LayoutSpacing["container"]>;
  stickyScroll: NonNullable<Composition["layout"]["stickyScroll"]>;
  topEnabled: boolean;
  topWidth: NonNullable<NonNullable<Composition["layout"]["topSection"]>["width"]>;
};

export function resolveLayoutMaxWidth(
  maxWidth?: LayoutSpacing["maxWidth"],
): LayoutShellAttributes["maxWidth"] {
  if (maxWidth === "full" || maxWidth === "page" || maxWidth === "wide" || maxWidth === "narrow") {
    return maxWidth;
  }
  if (maxWidth === "custom") return "page";
  return "page";
}

export function getLayoutShellAttributes(composition: Composition): LayoutShellAttributes {
  const spacing = composition.layout.spacing;
  return {
    maxWidth: resolveLayoutMaxWidth(spacing.maxWidth),
    container: spacing.container ?? "boxed",
    stickyScroll: composition.layout.stickyScroll ?? "document",
    topEnabled: isTopSectionEnabled(composition.layout),
    topWidth: composition.layout.topSection?.width ?? "boxed",
  };
}
