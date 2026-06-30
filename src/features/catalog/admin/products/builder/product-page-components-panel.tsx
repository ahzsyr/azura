"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { ProductPageBuilderStudio } from "./use-product-page-builder-studio";
import {
  BUILDER_BLOCK_CATEGORIES,
  PRODUCT_PAGE_BUILDER_BLOCKS,
  isDisplayKey,
  type BuilderBlockId,
} from "./product-page-block-registry";
import { cn } from "@/lib/utils";

export function ProductPageComponentsPanel({ studio }: { studio: ProductPageBuilderStudio }) {
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PRODUCT_PAGE_BUILDER_BLOCKS;
    return PRODUCT_PAGE_BUILDER_BLOCKS.filter(
      (block) =>
        block.label.toLowerCase().includes(q) ||
        block.description?.toLowerCase().includes(q) ||
        block.category.includes(q),
    );
  }, [query]);

  const isEnabled = (id: BuilderBlockId) => {
    if (!isDisplayKey(id)) return false;
    return studio.activeElementsLayer.display[id]?.enabled !== false;
  };

  return (
    <aside className="ppb-panel ppb-panel--left">
      <header className="ppb-panel__head">
        <h3 className="ppb-panel__title">Components</h3>
        <div className="ppb-search">
          <Search className="ppb-search__icon h-4 w-4" />
          <input
            type="search"
            className="ppb-search__input"
            placeholder="Search blocks…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </header>

      <div className="ppb-panel__body">
        {BUILDER_BLOCK_CATEGORIES.map((category) => {
          const blocks = filtered.filter((b) => b.category === category.id);
          if (!blocks.length) return null;
          const isCollapsed = collapsed[category.id] ?? false;
          return (
            <section key={category.id} className="ppb-palette-category">
              <button
                type="button"
                className="ppb-palette-category__toggle"
                onClick={() =>
                  setCollapsed((prev) => ({ ...prev, [category.id]: !isCollapsed }))
                }
              >
                <span>{category.label}</span>
                <span aria-hidden>{isCollapsed ? "+" : "−"}</span>
              </button>
              {!isCollapsed ? (
                <ul className="ppb-palette-list">
                  {blocks.map((block) => {
                    const Icon = block.icon;
                    const enabled = isDisplayKey(block.id) ? isEnabled(block.id) : false;
                    return (
                      <li key={block.id}>
                        <div
                          className={cn(
                            "ppb-palette-item",
                            studio.selectedBlockId === block.id && "is-selected",
                            block.comingSoon && "is-disabled",
                          )}
                        >
                          <button
                            type="button"
                            className="ppb-palette-item__main"
                            disabled={block.comingSoon}
                            onClick={() => {
                              if (!block.comingSoon) studio.setSelectedBlockId(block.id);
                            }}
                          >
                            <Icon className="ppb-palette-item__icon h-4 w-4" />
                            <span className="ppb-palette-item__label">{block.label}</span>
                            {block.comingSoon ? (
                              <span className="ppb-palette-item__badge">Soon</span>
                            ) : null}
                          </button>
                          {isDisplayKey(block.id) && !block.comingSoon ? (
                            <button
                              type="button"
                              className={cn("ppb-palette-item__switch", enabled && "is-on")}
                              aria-label={enabled ? `Disable ${block.label}` : `Enable ${block.label}`}
                              onClick={() => studio.toggleBlockVisibility(block.id, !enabled)}
                            />
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </section>
          );
        })}
      </div>
    </aside>
  );
}
