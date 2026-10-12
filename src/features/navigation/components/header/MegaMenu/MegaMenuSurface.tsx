"use client";

import { useEffect, useState, type HTMLAttributes } from "react";
import type { MegaMenuTabConfig, MenuItem, MenuLayoutType } from "@/features/navigation/types";
import { getItemHref } from "@/features/navigation/resolve-href";
import { cn } from "@/lib/utils";
import {
  resolveChildCardMedia,
  resolveEffectiveChildDisplayType,
  resolveMegaMenu,
  resolveMegaMenuChildDisplayType,
  resolveMegaMenuConfig,
  resolveMenuItemIconImageUrl,
  resolveMenuItemPhotoUrl,
} from "@/features/navigation/mega-menu-resolver";
import { clampMegaColumns, resolveIconLayoutConfig } from "@/features/navigation/mega-menu-form";
import type { NavIconVisibility } from "@/features/navigation/nav-icon-visibility";
import { resolveItemShowsNavIcon } from "@/features/navigation/nav-icon-visibility";
import {
  MegaMenuCardFrameMedia,
  MegaMenuIconVisibilityProvider,
  NavGlyph,
  NavIconMedia,
} from "./mega-menu-media";
import { MegaMenuShell } from "./MegaMenuShell";

interface Props {
  item: MenuItem;
  menuType: MenuLayoutType;
  localeCode: string;
  isOpen?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onLinkClick?: () => void;
  /** Header default icon visibility. Per-item placement overrides this for nav glyphs. */
  iconVisibility?: NavIconVisibility;
}

const DEFAULT_ICON_VISIBILITY: NavIconVisibility = {
  mobile: true,
  tablet: true,
  desktop: true,
};

function flyoutRootClass(base: string, isOpen?: boolean) {
  return cn(base, isOpen && "is-open");
}

function flyoutPointerProps(
  onMouseEnter?: () => void,
  onMouseLeave?: () => void,
): Pick<HTMLAttributes<HTMLDivElement>, "onMouseEnter" | "onMouseLeave"> {
  if (!onMouseEnter && !onMouseLeave) return {};
  return { onMouseEnter, onMouseLeave };
}

type ChildRow = {
  id: string;
  label: string;
  icon?: string;
  iconImageUrl?: string;
  href: string;
  type: MenuItem["type"];
  photoUrl?: string;
  displayType: "card" | "link";
  appearance: "list" | "icon" | "image" | "card";
  cardMedia: "image" | "icon" | null;
  showNavIcon: boolean;
};

function isCompactTextGrid(rows: ChildRow[], menuType: MenuLayoutType): boolean {
  // Existing compact behavior was: compact only when there are *no* visual cards.
  // Now that explicit link/card overrides exist, base this on resolved displayType.
  if (menuType === "grid") return false;
  return rows.length > 0 && rows.every((row) => row.displayType !== "card");
}

function buildChildRows(
  item: MenuItem,
  localeCode: string,
  menuType: MenuLayoutType,
  iconVisibility: NavIconVisibility,
): ChildRow[] {
  if (!item.children?.length) return [];
  return item.children.map((c) => {
    const appearance = resolveEffectiveChildDisplayType(c, null, menuType);
    const visual = appearance === "card" || appearance === "image";
    return {
      id: c.id,
      label: c.label,
      icon: c.icon?.trim() || c.resolvedIcon?.trim() || undefined,
      iconImageUrl: resolveMenuItemIconImageUrl(c),
      href: getItemHref(c, localeCode),
      type: c.type,
      photoUrl: resolveMenuItemPhotoUrl(c),
      displayType: visual ? "card" : resolveMegaMenuChildDisplayType(c, menuType),
      appearance,
      cardMedia: resolveChildCardMedia(c, appearance),
      showNavIcon: resolveItemShowsNavIcon(c.iconPlacement, "desktop", iconVisibility),
    };
  });
}

function rowsForTabIndex(tabIdx: number, tabs: MegaMenuTabConfig[], rows: ChildRow[]): ChildRow[] {
  if (!tabs.length) return rows;
  const tab = tabs[tabIdx];
  if (!tab) return rows;
  const assignedInOtherTabs = new Set(
    tabs.filter((_, i) => i !== tabIdx).flatMap((t) => t.childIds),
  );
  if (tabIdx === 0) {
    return rows.filter((r) => tab.childIds.includes(r.id) || !assignedInOtherTabs.has(r.id));
  }
  return rows.filter((r) => tab.childIds.includes(r.id));
}

