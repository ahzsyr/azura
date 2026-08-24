import type { Product } from "@/features/products/types";
import type { ResolvedProductPageDisplay } from "@/features/products/lib/product-page-display";
import {
  listUniFiTabCandidates,
  type UniFiTabDef,
  type UniFiTabKind,
} from "@/features/products/lib/unifi-product-sections";

export type UniFiResolvedDisplay = ResolvedProductPageDisplay;

/** UniFi-only visibility: aliases are already merged in resolveProductPageDisplay. */
export function resolveUniFiDisplay(display: ResolvedProductPageDisplay): UniFiResolvedDisplay {
  return display;
}

function kindEnabled(display: ResolvedProductPageDisplay, kind: UniFiTabKind): boolean {
  switch (kind) {
    case "overview":
      return display.tabDescription.enabled && display.tabOverview.enabled;
    case "technical":
      return display.tabSpecs.enabled;
    case "installation":
      return display.tabDocuments.enabled && display.tabInstallation.enabled;
    case "in_the_box":
      return display.tabInBox.enabled;
    default:
      return true;
  }
}

export function listVisibleUniFiTabs(
  display: ResolvedProductPageDisplay,
  product: Product,
): UniFiTabDef[] {
  if (!display.tabs.enabled) return [];
  return listUniFiTabCandidates(product).filter((tab) => kindEnabled(display, tab.kind));
}

export function visibleUniFiTabs(display: ResolvedProductPageDisplay, product: Product): string[] {
  return listVisibleUniFiTabs(display, product).map((tab) => tab.id);
}

export function uniFiOverviewEnabled(display: ResolvedProductPageDisplay, product: Product): boolean {
  return listVisibleUniFiTabs(display, product).some((tab) => tab.kind === "overview");
}

export function uniFiTechnicalEnabled(display: ResolvedProductPageDisplay, product: Product): boolean {
  return listVisibleUniFiTabs(display, product).some((tab) => tab.kind === "technical");
}

export function uniFiInstallationEnabled(display: ResolvedProductPageDisplay, product: Product): boolean {
  return listVisibleUniFiTabs(display, product).some((tab) => tab.kind === "installation");
}

export function uniFiInTheBoxEnabled(display: ResolvedProductPageDisplay, product: Product): boolean {
  return listVisibleUniFiTabs(display, product).some((tab) => tab.kind === "in_the_box");
}
