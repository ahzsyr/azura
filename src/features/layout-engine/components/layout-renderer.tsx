import type { ReactNode } from "react";
import { layoutRegistry, withTopInStackOrder } from "@/features/layout-engine/layout-registry";
import { RegionRenderer } from "@/features/layout-engine/components/region-renderer";
import { getLayoutShellAttributes } from "@/features/layout-engine/layout-shell-attrs";
import type { Composition, ColumnRatioToken, LayoutRenderOptions, RegionId } from "@/features/layout-engine/types";
import type { TranslationBundle } from "@/features/translation/translation-bundle";
import type { BlockParentType } from "@/features/translation/block-translation";
import type { ThemeTokens } from "@/types/theme";
import { firstBlockSupportsHeaderOverlay } from "@/features/builder/header-overlay";

type Props = {
  composition: Composition;
  renderOptions: LayoutRenderOptions;
  parentType?: BlockParentType;
  parentId?: string;
  translationBundle?: TranslationBundle;
  pageHeaderOverlay?: Parameters<typeof RegionRenderer>[0]["pageHeaderOverlay"];
  theme?: ThemeTokens | null;
  siteTextEffect?: string | null;
  pageAnimationsEnabled?: boolean;
  discoveryAnchor?: Parameters<typeof RegionRenderer>[0]["discoveryAnchor"];
  previewMode?: boolean;
  previewDevice?: Parameters<typeof RegionRenderer>[0]["previewDevice"];
};

function resolveRatioVars(ratio?: ColumnRatioToken): Record<string, string> {
  switch (ratio) {
    case "20-80":
      return { "--az-aside-start-ratio": "20%" };
    case "25-75":
      return { "--az-aside-start-ratio": "25%" };
    case "30-70":
      return { "--az-aside-start-ratio": "30%" };
    case "80-20":
      return { "--az-aside-end-ratio": "20%" };
    case "75-25":
      return { "--az-aside-end-ratio": "25%" };
    case "70-30":
      return { "--az-aside-end-ratio": "30%" };
    case "20-60-20":
      return { "--az-aside-start-ratio": "20%", "--az-aside-end-ratio": "20%" };
    case "25-50-25":
      return { "--az-aside-start-ratio": "25%", "--az-aside-end-ratio": "25%" };
    case "20-50-30":
      return { "--az-aside-start-ratio": "20%", "--az-aside-end-ratio": "30%" };
    case "golden":
      return { "--az-aside-start-ratio": "38%" };
    case "equal":
      return { "--az-aside-start-ratio": "50%", "--az-aside-end-ratio": "50%" };
    default:
      return {};
  }
}

function getResponsiveOrder(order: RegionId[], regionId: RegionId): number | undefined {
  const index = order.indexOf(regionId);
  return index >= 0 ? index + 1 : undefined;
}

function isVisible(composition: Composition, regionId: RegionId, supportedRegions?: RegionId[]) {
  const definition = layoutRegistry.getOrThrow(composition.layout.type);
  if (regionId === "top") {
    return getLayoutShellAttributes(composition).topEnabled;
  }
  if (!definition.activeRegions.includes(regionId)) return false;
  if (supportedRegions && !supportedRegions.includes(regionId)) return false;
  return true;
}

function isStickyAside(composition: Composition, regionId: RegionId): boolean {
  if (regionId === "primary" || regionId === "top") return false;
  return composition.layout.regions[regionId]?.sticky === true;
}

function regionClassName(composition: Composition, regionId: RegionId): string {
  const classes = ["az-layout__region"];
  if (regionId === "top") {
    classes.push("az-layout__top");
  }
  if (isStickyAside(composition, regionId)) {
    classes.push("az-layout__aside--sticky");
  }
  if (
    regionId === "primary" &&
    (composition.layout.stickyScroll ?? "document") === "main-only"
  ) {
    classes.push("az-layout__region--primary-scroll");
  }
  return classes.join(" ");
}

