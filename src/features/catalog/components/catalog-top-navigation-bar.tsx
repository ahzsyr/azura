"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type {
  CatalogNavigationAppearance,
  CatalogNavigationBreakpointLayout,
  CatalogNavigationItem,
  CatalogNavigationLayout,
  CatalogNavigationResponsive,
} from "@/features/catalog/navigation/types";
import {
  resolveAppearanceStyle,
  resolveDisplayMode,
  resolveHorizontalAlign,
  resolveIconContainerStyle,
  resolveIconPosition,
  resolveLabelAlign,
  resolveShowTooltip,
  resolveVerticalAlign,
} from "@/features/catalog/navigation/layout-semantics";
import { filterStateFromSearchParams } from "@/features/products/listing/url-state";
import { catalogNavItemIsFilterActive } from "@/features/catalog/navigation/listing-state-match";
import { inferCatalogNavigationActionType } from "@/features/catalog/navigation/types";
import { resolveCatalogNavLucide } from "@/features/catalog/navigation/catalog-nav-lucide";
import "./catalog-top-navigation-bar.css";

export type CatalogTopNavigationBarItem = CatalogNavigationItem & {
  href: string;
};

function isImageIcon(item: CatalogTopNavigationBarItem): boolean {
  if (item.iconType === "image") return true;
  const icon = item.icon?.trim() ?? "";
  return icon.startsWith("/") || icon.startsWith("http") || icon.startsWith("data:");
}

function isFilterAction(item: CatalogTopNavigationBarItem): boolean {
  const action = inferCatalogNavigationActionType(item);
  return (
    action === "CATEGORY_FILTER" ||
    action === "BRAND_FILTER" ||
    action === "ATTRIBUTE_FILTER" ||
    action === "SPEC_FILTER" ||
    action === "MULTI_FILTER" ||
    action === "SEARCH"
  );
}

function itemIsPathActive(
  pathname: string,
  item: CatalogTopNavigationBarItem,
  activeCategorySlug?: string | null,
  activeBrandSlug?: string | null,
): boolean {
  const path = pathname.replace(/\/$/, "") || "/";
  const hrefPath = (item.href.split("?")[0] ?? "/").replace(/\/$/, "") || "/";

  if (activeCategorySlug && item.targetType === "CATEGORY") {
    if (item.targetId === activeCategorySlug) return true;
  }
  if (activeBrandSlug && item.targetType === "BRAND") {
    if (item.targetId === activeBrandSlug) return true;
  }

  if (path === hrefPath) return true;
  if (hrefPath !== "/" && path.startsWith(`${hrefPath}/`)) return true;

  if (item.targetType === "CATEGORY" && item.targetId) {
    if (path.includes(`/categories/${item.targetId}`)) return true;
  }
  if (item.targetType === "BRAND" && item.targetId) {
    if (path.includes(`/brands/${item.targetId}`)) return true;
  }
  return false;
}

function px(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  const v = value.trim();
  if (v === "auto" || v === "equal" || v === "full") return v === "equal" || v === "full" ? undefined : "auto";
  if (/^\d+(\.\d+)?$/.test(v)) return `${v}px`;
  return v;
}

function justifyForAlign(align: string): string {
  switch (align) {
    case "center":
      return "center";
    case "end":
      return "flex-end";
    case "space-between":
      return "space-between";
    default:
      return "flex-start";
  }
}

function alignItemsForVertical(align: string): string {
  switch (align) {
    case "start":
      return "flex-start";
    case "end":
      return "flex-end";
    default:
      return "center";
  }
}

function layoutToCssVars(
  layout?: CatalogNavigationLayout | CatalogNavigationBreakpointLayout,
  prefix = "",
): Record<string, string> {
  if (!layout) return {};
  type DimKey = {
    [K in keyof CatalogNavigationLayout]-?: CatalogNavigationLayout[K] extends string | undefined
      ? K
      : never;
  }[keyof CatalogNavigationLayout];

  const map: Array<[DimKey, string]> = [
    ["containerWidth", "width"],
    ["containerHeight", "height"],
    ["containerMaxWidth", "max-width"],
    ["containerMinHeight", "min-height"],
    ["paddingX", "padding-x"],
    ["paddingY", "padding-y"],
    ["gap", "gap"],
    ["itemWidth", "item-width"],
    ["itemHeight", "item-height"],
    ["itemPadding", "item-padding"],
    ["itemMargin", "item-margin"],
    ["iconSize", "icon-size"],
    ["iconContainerSize", "icon-box"],
    ["labelSize", "label-size"],
    ["iconLabelGap", "icon-label-gap"],
  ];
  const out: Record<string, string> = {};
  for (const [key, cssKey] of map) {
    const raw = layout[key];
    if (key === "itemWidth" && (raw === "equal" || raw === "full")) continue;
    const resolved = px(raw);
    if (resolved) out[`--ctn-${prefix}${cssKey}`] = resolved;
  }
  if (layout.horizontalAlignment) {
    out[`--ctn-${prefix}justify`] = justifyForAlign(layout.horizontalAlignment);
  }
  if (layout.verticalAlignment) {
    out[`--ctn-${prefix}align`] = alignItemsForVertical(layout.verticalAlignment);
  }
  if (layout.labelAlignment) {
    out[`--ctn-${prefix}label-align`] = layout.labelAlignment;
  }
  if (layout.horizontalScroll === false) {
    out[`--ctn-${prefix}scroll`] = "hidden";
  } else if (layout.horizontalScroll === true) {
    out[`--ctn-${prefix}scroll`] = "auto";
  }
  return out;
}

