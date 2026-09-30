"use client";

import { useId, useState, type ReactNode } from "react";

export type ProductSectionAccordionItem = {
  id: string;
  title: string;
  content: ReactNode;
};

type Props = {
  items: ProductSectionAccordionItem[];
  /** Open this item on first render. Use -1 to start fully collapsed. */
  defaultOpenIndex?: number;
};

export function ProductSectionAccordion({ items, defaultOpenIndex = 0 }: Props) {
  const reactId = useId();
  const initial =
    defaultOpenIndex >= 0 && defaultOpenIndex < items.length ? defaultOpenIndex : -1;
  const [openIndex, setOpenIndex] = useState(initial);

  return (
    <div className="prd-specs">
      {items.map((item, idx) => {
        const isOpen = openIndex === idx;
        const panelId = `${reactId}-panel-${idx}`;
        const headerId = `${reactId}-header-${idx}`;
        return (
          <div key={item.id} className={`prd-specs__group${isOpen ? " is-open" : ""}`}>
            <button
              type="button"
              id={headerId}
              className="prd-specs__summary"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpenIndex(isOpen ? -1 : idx)}
            >
              <span className="prd-specs__summary-label">{item.title}</span>
              <span className="prd-specs__chevron" aria-hidden="true">
                ▼
              </span>
            </button>
            <div
              id={panelId}
              role="region"
              aria-labelledby={headerId}
              className="prd-specs__body"
              inert={!isOpen || undefined}
              aria-hidden={!isOpen}
            >
              <div className="prd-specs__body-inner">{item.content}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