export async function LayoutRenderer({
  composition,
  renderOptions,
  parentType = "CmsPage",
  parentId,
  translationBundle,
  pageHeaderOverlay = null,
  theme = null,
  siteTextEffect = null,
  pageAnimationsEnabled,
  discoveryAnchor = null,
  previewMode = false,
  previewDevice,
}: Props): Promise<ReactNode> {
  const definition = layoutRegistry.getOrThrow(composition.layout.type);
  const shell = getLayoutShellAttributes(composition);
  const topEnabled = shell.topEnabled;
  const tabletOrder = withTopInStackOrder(
    composition.layout.responsive?.tablet?.stackOrder ??
      definition.defaultResponsive?.tablet?.stackOrder ??
      definition.activeRegions,
    topEnabled,
  );
  const mobileOrder = withTopInStackOrder(
    composition.layout.responsive?.mobile?.stackOrder ??
      definition.defaultResponsive?.mobile?.stackOrder ??
      definition.activeRegions,
    topEnabled,
  );
  const gap = composition.layout.spacing.gap ?? "md";
  const style = {
    ...resolveRatioVars(
      composition.layout.regions.asideStart?.ratio ??
        composition.layout.regions.asideEnd?.ratio ??
        definition.defaultRatio,
    ),
  } as React.CSSProperties;

  // Determine which single region owns the first media underlay so overlay
  // props are never passed to both top and primary simultaneously.
  const topFirst = composition.regions.top?.[0];
  const primaryFirst = composition.regions[definition.primaryRegion]?.[0];
  const overlayOwnerRegion: RegionId | null = pageHeaderOverlay?.enabled
    ? topEnabled && firstBlockSupportsHeaderOverlay(topFirst)
      ? "top"
      : firstBlockSupportsHeaderOverlay(primaryFirst)
        ? definition.primaryRegion
        : null
    : null;

  const renderRegion = (regionId: RegionId) =>
    RegionRenderer({
      regionId,
      blocks: composition.regions[regionId],
      locale: renderOptions.locale,
      parentType,
      parentId,
      translationBundle,
      pageHeaderOverlay: regionId === overlayOwnerRegion ? pageHeaderOverlay : null,
      theme,
      siteTextEffect,
      pageAnimationsEnabled,
      discoveryAnchor,
      previewMode,
      previewDevice,
      policy: definition.regionPolicies?.[regionId],
      orderTablet: getResponsiveOrder(tabletOrder, regionId),
      orderMobile: getResponsiveOrder(mobileOrder, regionId),
      className: regionClassName(composition, regionId),
    });

  const topRegion =
    topEnabled && isVisible(composition, "top", renderOptions.supportedRegions)
      ? await renderRegion("top")
      : null;

  const renderedColumns = await Promise.all(
    definition.activeRegions
      .filter((regionId) => isVisible(composition, regionId, renderOptions.supportedRegions))
      .map((regionId) => renderRegion(regionId)),
  );

  return (
    <div
      className="az-layout-shell"
      data-max-width={shell.maxWidth}
      data-container={shell.container}
      data-sticky-scroll={shell.stickyScroll}
    >
      {topRegion ? (
        <div
          className="az-layout__top-wrap"
          data-top-width={shell.topWidth}
          data-order-tablet={getResponsiveOrder(tabletOrder, "top")}
          data-order-mobile={getResponsiveOrder(mobileOrder, "top")}
        >
          {topRegion}
        </div>
      ) : null}
      <div
        className="az-layout"
        data-layout={definition.type}
        data-gap={gap}
        data-valign={composition.layout.verticalAlign ?? "stretch"}
        data-stack-tablet={composition.layout.responsive?.tablet ? "true" : undefined}
        data-stack-mobile={composition.layout.responsive?.mobile ? "true" : undefined}
        style={style}
      >
        {renderedColumns}
      </div>
    </div>
  );
}
