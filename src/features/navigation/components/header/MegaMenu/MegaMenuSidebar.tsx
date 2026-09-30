"use client";

import type { KeyboardEvent } from "react";
import type { MegaMenuNavViewModel } from "@/features/navigation/mega-menu-resolver";
import { cn } from "@/lib/utils";
import { NavGlyph } from "./mega-menu-media";

type Props = {
  items: MegaMenuNavViewModel[];
  activePanelId: string | null;
  onSelectPanel: (panelId: string) => void;
};

export function MegaMenuSidebar({ items, activePanelId, onSelectPanel }: Props) {
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!items.length) return;
    const idx = Math.max(
      0,
      items.findIndex((i) => i.panelId === activePanelId),
    );
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = items[(idx + 1) % items.length];
      onSelectPanel(next.panelId);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = items[(idx - 1 + items.length) % items.length];
      onSelectPanel(next.panelId);
    } else if (e.key === "Home") {
      e.preventDefault();
      onSelectPanel(items[0].panelId);
    } else if (e.key === "End") {
      e.preventDefault();
      onSelectPanel(items[items.length - 1].panelId);
    }
  };

  return (
    <nav
      className="hb-mega-v2-sidebar"
      aria-label="Mega menu sections"
      onKeyDown={onKeyDown}
    >
      <div className="hb-mega-v2-sidebar__list" role="tablist" aria-orientation="vertical">
        {items.map((item) => {
          const active = item.panelId === activePanelId;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              className={cn("hb-mega-v2-sidebar__item", active && "is-active")}
              onMouseEnter={() => onSelectPanel(item.panelId)}
              onFocus={() => onSelectPanel(item.panelId)}
              onClick={() => onSelectPanel(item.panelId)}
            >
              {item.icon ? <NavGlyph icon={item.icon} /> : null}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
