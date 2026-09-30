"use client";

import { useEffect, useState, type HTMLAttributes } from "react";
import type { MegaMenuTabConfig, MenuItem, MenuLayoutType } from "@/features/navigation/types";
import { getItemHref } from "@/features/navigation/resolve-href";
import { cn } from "@/lib/utils";
import {
  resolveMegaMenu,
  resolveMegaMenuChildDisplayType,
  resolveMegaMenuConfig,
} from "@/features/navigation/mega-menu-resolver";
import { clampMegaColumns, resolveIconLayoutConfig } from "@/features/navigation/mega-menu-form";
import { MegaMenuVisualImage, NavGlyph, NavGlyphOrImage } from "./mega-menu-media";
import { MegaMenuShell } from "./MegaMenuShell";

interface Props {
  item: MenuItem;
  menuType: MenuLayoutType;
  localeCode: string;
  isOpen?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onLinkClick?: () => void;
}

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
  href: string;
  type: MenuItem["type"];
  imageUrl?: string;
  displayType: "card" | "link";
};

function isCompactTextGrid(rows: ChildRow[], menuType: MenuLayoutType): boolean {
  // Existing compact behavior was: compact only when there are *no* visual cards.
  // Now that explicit link/card overrides exist, base this on resolved displayType.
  if (menuType === "grid") return false;
  return rows.length > 0 && rows.every((row) => row.displayType !== "card");
}

function buildChildRows(item: MenuItem, localeCode: string, menuType: MenuLayoutType): ChildRow[] {
  if (!item.children?.length) return [];
  return item.children.map((c) => ({
    id: c.id,
    label: c.label,
    icon: c.icon,
    href: getItemHref(c, localeCode),
    type: c.type,
    imageUrl: c.imageUrl,
    displayType: resolveMegaMenuChildDisplayType(c, menuType),
  }));
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
  if (child.displayType === "card") {
    return (
      <a
        href={child.href}
        className={`${cardClass} hb-mega-card-link hb-mega-card hb-mega-card--visual`.trim()}
        onClick={() => onLinkClick?.()}
      >
        <div className="hb-mega-card__media">
          <MegaMenuVisualImage src={child.imageUrl} alt={child.label} />
          <div className="hb-mega-card__scrim" aria-hidden="true" />
          <div className="hb-mega-card__caption">
            {child.icon?.trim() ? <NavGlyph icon={child.icon} /> : null}
            <h4>{child.label}</h4>
            {desc ? <p>{desc}</p> : null}
          </div>
        </div>
      </a>
    );
  }

  return (
    <a
      href={child.href}
      className={`${cardClass} hb-mega-card-link hb-mega-card--text`.trim()}
      onClick={() => onLinkClick?.()}
    >
      <NavGlyphOrImage icon={child.icon} imageUrl={child.imageUrl} />
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
      <MegaMenuShell
        view={v2View}
        isOpen={isOpen}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onLinkClick={onLinkClick}
      />
    );
  }

  const resolved = resolveMegaMenuConfig(item, menuType);
  const effectiveMenuType = resolved.type;
  // Never use v2 shell for legacy types even if version sneaks in invalidly.
  if (effectiveMenuType === "sidebar" || effectiveMenuType === "panel") {
    // Invalid v2 (missing version/panels) — fall through to empty rather than half-render.
    return null;
  }

  const rows = buildChildRows(item, localeCode, effectiveMenuType);
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
    const showIconColumn =
      !hideIcons &&
      rows.some(
        (row) => row.icon?.trim() || row.imageUrl?.trim() || row.displayType === "card",
      );
    return (
      <div
        className={flyoutRootClass("dropdown-menu", isOpen)}
        data-mega-menu="dropdown"
        {...pointerProps}
        style={megaMenuStyle}
      >
        {rows.map((child) => {
          const visual = child.displayType === "card";
          return (
            <a
              key={child.id}
              href={child.href}
              className={cn("hb-mega-dropdown-row", visual && "hb-mega-dropdown-row--visual")}
              onClick={() => onLinkClick?.()}
            >
              {visual ? (
                <span className="hb-mega-dropdown-thumb" aria-hidden>
                  <MegaMenuVisualImage src={child.imageUrl} alt="" />
                </span>
              ) : showIconColumn ? (
                <span className="hb-mega-dropdown-icon" aria-hidden>
                  <NavGlyphOrImage icon={child.icon} imageUrl={child.imageUrl} />
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
              return (
                <a
                  key={child.id}
                  href={child.href}
                  className="hb-icon-layout-item"
                  onClick={() => onLinkClick?.()}
                >
                  <span className="hb-icon-layout-item__icon" aria-hidden>
                    <NavGlyphOrImage icon={child.icon} imageUrl={child.imageUrl} alt="" />
                  </span>
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
                const visual = child.displayType === "card";
                return (
                  <a
                    key={child.id}
                    href={child.href}
                    className={visual ? "hb-mega-mixed-link hb-mega-mixed-link--visual" : undefined}
                    onClick={() => onLinkClick?.()}
                  >
                    {visual ? (
                      <span className="hb-mega-mixed-thumb" aria-hidden>
                        <MegaMenuVisualImage src={child.imageUrl} alt="" />
                      </span>
                    ) : (
                      <NavGlyphOrImage icon={child.icon} imageUrl={child.imageUrl} />
                    )}
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