function appearanceToCssVars(appearance?: CatalogNavigationAppearance): Record<string, string> {
  if (!appearance || appearance.theme === "inherit" || !appearance.theme) {
    // Still apply explicit overrides even when theme is inherit.
  }
  const out: Record<string, string> = {};
  if (appearance?.background) out["--ctn-bg"] = appearance.background;
  if (appearance?.foreground) out["--ctn-fg"] = appearance.foreground;
  if (appearance?.activeBackground) out["--ctn-active-bg"] = appearance.activeBackground;
  if (appearance?.activeForeground) out["--ctn-active-fg"] = appearance.activeForeground;
  if (appearance?.hoverBackground) out["--ctn-hover-bg"] = appearance.hoverBackground;
  if (appearance?.hoverForeground) out["--ctn-hover-fg"] = appearance.hoverForeground;
  if (appearance?.border) out["--ctn-border"] = appearance.border;
  if (appearance?.borderRadius) out["--ctn-radius"] = px(appearance.borderRadius) ?? appearance.borderRadius;
  if (appearance?.shadow) out["--ctn-shadow"] = appearance.shadow;
  return out;
}

function buildBarStyle(
  appearance?: CatalogNavigationAppearance,
  layout?: CatalogNavigationLayout,
  responsive?: CatalogNavigationResponsive,
): CSSProperties {
  const vars: Record<string, string> = {
    ...appearanceToCssVars(appearance),
    ...layoutToCssVars(layout),
    ...layoutToCssVars(responsive?.desktop, "d-"),
    ...layoutToCssVars(responsive?.tablet, "t-"),
    ...layoutToCssVars(responsive?.mobile, "m-"),
  };
  return vars as CSSProperties;
}

function semanticDataAttrs(
  layout?: CatalogNavigationLayout | CatalogNavigationBreakpointLayout | null,
  prefix = "",
): Record<string, string> {
  if (!layout) return {};
  const out: Record<string, string> = {};
  if (layout.displayMode || layout.showIcons === false) {
    out[`data-${prefix}display`] = resolveDisplayMode(layout);
  }
  if (layout.iconPosition) {
    out[`data-${prefix}icon-position`] = resolveIconPosition(layout);
  }
  if (layout.horizontalAlignment) {
    out[`data-${prefix}align-x`] = resolveHorizontalAlign(layout);
  }
  if (layout.verticalAlignment) {
    out[`data-${prefix}align-y`] = resolveVerticalAlign(layout);
  }
  if (layout.iconContainerStyle) {
    out[`data-${prefix}icon-box`] = resolveIconContainerStyle(layout);
  }
  if (layout.itemWidth === "equal") {
    out[`data-${prefix}item-width`] = "equal";
  } else if (layout.itemWidth === "full") {
    out[`data-${prefix}item-width`] = "full";
  }
  if (layout.horizontalScroll === false) {
    out[`data-${prefix}scroll`] = "off";
  } else if (layout.horizontalScroll === true) {
    out[`data-${prefix}scroll`] = "on";
  }
  return out;
}

