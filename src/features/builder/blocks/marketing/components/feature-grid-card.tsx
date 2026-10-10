"use client";

import { OptimizedImage } from "@/components/ui/optimized-image";
import { Link } from "@/i18n/navigation";
import { resolveMarketingIcon } from "@/features/builder/blocks/marketing/lib/icon-map";
import { resolveItemField, type ResolveItemFieldOptions } from "@/features/builder/blocks/marketing/lib/resolve-item-locale";
import {
  getFeatureGridContentOrder,
  isFeatureGridElementVisible,
  resolveFeatureGridDescriptionHtml,
} from "@/features/builder/blocks/marketing/lib/normalize-feature-grid";
import { FeatureGridExpandableHtml } from "@/features/builder/blocks/marketing/components/feature-grid-expandable-html";
import { prepareFeatureGridDescriptionHtml } from "@/features/builder/blocks/marketing/lib/prepare-feature-grid-html";
import type {
  FeatureGridCardStyle,
  FeatureGridCardPresentation,
  FeatureGridContentAlign,
  FeatureGridContentElement,
  FeatureGridExpandMode,
  FeatureGridHoverEffect,
  FeatureGridIconShape,
  FeatureGridImageAspect,
  FeatureGridItem,
  FeatureGridPreviewBy,
  FeatureGridReadMoreStyle,
  FeatureGridVisualType,
} from "@/features/builder/blocks/marketing/schemas/marketing-blocks";
import { cn } from "@/lib/utils";

export type FeatureGridCardProps = {
  item: FeatureGridItem;
  index: number;
  locale: string;
  itemLocaleOptions?: ResolveItemFieldOptions;
  cardPresentation: FeatureGridCardPresentation;
  cardStyle: FeatureGridCardStyle;
  defaultVisualType?: FeatureGridVisualType;
  imageAspect?: FeatureGridImageAspect;
  expandHideWhenFooterLink?: boolean;
  /** Accordion rows render the header and panel separately. */
  part?: "all" | "header" | "panel";
  showVisual?: boolean;
  contentAlign: FeatureGridContentAlign;
  equalHeight: boolean;
  minCardHeight: number;
  iconSize: number;
  iconShape: FeatureGridIconShape;
  showAccentLine?: boolean;
  expandEnabled: boolean;
  expandMode: FeatureGridExpandMode;
  previewBy: FeatureGridPreviewBy;
  previewLimit: number;
  readMoreLabel: string;
  readLessLabel: string;
  readMoreStyle: FeatureGridReadMoreStyle;
  cardHoverEffect: FeatureGridHoverEffect;
  cardBackgroundColor?: string;
  cardTextColor?: string;
  cardBorderColor?: string;
  cardAccentColor?: string;
  cardBorderRadius?: string;
  cardPadding?: string;
  contentOrder?: FeatureGridContentElement[];
  visibleElements?: Partial<Record<FeatureGridContentElement, boolean>>;
};

const styleClasses: Record<FeatureGridCardStyle, string> = {
  solid: "border border-border/60 bg-card",
  outlined: "border-2 border-primary/20 bg-transparent",
  elevated: "border border-border/40 bg-card shadow-md",
  minimal: "border-0 bg-transparent shadow-none",
  glass: "border border-white/20 bg-card/60 shadow-sm backdrop-blur-md",
};

const hoverClasses: Record<FeatureGridHoverEffect, string> = {
  none: "",
  lift: "transition-transform motion-reduce:transition-none hover:-translate-y-1",
  border: "transition-colors hover:border-primary/50",
  shadow: "transition-shadow hover:shadow-lg",
  background: "transition-colors hover:bg-muted/40",
};

const alignClasses: Record<FeatureGridContentAlign, string> = {
  left: "text-start items-start",
  center: "text-center items-center",
  right: "text-end items-end",
};

const aspectClasses: Record<FeatureGridImageAspect, string> = {
  auto: "",
  square: "aspect-square w-full",
  video: "aspect-video w-full",
  landscape: "aspect-[4/3] w-full",
  portrait: "aspect-[3/4] w-full",
};

export function resolveFeatureGridVisual(
  item: FeatureGridItem,
  blockDefault: FeatureGridVisualType = "auto",
): "icon" | "image" | "number" | "none" {
  const requested =
    !item.visualType || item.visualType === "inherit" ? blockDefault : item.visualType;
  if (requested === "none") return "none";
  if (requested === "number") return "number";
  if (requested === "image") return item.imageUrl ? "image" : "none";
  if (requested === "icon") return item.icon ? "icon" : "none";
  if (item.imageUrl) return "image";
  if (item.icon) return "icon";
  return "none";
}

