"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { resolveMarketingIcon } from "@/features/builder/blocks/marketing/lib/icon-map";
import { resolveItemField, type ResolveItemFieldOptions } from "@/features/builder/blocks/marketing/lib/resolve-item-locale";
import {
  getFeatureGridContentOrder,
  isFeatureGridElementVisible,
  resolveFeatureGridDescriptionHtml,
} from "@/features/builder/blocks/marketing/lib/normalize-feature-grid";
import { FeatureGridExpandableHtml } from "@/features/builder/blocks/marketing/components/feature-grid-expandable-html";
import type {
  FeatureGridCardStyle,
  FeatureGridContentAlign,
  FeatureGridContentElement,
  FeatureGridExpandMode,
  FeatureGridHoverEffect,
  FeatureGridIconShape,
  FeatureGridItem,
  FeatureGridLayout,
  FeatureGridPreviewBy,
  FeatureGridReadMoreStyle,
} from "@/features/builder/blocks/marketing/schemas/marketing-blocks";
import { cn } from "@/lib/utils";

export type FeatureGridCardProps = {
  item: FeatureGridItem;
  index: number;
  locale: string;
  itemLocaleOptions?: ResolveItemFieldOptions;
  layout: FeatureGridLayout;
  cardStyle: FeatureGridCardStyle;
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

function resolveVisualType(item: FeatureGridItem): "icon" | "image" | "none" {
  if (item.visualType === "none") return "none";
  if (item.visualType === "image") return item.imageUrl ? "image" : "none";
  if (item.visualType === "icon") return item.icon ? "icon" : "none";
  // auto
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
  layout,
  cardStyle,
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
  const visual = resolveVisualType(item);
  const expandOn = cardExpandEnabled(item, blockExpandEnabled);
  const effectivePreviewLimit = item.expandPreviewOverride || previewLimit;
  const order = getFeatureGridContentOrder(item);
  const isHorizontal = layout === "horizontal";
  const isIconLayout = layout === "icon";
  const isNumbered = layout === "numbered";
  const effectiveAlign = isIconLayout ? "center" : contentAlign;

  const overrides = item.styleOverrides ?? {};
  const cardHref = item.cardClickable
    ? item.buttonHref || item.href || item.footerHref
    : "";
  const openInNewTab = item.openInNewTab;

  const shapeClass =
    iconShape === "circle" ? "rounded-full" : iconShape === "square" ? "rounded-none" : "rounded-lg";

  const style: React.CSSProperties = {
    ...(equalHeight && minCardHeight > 0 ? { minHeight: minCardHeight } : {}),
    ...(overrides.backgroundColor || cardBackgroundColor
      ? { backgroundColor: overrides.backgroundColor || cardBackgroundColor }
      : {}),
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
  };

  const renderElement = (el: FeatureGridContentElement) => {
    if (!isFeatureGridElementVisible(item, el)) return null;

    switch (el) {
      case "visual": {
        if (visual === "none") return null;
        if (visual === "image" && item.imageUrl) {
          return (
            <div
              key="visual"
              className={cn("relative mb-4 overflow-hidden", shapeClass, isIconLayout && "mx-auto")}
              style={{ width: iconSize, height: iconSize }}
            >
              <Image
                src={item.imageUrl}
                alt=""
                fill
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
                "mb-4 flex items-center justify-center bg-primary/10 text-primary",
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
            isFeatureGridElementVisible(item, "number") &&
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
        const showDivider = showAccentLine && (title || isNumbered);
        return (
          <div key="description" className="w-full">
            {showDivider ? <div className={cn("gold-divider my-3", effectiveAlign === "center" && "mx-auto", effectiveAlign === "right" && "ms-auto")} /> : null}
            <FeatureGridExpandableHtml
              html={descriptionHtml}
              enabled={expandOn}
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
            className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
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
            className="mt-4 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            target={openInNewTab ? "_blank" : undefined}
            rel={openInNewTab ? "noopener noreferrer" : undefined}
            onClick={(e) => e.stopPropagation()}
          >
            {buttonLabel}
          </Link>
        );
      }
      case "footer":
        if (!footerText) return null;
        if (item.footerHref) {
          return (
            <Link
              key="footer"
              href={item.footerHref}
              className="mt-auto pt-4 text-xs text-muted-foreground hover:text-primary"
              onClick={(e) => e.stopPropagation()}
            >
              {footerText}
            </Link>
          );
        }
        return (
          <p key="footer" className="mt-auto pt-4 text-xs text-muted-foreground">
            {footerText}
          </p>
        );
      default:
        return null;
    }
  };

  const body = (
    <div
      className={cn(
        "flex flex-col",
        !isHorizontal && alignClasses[effectiveAlign],
        isHorizontal && "min-w-0 flex-1"
      )}
    >
      {order.map((el) => renderElement(el))}
    </div>
  );

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
        {order.filter((el) => el !== "visual").map((el) => renderElement(el))}
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

  if (cardHref) {
    return (
      <Link
        href={cardHref}
        className={cn(cardClassName, "no-underline")}
        style={style}
        target={openInNewTab ? "_blank" : undefined}
        rel={openInNewTab ? "noopener noreferrer" : undefined}
      >
        {inner}
      </Link>
    );
  }

  return (
    <div className={cardClassName} style={style}>
      {inner}
    </div>
  );
}
