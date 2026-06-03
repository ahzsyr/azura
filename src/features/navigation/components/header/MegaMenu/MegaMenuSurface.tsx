"use client";

import { useEffect, useState } from "react";
import type { MegaMenuTabConfig, MenuItem, MenuItemType, MenuLayoutType } from "@/features/navigation/types";
import { getItemHref } from "@/features/navigation/resolve-href";
import { cn } from "@/lib/utils";

interface Props {
  item: MenuItem;
  menuType: MenuLayoutType;
  localeCode: string;
  isOpen?: boolean;
}

function flyoutRootClass(base: string, isOpen?: boolean) {
  return cn(base, isOpen && "is-open");
}

type ChildRow = {
  id: string;
  label: string;
  icon?: string;
  href: string;
  type: MenuItemType;
  imageUrl?: string;
};

function NavGlyph({ icon }: { icon?: string }) {
  if (!icon?.trim()) return null;
  return <i className={`fas ${icon.trim()}`} aria-hidden />;
}

function isVisualCardThumbnail(c: ChildRow): boolean {
  if (!c.imageUrl?.trim()) return false;
  return c.type === "collection" || c.type === "product" || c.type === "image";
}

function buildChildRows(item: MenuItem, localeCode: string): ChildRow[] {
  if (!item.children?.length) return [];
  return item.children.map((c) => ({
    id: c.id,
    label: c.label,
    icon: c.icon,
    href: getItemHref(c, localeCode),
    type: c.type,
    imageUrl: c.imageUrl,
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
}: {
  child: ChildRow;
  cardClass: string;
  desc: string | null;
}) {
  const visual = isVisualCardThumbnail(child);

  if (visual) {
    return (
      <a
        href={child.href}
        className={`${cardClass} hb-mega-card-link hb-mega-card hb-mega-card--visual`.trim()}
      >
        <div className="hb-mega-card__media">
          <img src={child.imageUrl} alt="" decoding="async" data-skip-img-fade="" />
          <div className="hb-mega-card__scrim" aria-hidden="true" />
          <div className="hb-mega-card__caption">
            <h4>{child.label}</h4>
            {desc ? <p>{desc}</p> : null}
          </div>
        </div>
      </a>
    );
  }

  return (
    <a href={child.href} className={`${cardClass} hb-mega-card-link hb-mega-card--text`.trim()}>
      <NavGlyph icon={child.icon} />
      <h4>{child.label}</h4>
      {desc ? <p>{desc}</p> : null}
    </a>
  );
}

export function MegaMenuSurface({ item, menuType, localeCode, isOpen }: Props) {
  const rows = buildChildRows(item, localeCode);
  const mega = item.megaMenu;
  const [activeTabIdx, setActiveTabIdx] = useState(0);

  useEffect(() => {
    setActiveTabIdx(0);
  }, [item.id]);

  if (rows.length === 0) return null;

  const gridCols = mega?.gridColumns ?? 3;
  const columnCount = mega?.columnCount ?? 3;
  const tabsConfig = mega?.tabs?.filter((t) => t.label.trim() || t.childIds.length);
  const tabRows =
    menuType === "tabbed" && tabsConfig?.length
      ? rowsForTabIndex(activeTabIdx, tabsConfig, rows)
      : rows;

  const cardDescription = (childId: string) => {
    const d = mega?.childDescriptions?.[childId];
    return d?.trim() ? d.trim() : null;
  };

  if (menuType === "dropdown") {
    const hideIcons = mega?.dropdownShowIcons === false;
    return (
      <div className={flyoutRootClass("dropdown-menu", isOpen)} data-mega-menu="dropdown">
        {rows.map((child) => {
          const visual = isVisualCardThumbnail(child);
          return (
            <a key={child.id} href={child.href} className={visual ? "hb-mega-dropdown-row--visual" : undefined}>
              {visual ? (
                <span className="hb-mega-dropdown-thumb" aria-hidden>
                  <img src={child.imageUrl} alt="" width={40} height={40} decoding="async" />
                </span>
              ) : !hideIcons ? (
                <NavGlyph icon={child.icon} />
              ) : null}
              <span className="hb-mega-dropdown-label">{child.label}</span>
            </a>
          );
        })}
      </div>
    );
  }

  if (menuType === "columns") {
    return (
      <div className={flyoutRootClass("mega-menu", isOpen)} data-mega-menu="columns">
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
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (menuType === "mixed") {
    const left = mega?.mixed?.left;
    const right = mega?.mixed?.right;
    return (
      <div className={flyoutRootClass("mega-menu", isOpen)} data-mega-menu="mixed">
        <div className="mega-inner">
          <div className="mixed-grid">
            <div className="feature-panel">
              {left?.icon?.trim() ? <i className={`fas ${left.icon.trim()}`} aria-hidden /> : null}
              <h4>{left?.title?.trim() || item.label}</h4>
              {left?.body?.trim() ? <p>{left.body.trim()}</p> : null}
            </div>
            <div className="mixed-links">
              {rows.map((child) => {
                const visual = isVisualCardThumbnail(child);
                return (
                  <a
                    key={child.id}
                    href={child.href}
                    className={visual ? "hb-mega-mixed-link hb-mega-mixed-link--visual" : undefined}
                  >
                    {visual ? (
                      <span className="hb-mega-mixed-thumb" aria-hidden>
                        <img src={child.imageUrl} alt="" width={48} height={48} decoding="async" />
                      </span>
                    ) : (
                      <NavGlyph icon={child.icon} />
                    )}
                    <span>{child.label}</span>
                  </a>
                );
              })}
            </div>
            <div className="feature-panel">
              {right?.icon?.trim() ? <i className={`fas ${right.icon.trim()}`} aria-hidden /> : null}
              <h4>{right?.title?.trim() || "Special"}</h4>
              {right?.body?.trim() ? <p>{right.body.trim()}</p> : null}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (menuType === "tabbed") {
    const hasCustomTabs = !!tabsConfig?.length;
    const displayRows = hasCustomTabs ? tabRows : rows;

    return (
      <div className={flyoutRootClass("mega-menu", isOpen)} data-mega-menu="tabbed">
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
            className="collections-grid"
            style={{
              gridTemplateColumns: `repeat(${gridCols}, minmax(min(100%, 200px), 1fr))`,
            }}
          >
            {displayRows.map((child) => (
              <MegaMenuRowLink
                key={child.id}
                child={child}
                cardClass="collection-card"
                desc={cardDescription(child.id)}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={flyoutRootClass("mega-menu", isOpen)} data-mega-menu="grid">
      <div className="mega-inner">
        <div
          className="collections-grid"
          style={{
            gridTemplateColumns: `repeat(${gridCols}, minmax(min(100%, 200px), 1fr))`,
          }}
        >
          {tabRows.map((child) => (
            <MegaMenuRowLink
              key={child.id}
              child={child}
              cardClass="collection-card"
              desc={cardDescription(child.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