export function CatalogTopNavigationBar({
  items,
  activeCategorySlug,
  activeBrandSlug,
  pathBrandName,
  pathCategoryName,
  pathCollectionScope,
  appearance,
  layout,
  responsive,
  className,
  /** When set (admin preview), use this instead of live URL search params. */
  previewFilterQuery,
  onPreviewItemClick,
  /** Force semantic attrs as if at this viewport (admin preview). */
  previewViewport,
}: {
  items: CatalogTopNavigationBarItem[];
  activeCategorySlug?: string | null;
  activeBrandSlug?: string | null;
  pathBrandName?: string | null;
  pathCategoryName?: string | null;
  pathCollectionScope?: string | null;
  appearance?: CatalogNavigationAppearance;
  layout?: CatalogNavigationLayout;
  responsive?: CatalogNavigationResponsive;
  className?: string;
  previewFilterQuery?: string | null;
  onPreviewItemClick?: (item: CatalogTopNavigationBarItem) => void;
  previewViewport?: "desktop" | "tablet" | "mobile";
}) {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();

  const filterState = useMemo(() => {
    const raw =
      previewFilterQuery != null
        ? previewFilterQuery
        : (searchParams?.toString() ?? "");
    return filterStateFromSearchParams(new URLSearchParams(raw));
  }, [searchParams, previewFilterQuery]);

  const matchCtx = useMemo(
    () => ({
      pathBrandName,
      pathCategoryName,
      pathCollectionScope,
    }),
    [pathBrandName, pathCategoryName, pathCollectionScope],
  );

  if (!items.length) return null;

  const style = buildBarStyle(appearance, layout, responsive);
  const displayMode = resolveDisplayMode(layout);
  const showTooltip = resolveShowTooltip(layout);
  const appearanceStyle = resolveAppearanceStyle(appearance);

  const layerForPreview =
    previewViewport === "mobile"
      ? responsive?.mobile
      : previewViewport === "tablet"
        ? responsive?.tablet
        : previewViewport === "desktop"
          ? responsive?.desktop
          : undefined;

  const effectiveLayout = layerForPreview ? { ...(layout ?? {}), ...layerForPreview } : layout;
  const effectiveDisplay = resolveDisplayMode(effectiveLayout);
  const effectiveTooltip = resolveShowTooltip(effectiveLayout);

  return (
    <nav
      className={cn("ctn-bar", className)}
      aria-label="Catalog navigation"
      style={style}
      data-theme-mode={appearance?.theme === "custom" ? "custom" : "inherit"}
      data-style={appearanceStyle}
      data-display={previewViewport ? effectiveDisplay : displayMode}
      data-icon-position={resolveIconPosition(previewViewport ? effectiveLayout : layout)}
      data-align-x={resolveHorizontalAlign(previewViewport ? effectiveLayout : layout)}
      data-align-y={resolveVerticalAlign(previewViewport ? effectiveLayout : layout)}
      data-label-align={resolveLabelAlign(previewViewport ? effectiveLayout : layout)}
      data-icon-box={resolveIconContainerStyle(previewViewport ? effectiveLayout : layout)}
      data-item-width={
        (previewViewport ? effectiveLayout : layout)?.itemWidth === "equal"
          ? "equal"
          : (previewViewport ? effectiveLayout : layout)?.itemWidth === "full"
            ? "full"
            : undefined
      }
      data-scroll={
        (previewViewport ? effectiveLayout : layout)?.horizontalScroll === false ? "off" : "on"
      }
      data-preview-viewport={previewViewport || undefined}
      {...(!previewViewport
        ? {
            ...semanticDataAttrs(responsive?.desktop, "d-"),
            ...semanticDataAttrs(responsive?.tablet, "t-"),
            ...semanticDataAttrs(responsive?.mobile, "m-"),
          }
        : {})}
    >
      <div className="ctn-bar__track">
        {items.map((item) => {
          const filterActive = isFilterAction(item)
            ? catalogNavItemIsFilterActive(item, filterState, matchCtx)
            : false;
          const pathActive = !isFilterAction(item)
            ? itemIsPathActive(pathname, item, activeCategorySlug, activeBrandSlug)
            : false;
          const active = filterActive || pathActive;
          const iconOnly =
            (previewViewport ? effectiveDisplay : displayMode) === "icon" ||
            (!previewViewport && displayMode === "icon");
          const tip =
            item.tooltip ||
            (iconOnly && (previewViewport ? effectiveTooltip : showTooltip) ? item.label : undefined);

          const content = (
            <span
              className={cn("ctn-bar__item", active && "ctn-bar__item--active")}
              title={tip || undefined}
              aria-label={iconOnly ? item.label : undefined}
            >
              <span className="ctn-bar__icon" aria-hidden>
                {item.icon && isImageIcon(item) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.icon} alt="" className="ctn-bar__icon-img" />
                ) : (
                  (() => {
                    const Icon = resolveCatalogNavLucide(item.icon);
                    return <Icon className="ctn-bar__icon-lucide" strokeWidth={1.5} />;
                  })()
                )}
              </span>
              <span className="ctn-bar__label">{item.label}</span>
              {item.badge ? (
                <span className="ctn-bar__badge">{item.badge}</span>
              ) : null}
            </span>
          );

          if (onPreviewItemClick) {
            return (
              <button
                key={item.id}
                type="button"
                className="ctn-bar__link"
                onClick={() => onPreviewItemClick(item)}
              >
                {content}
              </button>
            );
          }

          if (item.openInNewTab || item.targetType === "URL") {
            return (
              <a
                key={item.id}
                href={item.href}
                className="ctn-bar__link"
                target={item.openInNewTab ? "_blank" : undefined}
                rel={item.openInNewTab ? "noopener noreferrer" : undefined}
              >
                {content}
              </a>
            );
          }

          return (
            <Link key={item.id} href={item.href} className="ctn-bar__link">
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