function MegaMenuRowLink({
  child,
  cardClass,
  desc,
  onLinkClick,
}: {
  child: ChildRow;
  cardClass: string;
  desc: string | null;
  onLinkClick?: () => void;
}) {
  if ((child.appearance === "card" || child.appearance === "image") && child.photoUrl?.trim()) {
    return (
      <a
        href={child.href}
        className={`${cardClass} hb-mega-card-link hb-mega-card hb-mega-card--visual`.trim()}
        onClick={() => onLinkClick?.()}
      >
        <div className="hb-mega-card__media">
          <MegaMenuCardFrameMedia cardMedia="image" imageUrl={child.photoUrl} alt={child.label} />
        </div>
        <div className="hb-mega-card__caption">
          <h4>{child.label}</h4>
          {desc ? <p>{desc}</p> : null}
        </div>
      </a>
    );
  }

  if (child.appearance === "icon" && (child.iconImageUrl?.trim() || child.icon?.trim())) {
    return (
      <a
        href={child.href}
        className={`${cardClass} hb-mega-card-link hb-mega-card--icon`.trim()}
        onClick={() => onLinkClick?.()}
      >
        <NavIconMedia icon={child.showNavIcon ? child.icon : undefined} iconImageUrl={child.iconImageUrl} />
        <h4>{child.label}</h4>
        {desc ? <p>{desc}</p> : null}
      </a>
    );
  }

  return (
    <a
      href={child.href}
      className={`${cardClass} hb-mega-card-link hb-mega-card--text`.trim()}
      onClick={() => onLinkClick?.()}
    >
      <h4>{child.label}</h4>
      {desc ? <p>{desc}</p> : null}
    </a>
  );
}