function cardExpandEnabled(item: FeatureGridItem, blockEnabled: boolean): boolean {
  if (item.expandEnabled === "on") return true;
  if (item.expandEnabled === "off") return false;
  return blockEnabled;
}

export function FeatureGridCard({
  item,
  index,
  locale,
  itemLocaleOptions,
  cardPresentation,
  cardStyle,
  defaultVisualType = "auto",
  imageAspect: blockImageAspect = "auto",
  expandHideWhenFooterLink = true,
  part = "all",
  showVisual = true,
  contentAlign,
  equalHeight,
  minCardHeight,
  iconSize,
  iconShape,
  showAccentLine = true,
  expandEnabled: blockExpandEnabled,
  expandMode,
  previewBy,
  previewLimit,
  readMoreLabel,
  readLessLabel,
  readMoreStyle,
  cardHoverEffect,
  cardBackgroundColor,
  cardTextColor,
  cardBorderColor,
  cardAccentColor,
  cardBorderRadius,
  cardPadding,
  contentOrder: blockContentOrder,
  visibleElements: blockVisibleElements,
}: FeatureGridCardProps) {
  const title = resolveItemField(item, "title", locale, itemLocaleOptions);
  const subtitle = resolveItemField(item, "subtitle", locale, itemLocaleOptions);
  const badge = resolveItemField(item, "badge", locale, itemLocaleOptions);
  const numberLabel =
    resolveItemField(item, "numberLabel", locale, itemLocaleOptions) ||
    String(index + 1).padStart(2, "0");
  const linkLabel = resolveItemField(item, "linkLabel", locale, itemLocaleOptions);
  const buttonLabel = resolveItemField(item, "buttonLabel", locale, itemLocaleOptions);
  const footerText = resolveItemField(item, "footerText", locale, itemLocaleOptions);
  const descriptionHtml = resolveFeatureGridDescriptionHtml(item, locale, itemLocaleOptions);
  const Icon = resolveMarketingIcon(item.icon);
  const visual = resolveFeatureGridVisual(item, defaultVisualType);
  const expandOn = cardExpandEnabled(item, blockExpandEnabled);
  const effectivePreviewLimit = item.expandPreviewOverride || previewLimit;
  const order = getFeatureGridContentOrder(blockContentOrder ?? item.contentOrder);
  const visibleElements = blockVisibleElements ?? item.visibleElements;
  const isHorizontal = part === "all" && cardPresentation === "horizontal";
  const isIconLayout = cardPresentation === "icon";
  const isNumbered = cardPresentation === "numbered";
  const effectiveAlign = cardPresentation === "icon" ? "center" : contentAlign;
  const resolvedAspect =
    item.imageAspect && item.imageAspect !== "auto" ? item.imageAspect : blockImageAspect;
  const useFluidImage = resolvedAspect !== "auto";

  const overrides = item.styleOverrides ?? {};
  const cardHref = item.cardClickable
    ? item.buttonHref || item.href || item.footerHref
    : "";
  const openInNewTab = item.openInNewTab;

  const shapeClass =
    iconShape === "circle" ? "rounded-full" : iconShape === "square" ? "rounded-none" : "rounded-lg";

  const resolvedCardBg = overrides.backgroundColor || cardBackgroundColor || "";
  const style: React.CSSProperties = {
    ...(equalHeight && minCardHeight > 0 ? { minHeight: minCardHeight } : {}),
    ...(resolvedCardBg ? { backgroundColor: resolvedCardBg } : {}),
    ...(overrides.textColor || cardTextColor ? { color: overrides.textColor || cardTextColor } : {}),
    ...(overrides.borderColor || cardBorderColor
      ? { borderColor: overrides.borderColor || cardBorderColor }
      : {}),
    ...(overrides.borderRadius || cardBorderRadius
      ? { borderRadius: overrides.borderRadius || cardBorderRadius }
      : {}),
    ...(overrides.padding || cardPadding ? { padding: overrides.padding || cardPadding } : {}),
    ...(overrides.shadow ? { boxShadow: overrides.shadow } : {}),
    ...(cardAccentColor || overrides.accentColor
      ? ({ ["--fg-accent" as string]: overrides.accentColor || cardAccentColor } as React.CSSProperties)
      : {}),
    ["--feature-grid-card-bg" as string]: resolvedCardBg || "var(--card, #ffffff)",
  };

  const renderElement = (el: FeatureGridContentElement) => {
    if (!isFeatureGridElementVisible(visibleElements, el)) return null;

    switch (el) {
      case "visual": {
        if (!showVisual || visual === "none") return null;
        if (visual === "number") {
          return (
            <span
              key="visual"
              className={cn(
                part === "header" ? "mb-0" : "mb-4",
                "inline-flex items-center justify-center bg-primary/10 font-heading font-semibold text-primary",
                shapeClass,
                cardPresentation === "icon" && "mx-auto"
              )}
              style={{
                width: iconSize,
                height: iconSize,
                fontSize: Math.max(14, Math.round(iconSize * 0.34)),
                ...(cardAccentColor || overrides.accentColor ? { color: "var(--fg-accent)" } : {}),
              }}
            >
              {numberLabel}
            </span>
          );
        }
        if (visual === "image" && item.imageUrl) {
          return (
            <div
              key="visual"
              className={cn(
                "relative overflow-hidden",
                part === "header" ? "mb-0" : "mb-4",
                useFluidImage ? aspectClasses[resolvedAspect] : shapeClass,
                cardPresentation === "icon" && "mx-auto",
                isHorizontal && useFluidImage && "mb-0 w-40 shrink-0"
              )}
              style={useFluidImage ? undefined : { width: iconSize, height: iconSize }}
            >
              <OptimizedImage
                src={item.imageUrl}
                alt=""
                fill
                skipFade
                className="object-cover"
                sizes={`${iconSize}px`}
                loading="lazy"
              />
            </div>
          );
        }
        if (visual === "icon" && item.icon) {
          return (
            <div
              key="visual"
              className={cn(
                part === "header" ? "mb-0" : "mb-4",
                "flex items-center justify-center bg-primary/10 text-primary",
                shapeClass,
                isIconLayout && "mx-auto"
              )}
              style={{ width: iconSize, height: iconSize }}
              aria-hidden
            >
              <Icon style={{ width: iconSize * 0.5, height: iconSize * 0.5 }} />
            </div>
          );
        }
        return null;
      }
      case "badge":
        if (!badge) return null;
        return (
          <span
            key="badge"
            className="mb-2 inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-primary"
          >
            {badge}
          </span>
        );
      case "number":
        if (visual === "number" && showVisual && isFeatureGridElementVisible(visibleElements, "visual")) return null;
        if (!isNumbered && !resolveItemField(item, "numberLabel", locale, itemLocaleOptions)) return null;
        return (
          <span
            key="number"
            className="mb-1 block font-heading text-sm font-semibold tracking-wide text-primary/80"
            style={cardAccentColor || overrides.accentColor ? { color: "var(--fg-accent)" } : undefined}
          >
            {numberLabel}
            {title && !title.trim().startsWith(numberLabel) ? "." : ""}
          </span>
        );
      case "title":
        if (!title) return null;
        {
          const hasNumberEl =
            isNumbered &&
            isFeatureGridElementVisible(visibleElements, "number") &&
            order.includes("number");
          const displayTitle =
            isNumbered && !hasNumberEl ? `${numberLabel}. ${title}` : title;
          return (
            <h3
              key="title"
              className={cn(
                "font-heading text-lg font-semibold text-card-foreground",
                isNumbered && "text-xl"
              )}
              dir="auto"
            >
              {displayTitle}
            </h3>
          );
        }
      case "subtitle":
        if (!subtitle) return null;
        return (
          <p key="subtitle" className="mt-1 text-sm text-muted-foreground" dir="auto">
            {subtitle}
          </p>
        );
      case "description": {
        if (!descriptionHtml) return null;
        const safeHtml = prepareFeatureGridDescriptionHtml(descriptionHtml);
        if (!safeHtml) return null;
        const showDivider = showAccentLine && (title || isNumbered);
        // Disable inline Read More if footer link is present to avoid conflicting CTAs
        const hasFooterLink = Boolean(footerText && item.footerHref);
        const descriptionEnabled = expandOn && !(expandHideWhenFooterLink && hasFooterLink);
        return (
          <div key="description" className="w-full">
            {showDivider ? <div className={cn("gold-divider my-3", effectiveAlign === "center" && "mx-auto", effectiveAlign === "right" && "ms-auto")} /> : null}
            <FeatureGridExpandableHtml
              html={safeHtml}
              enabled={descriptionEnabled}
              mode={expandMode}
              previewBy={previewBy}
              previewLimit={effectivePreviewLimit}
              moreLabel={readMoreLabel}
              lessLabel={readLessLabel}
              buttonStyle={readMoreStyle}
              dialogTitle={title || "Details"}
            />
          </div>
        );
      }
      case "link":
        if (!item.href || !linkLabel) return null;
        return (
          <Link
            key="link"
            href={item.href}
            className="mt-3 inline-block cursor-pointer text-sm font-medium text-primary hover:underline"
            target={openInNewTab ? "_blank" : undefined}
            rel={openInNewTab ? "noopener noreferrer" : undefined}
            onClick={(e) => e.stopPropagation()}
          >
            {linkLabel}
          </Link>
        );
      case "button": {
        const href = item.buttonHref || item.href;
        if (!href || !buttonLabel) return null;
        return (
          <Link
            key="button"
            href={href}
            className="mt-4 inline-flex cursor-pointer items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            target={openInNewTab ? "_blank" : undefined}
            rel={openInNewTab ? "noopener noreferrer" : undefined}
            onClick={(e) => e.stopPropagation()}
          >
            {buttonLabel}
          </Link>
        );
      }
      case "footer": {
        if (!footerText) return null;
        if (item.footerHref) {
          return (
            <Link
              key="footer"
              href={item.footerHref}
              className="mt-auto inline-flex cursor-pointer items-center gap-1 pt-4 text-xs font-medium text-primary transition-colors hover:text-primary/80 hover:underline"
              target={openInNewTab ? "_blank" : undefined}
              rel={openInNewTab ? "noopener noreferrer" : undefined}
              onClick={(e) => e.stopPropagation()}
            >
              {footerText}
              <svg
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </Link>
          );
        }
        return (
          <p key="footer" className="mt-auto pt-4 text-xs text-muted-foreground">
            {footerText}
          </p>
        );
      }
      default:
        return null;
    }
  };

  const headerElements = new Set<FeatureGridContentElement>([
    "visual",
    "badge",
    "number",
    "title",
    "subtitle",
  ]);
  const visibleOrder = order.filter((el) => {
    if (part === "header") return headerElements.has(el);
    if (part === "panel") return !headerElements.has(el);
    return true;
  });

  const contentGap = item.contentGap?.trim();
  const body = (
    <div
      className={cn(
        "flex",
        part === "header" ? "flex-row flex-wrap items-center gap-3" : "flex-col",
        !isHorizontal && part !== "header" && alignClasses[effectiveAlign],
        isHorizontal && "min-w-0 flex-1"
      )}
      style={contentGap ? { gap: contentGap } : undefined}
    >
      {visibleOrder.map((el) => renderElement(el))}
    </div>
  );

  if (part === "header" || part === "panel") {
    return body;
  }

  const mediaBlock =
    isHorizontal && visual !== "none" ? (
      <div className="shrink-0">
        {renderElement("visual")}
      </div>
    ) : null;

  const inner = isHorizontal ? (
    <div className="flex gap-4">
      {mediaBlock}
      <div className="flex min-w-0 flex-1 flex-col">
        {visibleOrder.filter((el) => el !== "visual").map((el) => renderElement(el))}
      </div>
    </div>
  ) : (
    body
  );

  const cardClassName = cn(
    "relative p-6",
    !cardBorderRadius && "rounded-xl",
    styleClasses[cardStyle],
    hoverClasses[cardHoverEffect],
    equalHeight && "h-full",
    "flex flex-col"
  );

  // Stretched overlay link: never wrap inner CTAs in <a> (illegal a>a → React #418).
  // Overlay is mouse/touch only (aria-hidden + tabIndex=-1); inner links/buttons stay tab stops.
  if (cardHref) {
    return (
      <div className={cn(cardClassName, "relative")} style={style}>
        <Link
          href={cardHref}
          className="absolute inset-0 z-0"
          aria-hidden="true"
          tabIndex={-1}
          target={openInNewTab ? "_blank" : undefined}
          rel={openInNewTab ? "noopener noreferrer" : undefined}
        />
        <div className="relative z-10 flex h-full flex-col pointer-events-none [&_a]:pointer-events-auto [&_button]:pointer-events-auto">
          {inner}
        </div>
      </div>
    );
  }

  return (
    <div className={cardClassName} style={style}>
      {inner}
    </div>
  );
}