export function MegaMenuSurface({
  item,
  menuType,
  localeCode,
  isOpen,
  onMouseEnter,
  onMouseLeave,
  onLinkClick,
  iconVisibility = DEFAULT_ICON_VISIBILITY,
}: Props) {
  const [activeTabIdx, setActiveTabIdx] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveTabIdx(0);
  }, [item.id]);

  // v2 gate: explicit version === 2 AND structural validation — never infer from type alone.
  const v2View = resolveMegaMenu(item, localeCode, menuType);
  if (v2View.isV2 && (v2View.type === "sidebar" || v2View.type === "panel")) {
    if (v2View.panels.length === 0 && !(item.children?.length)) return null;
    return (
      <MegaMenuIconVisibilityProvider value={iconVisibility}>
        <MegaMenuShell
          view={v2View}
          isOpen={isOpen}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          onLinkClick={onLinkClick}
        />
      </MegaMenuIconVisibilityProvider>
    );
  }

  const resolved = resolveMegaMenuConfig(item, menuType);
  const effectiveMenuType = resolved.type;
  // Never use v2 shell for legacy types even if version sneaks in invalidly.
  if (effectiveMenuType === "sidebar" || effectiveMenuType === "panel") {
    // Invalid v2 (missing version/panels) — fall through to empty rather than half-render.
    return null;
  }

  const rows = buildChildRows(item, localeCode, effectiveMenuType, iconVisibility);
  const mega = item.megaMenu;

  if (rows.length === 0) return null;

  const gridCols = clampMegaColumns(mega?.gridColumns ?? 3);
  const columnCount = clampMegaColumns(mega?.columnCount ?? 3);
  const tabsConfig = mega?.tabs?.filter((t) => t.label.trim() || t.childIds.length);
  const tabRows =
    effectiveMenuType === "tabbed" && tabsConfig?.length
      ? rowsForTabIndex(activeTabIdx, tabsConfig, rows)
      : rows;
  const compactTextGrid = isCompactTextGrid(tabRows, effectiveMenuType);
  const gridClassName = cn("collections-grid", compactTextGrid && "collections-grid--compact");
  const pointerProps = flyoutPointerProps(onMouseEnter, onMouseLeave);
  const megaMenuStyle = resolved.cssVariables as React.CSSProperties;

  const cardDescription = (childId: string) => {
    const d = mega?.childDescriptions?.[childId];
    return d?.trim() ? d.trim() : null;
  };

  if (effectiveMenuType === "dropdown") {
    const hideIcons = mega?.dropdownShowIcons === false;
    return (
      <div
        className={flyoutRootClass("dropdown-menu", isOpen)}
        data-mega-menu="dropdown"
        {...pointerProps}
        style={megaMenuStyle}
      >
        {rows.map((child) => {
          const photoCard =
            (child.appearance === "image" || child.appearance === "card") && Boolean(child.photoUrl?.trim());
          const iconRow =
            !hideIcons &&
            child.appearance === "icon" &&
            Boolean(child.iconImageUrl?.trim() || (child.showNavIcon && child.icon?.trim()));
          return (
            <a
              key={child.id}
              href={child.href}
              className={cn("hb-mega-dropdown-row", photoCard && "hb-mega-dropdown-row--visual")}
              onClick={() => onLinkClick?.()}
            >
              {photoCard ? (
                <span className="hb-mega-dropdown-thumb" aria-hidden>
                  <MegaMenuCardFrameMedia cardMedia="image" imageUrl={child.photoUrl} alt="" />
                </span>
              ) : iconRow ? (
                <span className="hb-mega-dropdown-icon" aria-hidden>
                  <NavIconMedia
                    icon={child.showNavIcon ? child.icon : undefined}
                    iconImageUrl={child.iconImageUrl}
                  />
                </span>
              ) : null}
              <span className="hb-mega-dropdown-label">{child.label}</span>
            </a>
          );
        })}
      </div>
    );
  }

  if (effectiveMenuType === "icon") {
    const iconLayout = resolveIconLayoutConfig(mega?.iconLayout);
    // Content-sized columns leave free space so data-icon-align (justify-content) can shift the group.
    const colStyle =
      iconLayout.columns === "auto"
        ? undefined
        : { gridTemplateColumns: `repeat(${iconLayout.columns}, minmax(5.5rem, max-content))` };
    return (
      <div
        className={flyoutRootClass("mega-menu", isOpen)}
        data-mega-menu="icon"
        data-icon-size={iconLayout.iconSize}
        data-icon-position={iconLayout.iconPosition}
        data-icon-align={iconLayout.alignment}
        data-icon-spacing={iconLayout.spacing}
        {...pointerProps}
        style={megaMenuStyle}
      >
        <div className="mega-inner">
          <div className={cn("hb-icon-layout-grid", iconLayout.columns === "auto" && "hb-icon-layout-grid--auto")} style={colStyle}>
            {rows.map((child) => {
              const desc = iconLayout.showDescriptions ? cardDescription(child.id) : null;
              const sourceChild = item.children?.find((c) => c.id === child.id);
              const badge =
                iconLayout.showBadges && sourceChild?.badgeText?.trim()
                  ? sourceChild.badgeText.trim()
                  : null;
              if ((child.appearance === "card" || child.appearance === "image") && child.photoUrl?.trim()) {
                return (
                  <MegaMenuRowLink
                    key={child.id}
                    child={child}
                    cardClass="hb-icon-layout-item"
                    desc={desc}
                    onLinkClick={onLinkClick}
                  />
                );
              }
              const showIcon =
                child.appearance === "icon" &&
                Boolean(child.iconImageUrl?.trim() || child.icon?.trim());
              return (
                <a
                  key={child.id}
                  href={child.href}
                  className="hb-icon-layout-item"
                  onClick={() => onLinkClick?.()}
                >
                  {showIcon ? (
                    <span className="hb-icon-layout-item__icon" aria-hidden>
                      <NavIconMedia icon={child.icon} iconImageUrl={child.iconImageUrl} />
                    </span>
                  ) : null}
                  <span className="hb-icon-layout-item__label">{child.label}</span>
                  {badge ? <span className="hb-icon-layout-item__badge">{badge}</span> : null}
                  {desc ? <span className="hb-icon-layout-item__desc">{desc}</span> : null}
                </a>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (effectiveMenuType === "columns") {
    return (
      <div
        className={flyoutRootClass("mega-menu", isOpen)}
        data-mega-menu="columns"
        {...pointerProps}
        style={megaMenuStyle}
      >
        <div className="mega-inner">
          <div
            className="columns-grid"
            style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
          >
            {tabRows.map((child) => (
              <MegaMenuRowLink
                key={child.id}
                child={child}
                cardClass="col-card"
                desc={cardDescription(child.id)}
                onLinkClick={onLinkClick}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (effectiveMenuType === "mixed") {
    const left = mega?.mixed?.left;
    const right = mega?.mixed?.right;
    return (
      <div
        className={flyoutRootClass("mega-menu", isOpen)}
        data-mega-menu="mixed"
        {...pointerProps}
        style={megaMenuStyle}
      >
        <div className="mega-inner">
          <div className="mixed-grid">
            <div className="feature-panel">
              <NavGlyph icon={left?.icon} />
              <h4>{left?.title?.trim() || item.label}</h4>
              {left?.body?.trim() ? <p>{left.body.trim()}</p> : null}
            </div>
            <div className="mixed-links">
              {rows.map((child) => {
                const photoCard =
                  (child.appearance === "image" || child.appearance === "card") && Boolean(child.photoUrl?.trim());
                const iconRow =
                  child.appearance === "icon" &&
                  Boolean(child.iconImageUrl?.trim() || child.icon?.trim());
                return (
                  <a
                    key={child.id}
                    href={child.href}
                    className={photoCard ? "hb-mega-mixed-link hb-mega-mixed-link--visual" : undefined}
                    onClick={() => onLinkClick?.()}
                  >
                    {photoCard ? (
                      <span className="hb-mega-mixed-thumb" aria-hidden>
                        <MegaMenuCardFrameMedia cardMedia="image" imageUrl={child.photoUrl} alt="" />
                      </span>
                    ) : iconRow ? (
                      <NavIconMedia icon={child.icon} iconImageUrl={child.iconImageUrl} />
                    ) : null}
                    <span>{child.label}</span>
                  </a>
                );
              })}
            </div>
            <div className="feature-panel">
              <NavGlyph icon={right?.icon} />
              <h4>{right?.title?.trim() || "Special"}</h4>
              {right?.body?.trim() ? <p>{right.body.trim()}</p> : null}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (effectiveMenuType === "tabbed") {
    const hasCustomTabs = !!tabsConfig?.length;
    const displayRows = hasCustomTabs ? tabRows : rows;

    return (
      <div
        className={flyoutRootClass("mega-menu", isOpen)}
        data-mega-menu="tabbed"
        {...pointerProps}
        style={megaMenuStyle}
      >
        <div className="mega-inner">
          {hasCustomTabs ? (
            <div className="tab-head" role="tablist" aria-label="Mega menu sections">
              {tabsConfig!.map((t, i) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={i === activeTabIdx}
                  className={`tab-pill ${i === activeTabIdx ? "active" : ""}`}
                  onClick={() => setActiveTabIdx(i)}
                >
                  {t.label.trim() || `Tab ${i + 1}`}
                </button>
              ))}
            </div>
          ) : null}
          <div
            className={gridClassName}
            style={
              compactTextGrid
                ? undefined
                : {
                    gridTemplateColumns: `repeat(${gridCols}, minmax(min(100%, 200px), 1fr))`,
                  }
            }
          >
            {displayRows.map((child) => (
              <MegaMenuRowLink
                key={child.id}
                child={child}
                cardClass="collection-card"
                desc={cardDescription(child.id)}
                onLinkClick={onLinkClick}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={flyoutRootClass("mega-menu", isOpen)}
      data-mega-menu="grid"
      {...pointerProps}
      style={megaMenuStyle}
    >
      <div className="mega-inner">
        <div
          className={gridClassName}
          style={
            compactTextGrid
              ? undefined
              : {
                  gridTemplateColumns: `repeat(${gridCols}, minmax(min(100%, 200px), 1fr))`,
                }
          }
        >
          {tabRows.map((child) => (
            <MegaMenuRowLink
              key={child.id}
              child={child}
              cardClass="collection-card"
              desc={cardDescription(child.id)}
              onLinkClick={onLinkClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
